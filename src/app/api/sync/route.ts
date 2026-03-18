/**
 * Redis 数据同步 API 路由
 *
 * POST /api/sync - 创建同步任务（push/pull/sync）并入队
 * GET  /api/sync - 查询同步任务状态，若任务未完成则触发队列处理
 *
 * 工作流程：
 * 1. 客户端 POST 创建同步任务 → 返回 jobId（HTTP 202）
 * 2. 客户端轮询 GET ?jobId=xxx → 服务端处理队列并返回结果
 *
 * Redis 配置优先级：环境变量 > 客户端传入的配置
 */

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  createSyncJob,
  enqueueSyncJob,
  fetchSyncJob,
  processSyncQueue,
  type RedisConfig,
  type SyncJobRecord,
} from '@/lib/syncQueue';

/** 去除首尾空白 */
const normalizeString = (value?: string) => (value || '').trim();

/** 默认同步命名空间（未指定时使用） */
const DEFAULT_SYNC_NAMESPACE = 'recall-default';

/** 将命名空间编码为 Base64 作为 Redis 中的 syncKey */
const buildSyncKey = (namespace: string) => Buffer.from(namespace).toString('base64');

const SYNC_ERROR = {
  INVALID_JSON: 'SYNC_INVALID_JSON',
  INVALID_ACTION: 'SYNC_INVALID_ACTION',
  REDIS_CONFIG_MISSING: 'SYNC_REDIS_CONFIG_MISSING',
  JOB_ID_REQUIRED: 'SYNC_JOB_ID_REQUIRED',
  JOB_NOT_FOUND: 'SYNC_JOB_NOT_FOUND',
  INTERNAL_ERROR: 'SYNC_INTERNAL_ERROR',
  QUEUE_PROCESS_ERROR: 'SYNC_QUEUE_PROCESS_ERROR',
} as const;

const syncLog = (
  level: 'info' | 'warn' | 'error',
  event: string,
  requestId: string,
  extra?: Record<string, unknown>,
) => {
  const payload = {
    scope: 'sync-api',
    event,
    requestId,
    ...extra,
  };

  if (level === 'error') {
    console.error(payload);
    return;
  }
  if (level === 'warn') {
    console.warn(payload);
    return;
  }
  console.log(payload);
};

const buildErrorResponse = (
  requestId: string,
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
) =>
  NextResponse.json(
    {
      ok: false,
      code,
      error: message,
      message,
      requestId,
      ...(details ? { details } : {}),
    },
    { status },
  );

/**
 * 解析 Redis 连接配置
 * 优先使用环境变量，回退到客户端传入的配置
 */
const resolveRedisConfig = (fallback?: RedisConfig, options?: { allowClientFallback?: boolean }) => {
  const allowClientFallback = options?.allowClientFallback ?? false;
  const host = process.env.REDIS_HOST || (allowClientFallback ? fallback?.host : undefined);
  if (!host) return null;
  return {
    host,
    port: Number(process.env.REDIS_PORT || (allowClientFallback ? fallback?.port : undefined) || 6379),
    password: process.env.REDIS_PASSWORD || (allowClientFallback ? fallback?.password : undefined) || undefined,
    db: Number(process.env.REDIS_DB || (allowClientFallback ? fallback?.db : undefined) || 0),
  };
};

/**
 * POST /api/sync
 * 创建同步任务并入队，立即返回 jobId（异步处理模式）
 * 请求体：{ action: 'push'|'pull'|'sync', namespace?: string, payload?: any, redisConfig?: RedisConfig }
 */
export async function POST(request: NextRequest) {
  const requestId = randomUUID();

  try {
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      syncLog('warn', 'invalid-json', requestId);
      return buildErrorResponse(
        requestId,
        SYNC_ERROR.INVALID_JSON,
        'Invalid JSON body',
        400,
      );
    }

    const { action, namespace, payload, redisConfig } = body;

    if (!['push', 'pull', 'sync'].includes(action)) {
      return buildErrorResponse(
        requestId,
        SYNC_ERROR.INVALID_ACTION,
        'Unknown action',
        400,
        { action },
      );
    }

    const normalizedNamespace = normalizeString(namespace) || DEFAULT_SYNC_NAMESPACE;

    const resolvedRedis = resolveRedisConfig(redisConfig, { allowClientFallback: true });
    if (!resolvedRedis) {
      return buildErrorResponse(
        requestId,
        SYNC_ERROR.REDIS_CONFIG_MISSING,
        'Redis config missing. Set REDIS_HOST/PORT/DB/PASSWORD in server env. Client-side Redis params are only accepted on POST enqueue.',
        400,
      );
    }

    const syncKey = buildSyncKey(normalizedNamespace);
    const job: SyncJobRecord = createSyncJob(action, syncKey, payload ?? null);

    await enqueueSyncJob(resolvedRedis, job);

    syncLog('info', 'job-enqueued', requestId, {
      action,
      jobId: job.id,
      namespace: normalizedNamespace,
      syncKey,
    });

    // 异步队列模式：仅入队，处理由轮询 GET 触发，避免多端并发时抢占
    return NextResponse.json(
      { ok: true, requestId, jobId: job.id, status: job.status },
      { status: 202 },
    );
  } catch (error) {
    syncLog('error', 'post-failed', requestId, {
      error: String((error as Error)?.message || error),
    });
    return buildErrorResponse(requestId, SYNC_ERROR.INTERNAL_ERROR, 'Internal Server Error', 500);
  }
}

/**
 * GET /api/sync?jobId=xxx
 * 查询同步任务状态
 * 若任务仍为 pending/processing，会主动触发队列处理（适配 Serverless 环境）
 */
export async function GET(request: NextRequest) {
  const requestId = randomUUID();

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return buildErrorResponse(requestId, SYNC_ERROR.JOB_ID_REQUIRED, 'jobId is required', 400);
    }

    const resolvedRedis = resolveRedisConfig(undefined, { allowClientFallback: false });

    if (!resolvedRedis) {
      return buildErrorResponse(
        requestId,
        SYNC_ERROR.REDIS_CONFIG_MISSING,
        'Redis config missing. Set REDIS_HOST/PORT/DB/PASSWORD in server env for sync polling.',
        400,
      );
    }

    const job = await fetchSyncJob(resolvedRedis, jobId);
    if (!job) {
      return buildErrorResponse(requestId, SYNC_ERROR.JOB_NOT_FOUND, 'Job not found', 404, { jobId });
    }

    if (job.status === 'pending' || job.status === 'processing') {
      // 在 Serverless 环境中必须 await 执行，否则进程冻结会导致任务挂起
      try {
        await processSyncQueue(job.syncKey, resolvedRedis);
        // 重新获取最新状态
        const updatedJob = await fetchSyncJob(resolvedRedis, jobId);
        if (updatedJob) {
          return NextResponse.json({
            ok: true,
            requestId,
            status: updatedJob.status,
            result: updatedJob.result,
            error: updatedJob.error,
          });
        }
      } catch (error) {
        syncLog('error', 'queue-process-failed', requestId, {
          code: SYNC_ERROR.QUEUE_PROCESS_ERROR,
          jobId,
          syncKey: job.syncKey,
          error: String((error as Error)?.message || error),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      requestId,
      status: job.status,
      result: job.result,
      error: job.error,
    });
  } catch (error) {
    syncLog('error', 'get-failed', requestId, {
      error: String((error as Error)?.message || error),
    });
    return buildErrorResponse(requestId, SYNC_ERROR.INTERNAL_ERROR, 'Internal Server Error', 500);
  }
}
