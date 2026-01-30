import Redis from 'ioredis';
import { randomUUID } from 'crypto';

type RedisConfig = {
  host?: string;
  port?: number | string;
  password?: string;
  db?: number | string;
};

type SyncMeta = {
  lastLocalChange?: string;
};

type SyncJobPayload = {
  data?: any;
  meta?: SyncMeta | null;
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

const buildQueueKey = (syncKey: string) => `sync:${syncKey}:queue`;
const buildLockKey = (syncKey: string) => `sync:${syncKey}:lock`;
const buildJobKey = (jobId: string) => `sync:job:${jobId}`;
const buildDataKey = (syncKey: string) => `sync:data:${syncKey}`;
const buildSyncMetaKey = (syncKey: string) => `sync:meta:${syncKey}`;

const getRedis = (config: RedisConfig) =>
  new Redis({
    host: config.host!,
    port: Number(config.port) || 6379,
    password: config.password || undefined,
    db: Number(config.db) || 0,
    connectTimeout: 2000,
  });

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

const normalizeList = <T extends { id: string }>(items: any): T[] =>
  Array.isArray(items) ? items.filter((item) => item && item.id) : [];

const ensureUpdatedAt = <T extends { updatedAt?: string; createdAt?: string }>(items: T[]) =>
  items.map((item) => ({
    ...item,
    updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
  }));

const mergeById = <T extends { id: string; updatedAt?: string }>(current: T[], incoming: T[]) => {
  const merged = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => {
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, item);
      return;
    }
    const existingUpdated = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
    const incomingUpdated = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
    merged.set(item.id, incomingUpdated >= existingUpdated ? item : existing);
  });
  return Array.from(merged.values());
};

const normalizeDeletedCountdowns = (value: any): Record<string, string> => {
  if (Array.isArray(value)) {
    const now = new Date().toISOString();
    return value.reduce<Record<string, string>>((acc, id) => {
      if (typeof id === 'string') acc[id] = now;
      return acc;
    }, {});
  }
  if (value && typeof value === 'object') {
    const next: Record<string, string> = {};
    Object.entries(value as Record<string, unknown>).forEach(([id, time]) => {
      if (typeof id === 'string' && typeof time === 'string') {
        next[id] = time;
      }
    });
    return next;
  }
  return {};
};

const mergeDeletedCountdowns = (current: Record<string, string>, incoming: Record<string, string>) => {
  const next = { ...current };
  Object.entries(incoming).forEach(([id, time]) => {
    const incomingMs = new Date(time).getTime();
    const existingMs = next[id] ? new Date(next[id]).getTime() : 0;
    if (Number.isNaN(incomingMs)) return;
    if (!next[id] || incomingMs > existingMs) {
      next[id] = time;
    }
  });
  return next;
};

const filterCountdownsByDeletions = (items: any[], deletedMap: Record<string, string>) => {
  const nextDeleted = { ...deletedMap };
  const filtered = items.filter((item) => {
    const deletedAt = deletedMap[item.id];
    if (!deletedAt) return true;
    const deletedMs = new Date(deletedAt).getTime();
    const updatedMs = item.updatedAt
      ? new Date(item.updatedAt).getTime()
      : new Date(item.createdAt).getTime();
    if (updatedMs > deletedMs) {
      delete nextDeleted[item.id];
      return true;
    }
    return false;
  });
  return { filtered, nextDeleted };
};

const resolvePayloadItems = (payload: any, key: string) =>
  payload?.data?.[key] ?? payload?.[key];

const pickLatestTimestamp = (a?: string, b?: string) => {
  const aMs = a ? new Date(a).getTime() : 0;
  const bMs = b ? new Date(b).getTime() : 0;
  if (!aMs && !bMs) return undefined;
  if (bMs >= aMs) return b;
  return a;
};

