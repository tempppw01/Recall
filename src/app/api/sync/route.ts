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
const buildSyncKey = (namespace: string) =>
  Buffer.from(namespace).toString('base64');

/**
 * 解析 Redis 连接配置
 * 优先使用环境变量，回退到客户端传入的配置
 */
const resolveRedisConfig = (fallback?: RedisConfig) => {
  const host = process.env.REDIS_HOST || fallback?.host;
  if (!host) return null;
  return {
    host,
    port: Number(process.env.REDIS_PORT || fallback?.port || 6379),
    password: process.env.REDIS_PASSWORD || fallback?.password || undefined,
    db: Number(process.env.REDIS_DB || fallback?.db || 0),
  };
};

/**
 * POST /api/sync
 * 创建同步任务并入队，立即返回 jobId（异步处理模式）
 * 请求体：{ action: 'push'|'pull'|'sync', namespace?: string, payload?: any, redisConfig?: RedisConfig }
 */
export async function POST(request: NextRequest) {
  try {
    const { action, namespace, payload, redisConfig } = await request.json();

    if (!['push', 'pull', 'sync'].includes(action)) {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const normalizedNamespace = normalizeString(namespace) || DEFAULT_SYNC_NAMESPACE;

    const resolvedRedis = resolveRedisConfig(redisConfig);
    if (!resolvedRedis) {
      return NextResponse.json(
        { error: 'Redis config missing. Set REDIS_HOST/PORT/DB/PASSWORD in server env.' },
        { status: 400 },
      );
    }

    const syncKey = buildSyncKey(normalizedNamespace);
    const job: SyncJobRecord = createSyncJob(action, syncKey, payload ?? null);

    await enqueueSyncJob(resolvedRedis, job);

    // 异步队列模式：仅入队，处理由轮询 GET 触发，避免多端并发时抢占
    return NextResponse.json({ ok: true, jobId: job.id, status: job.status }, { status: 202 });
  } catch (error) {
    console.error('Redis sync error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/sync?jobId=xxx
 * 查询同步任务状态
 * 若任务仍为 pending/processing，会主动触发队列处理（适配 Serverless 环境）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const redisHost = searchParams.get('redisHost') || undefined;
    const redisPort = searchParams.get('redisPort') || undefined;
    const redisDb = searchParams.get('redisDb') || undefined;
    const redisPassword = searchParams.get('redisPassword') || undefined;
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }
    const resolvedRedis = resolveRedisConfig({
      host: redisHost,
      port: redisPort,
      db: redisDb,
      password: redisPassword,
    });
    if (!resolvedRedis) {
      return NextResponse.json(
        { error: 'Redis config missing. Set REDIS_HOST/PORT/DB/PASSWORD in server env.' },
        { status: 400 },
      );
    }
    const job = await fetchSyncJob(resolvedRedis, jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
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
            status: updatedJob.status,
            result: updatedJob.result,
            error: updatedJob.error,
          });
        }
      } catch (error) {
        console.error('Redis sync queue error', error);
      }
    }
    return NextResponse.json({
      ok: true,
      status: job.status,
      result: job.result,
      error: job.error,
    });
  } catch (error) {
    console.error('Redis sync status error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
