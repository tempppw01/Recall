import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

const DEFAULT_WEBDAV_URL = 'https://disk.shuaihong.fun/dav';
const DEFAULT_WEBDAV_PATH = 'recall-sync.json';

const buildWebdavUrl = (baseUrl: string, path?: string) => {
  const safeBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const safePath = (path || DEFAULT_WEBDAV_PATH).replace(/^\//, '');
  return new URL(safePath, safeBase).toString();
};

const normalizeString = (value?: string) => (value || '').trim();

const buildSyncKey = (url: string, username: string, path: string) =>
  Buffer.from(`${url}|${username}|${path}`).toString('base64');

type RedisConfig = {
  host?: string;
  port?: number | string;
  password?: string;
  db?: number | string;
};

type SyncJobPayload = {
  url: string;
  username: string;
  password: string;
  path: string;
  data?: any;
};

type SyncJobRecord = {
  id: string;
  syncKey: string;
  action: 'push' | 'pull' | 'sync';
  status: 'pending' | 'processing' | 'done' | 'failed';
  payload: SyncJobPayload;
  result?: any;
  error?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
};

const JOB_TTL_SEC = 60 * 60 * 24;
const LOCK_TTL_MS = 120_000;

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

const getRedis = (config: RedisConfig) =>
  new Redis({
    host: config.host!,
    port: Number(config.port) || 6379,
    password: config.password || undefined,
    db: Number(config.db) || 0,
    connectTimeout: 2000,
  });

const buildQueueKey = (syncKey: string) => `sync:${syncKey}:queue`;
const buildLockKey = (syncKey: string) => `sync:${syncKey}:lock`;
const buildJobKey = (jobId: string) => `sync:job:${jobId}`;

const saveJob = async (redis: Redis, job: SyncJobRecord) => {
  await redis.set(buildJobKey(job.id), JSON.stringify(job), 'EX', JOB_TTL_SEC);
};

const getJob = async (redis: Redis, jobId: string): Promise<SyncJobRecord | null> => {
  const raw = await redis.get(buildJobKey(jobId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SyncJobRecord;
  } catch (error) {
    return null;
  }
};

const enqueueJob = async (redis: Redis, job: SyncJobRecord) => {
  const multi = redis.multi();
  multi.set(buildJobKey(job.id), JSON.stringify(job), 'EX', JOB_TTL_SEC);
  multi.rpush(buildQueueKey(job.syncKey), job.id);
  await multi.exec();
};

const acquireLock = async (redis: Redis, syncKey: string, lockValue: string) => {
  const result = await redis.set(buildLockKey(syncKey), lockValue, 'NX', 'PX', LOCK_TTL_MS);
  return result === 'OK';
};

const refreshLock = async (redis: Redis, syncKey: string) => {
  await redis.pexpire(buildLockKey(syncKey), LOCK_TTL_MS);
};

const releaseLock = async (redis: Redis, syncKey: string, lockValue: string) => {
  const script = `
    if redis.call('get', KEYS[1]) == ARGV[1] then
      return redis.call('del', KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(script, 1, buildLockKey(syncKey), lockValue);
};

const processQueue = async (syncKey: string, config: RedisConfig) => {
  const redis = getRedis(config);
  const lockValue = randomUUID();
  const acquired = await acquireLock(redis, syncKey, lockValue);
  if (!acquired) {
    redis.disconnect();
    return;
  }

  try {
    while (true) {
      await refreshLock(redis, syncKey);
      const jobId = await redis.lpop(buildQueueKey(syncKey));
      if (!jobId) break;
      const job = await getJob(redis, jobId);
      if (!job) continue;

      const nowIso = new Date().toISOString();
      job.status = 'processing';
      job.updatedAt = nowIso;
      await saveJob(redis, job);

      try {
        const result = await executeWebdavJob(job.action, job.payload);
        job.status = 'done';
        job.result = result;
        job.processedAt = new Date().toISOString();
        job.updatedAt = job.processedAt;
        await saveJob(redis, job);
      } catch (error) {
        job.status = 'failed';
        job.error = String((error as Error)?.message || error);
        job.processedAt = new Date().toISOString();
        job.updatedAt = job.processedAt;
        await saveJob(redis, job);
      }
    }
  } finally {
    await releaseLock(redis, syncKey, lockValue);
    redis.disconnect();
  }
};

const executeWebdavJob = async (
  action: 'push' | 'pull' | 'sync',
  payload: { url: string; username: string; password: string; path: string; data?: any },
) => {
  const baseUrl = normalizeString(payload.url || DEFAULT_WEBDAV_URL);
  const user = normalizeString(payload.username);
  const pass = normalizeString(payload.password);
  const resolvedPath = normalizeString(payload.path || DEFAULT_WEBDAV_PATH);

  if (!baseUrl) throw new Error('WebDAV URL is required');
  if (!user || !pass) throw new Error('WebDAV credentials are required');

  const targetUrl = buildWebdavUrl(baseUrl, resolvedPath);
  const authHeader = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

  const executeRequest = async (requestAction: 'push' | 'pull') => {
    if (requestAction === 'push') {
      const res = await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload.data ?? {}),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'WebDAV push failed');
      }
      return { ok: true };
    }

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: { Authorization: authHeader },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'WebDAV pull failed');
    }
    const data = await res.json();
    return { ok: true, data };
  };

  if (action === 'push') {
    return executeRequest('push');
  }

  if (action === 'pull') {
    return executeRequest('pull');
  }

  const pullResult = await executeRequest('pull');
  await executeRequest('push');
  return { ok: true, data: (pullResult as any).data };
};

export async function POST(request: NextRequest) {
  try {
    const { action, url, username, password, path, payload, redisConfig } = await request.json();

    if (!['push', 'pull', 'sync'].includes(action)) {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const baseUrl = normalizeString(url || DEFAULT_WEBDAV_URL);
    const user = normalizeString(username);
    const resolvedPath = normalizeString(path || DEFAULT_WEBDAV_PATH);

    if (!baseUrl) {
      return NextResponse.json({ error: 'WebDAV URL is required' }, { status: 400 });
    }
    if (!user || !normalizeString(password)) {
      return NextResponse.json({ error: 'WebDAV credentials are required' }, { status: 400 });
    }

    const resolvedRedis = resolveRedisConfig(redisConfig);
    if (!resolvedRedis) {
      return NextResponse.json(
        { error: 'Redis config missing. Set REDIS_HOST/PORT/DB/PASSWORD in server env.' },
        { status: 400 },
      );
    }

    const syncKey = buildSyncKey(baseUrl, user, resolvedPath);
    const jobId = randomUUID();
    const nowIso = new Date().toISOString();
    const job: SyncJobRecord = {
      id: jobId,
      syncKey,
      action,
      status: 'pending',
      payload: {
        url: baseUrl,
        username: user,
        password,
        path: resolvedPath,
        data: payload ?? null,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const redis = getRedis(resolvedRedis);
    await enqueueJob(redis, job);
    redis.disconnect();

    processQueue(syncKey, resolvedRedis).catch((error) => {
      console.error('WebDAV sync queue error', error);
    });

    return NextResponse.json({ ok: true, jobId, status: job.status });
  } catch (error) {
    console.error('WebDAV sync error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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
    const redis = getRedis(resolvedRedis);
    const job = await getJob(redis, jobId);
    redis.disconnect();
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.status === 'pending' || job.status === 'processing') {
      processQueue(job.syncKey, resolvedRedis).catch((error) => {
        console.error('WebDAV sync queue error', error);
      });
    }
    return NextResponse.json({
      ok: true,
      status: job.status,
      result: job.result,
      error: job.error,
    });
  } catch (error) {
    console.error('WebDAV sync status error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