const mergeSyncPayload = (
  existingPayload: any,
  incomingPayload: any,
  existingMeta?: SyncMeta | null,
  incomingMeta?: SyncMeta | null,
) => {
  const currentTasks = ensureUpdatedAt(normalizeList(resolvePayloadItems(existingPayload, 'tasks')));
  const incomingTasks = ensureUpdatedAt(normalizeList(resolvePayloadItems(incomingPayload, 'tasks')));
  const currentHabits = ensureUpdatedAt(normalizeList(resolvePayloadItems(existingPayload, 'habits')));
  const incomingHabits = ensureUpdatedAt(normalizeList(resolvePayloadItems(incomingPayload, 'habits')));
  const currentCountdowns = ensureUpdatedAt(normalizeList(resolvePayloadItems(existingPayload, 'countdowns')));
  const incomingCountdowns = ensureUpdatedAt(normalizeList(resolvePayloadItems(incomingPayload, 'countdowns')));

  const mergedTasks = mergeById(currentTasks, incomingTasks);
  const mergedHabits = mergeById(currentHabits, incomingHabits);
  const mergedCountdowns = mergeById(currentCountdowns, incomingCountdowns);

  const existingDeleted = normalizeDeletedCountdowns(
    existingPayload?.deletions?.countdowns ?? existingPayload?.deletedCountdowns,
  );
  const incomingDeleted = normalizeDeletedCountdowns(
    incomingPayload?.deletions?.countdowns ?? incomingPayload?.deletedCountdowns,
  );
  const mergedDeleted = mergeDeletedCountdowns(existingDeleted, incomingDeleted);
  const { filtered: filteredCountdowns, nextDeleted } =
    filterCountdownsByDeletions(mergedCountdowns, mergedDeleted);

  const incomingWins = Boolean(
    pickLatestTimestamp(existingMeta?.lastLocalChange, incomingMeta?.lastLocalChange) ===
      incomingMeta?.lastLocalChange,
  );
  const mergedSettings = incomingWins
    ? (incomingPayload?.settings ?? existingPayload?.settings)
    : (existingPayload?.settings ?? incomingPayload?.settings);
  const mergedSecrets = incomingWins
    ? (incomingPayload?.secrets ?? existingPayload?.secrets)
    : (existingPayload?.secrets ?? incomingPayload?.secrets);

  return {
    payload: {
      version: incomingPayload?.version ?? existingPayload?.version,
      exportedAt: new Date().toISOString(),
      data: {
        tasks: mergedTasks,
        habits: mergedHabits,
        countdowns: filteredCountdowns,
      },
      deletions: {
        countdowns: nextDeleted,
      },
      settings: mergedSettings,
      secrets: mergedSecrets,
    },
    meta: {
      lastLocalChange: pickLatestTimestamp(existingMeta?.lastLocalChange, incomingMeta?.lastLocalChange),
    },
  };
};

const executeRedisJob = async (
  redis: Redis,
  action: 'push' | 'pull' | 'sync',
  syncKey: string,
  payload?: SyncJobPayload,
) => {
  const dataKey = buildDataKey(syncKey);
  const metaKey = buildSyncMetaKey(syncKey);
  const raw = await redis.get(dataKey);
  const existing = raw ? JSON.parse(raw) : null;
  const nowIso = new Date().toISOString();
  const incomingMeta = payload?.meta ?? null;
  const rawMeta = await redis.get(metaKey);
  const existingMeta = rawMeta ? JSON.parse(rawMeta) : null;

  if (action === 'pull') {
    return { ok: true, data: existing?.payload ?? null, updatedAt: existing?.updatedAt ?? null, meta: existingMeta };
  }

  if (action === 'push') {
    const merged = mergeSyncPayload(existing?.payload ?? null, payload?.data ?? null, existingMeta, incomingMeta);
    const record = { payload: merged.payload, updatedAt: nowIso };
    await redis.set(dataKey, JSON.stringify(record));
    if (merged.meta?.lastLocalChange) {
      await redis.set(metaKey, JSON.stringify({
        lastLocalChange: merged.meta.lastLocalChange,
        updatedAt: nowIso,
      }));
    }
    return { ok: true, updatedAt: nowIso };
  }

  const merged = mergeSyncPayload(existing?.payload ?? null, payload?.data ?? null, existingMeta, incomingMeta);
  const record = { payload: merged.payload, updatedAt: nowIso };
  await redis.set(dataKey, JSON.stringify(record));
  if (merged.meta?.lastLocalChange) {
    await redis.set(metaKey, JSON.stringify({
      lastLocalChange: merged.meta.lastLocalChange,
      updatedAt: nowIso,
    }));
  }
  return { ok: true, data: merged.payload, updatedAt: nowIso, meta: merged.meta };
};

export const createSyncJob = (action: 'push' | 'pull' | 'sync', syncKey: string, payload: any) => {
  const nowIso = new Date().toISOString();
  const payloadData = payload?.data ?? payload ?? null;
  const payloadMeta = payload?.meta ?? null;
  return {
    id: randomUUID(),
    syncKey,
    action,
    status: 'pending',
    payload: {
      data: payloadData,
      meta: payloadMeta,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  } satisfies SyncJobRecord;
};

export const enqueueSyncJob = async (config: RedisConfig, job: SyncJobRecord) => {
  const redis = getRedis(config);
  await enqueueJob(redis, job);
  redis.disconnect();
};

export const fetchSyncJob = async (config: RedisConfig, jobId: string) => {
  const redis = getRedis(config);
  const job = await getJob(redis, jobId);
  redis.disconnect();
  return job;
};

export const processSyncQueue = async (syncKey: string, config: RedisConfig) => {
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
        const result = await executeRedisJob(redis, job.action, job.syncKey, job.payload);
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

export type { RedisConfig, SyncJobRecord };