/**
 * Redis 同步队列模块
 *
 * 实现基于 Redis 的分布式数据同步机制，支持 push（上传）、pull（拉取）、sync（双向合并）三种操作。
 * 核心流程：客户端创建同步任务 → 入队 → 后台消费者加锁处理 → 合并数据 → 写回 Redis。
 *
 * 数据合并策略：
 * - tasks / habits / countdowns 按 id + updatedAt 进行 last-write-wins 合并
 * - 已删除的 countdowns 通过 deletions map（id → 删除时间）进行软删除追踪
 * - settings / secrets 根据 lastLocalChange 时间戳决定哪一方优先
 */

import Redis from 'ioredis';
import { randomUUID } from 'crypto';

// ─── 类型定义 ───────────────────────────────────────────────

/** Redis 连接配置 */
type RedisConfig = {
  host?: string;
  port?: number | string;
  password?: string;
  db?: number | string;
};

/** 同步元数据，记录最后一次本地变更时间 */
type SyncMeta = {
  lastLocalChange?: string;
};

/** 同步任务的载荷 */
type SyncJobPayload = {
  data?: any;
  meta?: SyncMeta | null;
};

/** 同步任务记录，存储在 Redis 中 */
type SyncJobRecord = {
  id: string;
  /** 同步键，标识一组需要同步的数据（通常对应一个用户） */
  syncKey: string;
  /** 操作类型：push=上传, pull=拉取, sync=双向合并 */
  action: 'push' | 'pull' | 'sync';
  /** 任务状态 */
  status: 'pending' | 'processing' | 'done' | 'failed';
  payload: SyncJobPayload;
  /** 处理结果 */
  result?: any;
  /** 失败时的错误信息 */
  error?: string;
  /** 处理完成时间 */
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
};

// ─── 常量与 Redis Key 构建 ──────────────────────────────────

/** 任务记录在 Redis 中的过期时间（24 小时） */
const JOB_TTL_SEC = 60 * 60 * 24;

/** 分布式锁的过期时间（2 分钟），防止死锁 */
const LOCK_TTL_MS = 120_000;

/** 同步队列 Key（List 类型，存储 jobId） */
const buildQueueKey = (syncKey: string) => `sync:${syncKey}:queue`;

/** 分布式锁 Key */
const buildLockKey = (syncKey: string) => `sync:${syncKey}:lock`;

/** 单个任务记录 Key */
const buildJobKey = (jobId: string) => `sync:job:${jobId}`;

/** 同步数据存储 Key（保存合并后的完整数据快照） */
const buildDataKey = (syncKey: string) => `sync:data:${syncKey}`;

/** 同步元数据 Key（保存 lastLocalChange 等信息） */
const buildSyncMetaKey = (syncKey: string) => `sync:meta:${syncKey}`;

// ─── Redis 连接 ─────────────────────────────────────────────

/**
 * 创建 Redis 客户端实例
 * 连接超时 10s，自动重试（指数退避，最大 2s）
 */
const getRedis = (config: RedisConfig) =>
  new Redis({
    host: config.host!,
    port: Number(config.port) || 6379,
    password: config.password || undefined,
    db: Number(config.db) || 0,
    connectTimeout: 10000,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });

// ─── 任务持久化 ─────────────────────────────────────────────

/** 保存任务记录到 Redis（带 TTL） */
const saveJob = async (redis: Redis, job: SyncJobRecord) => {
  await redis.set(buildJobKey(job.id), JSON.stringify(job), 'EX', JOB_TTL_SEC);
};

/** 从 Redis 读取任务记录 */
const getJob = async (redis: Redis, jobId: string): Promise<SyncJobRecord | null> => {
  const raw = await redis.get(buildJobKey(jobId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SyncJobRecord;
  } catch (error) {
    return null;
  }
};

/**
 * 将任务入队：原子性地保存任务记录并追加到队列尾部
 * 使用 Redis MULTI 事务保证一致性
 */
const enqueueJob = async (redis: Redis, job: SyncJobRecord) => {
  const multi = redis.multi();
  multi.set(buildJobKey(job.id), JSON.stringify(job), 'EX', JOB_TTL_SEC);
  multi.rpush(buildQueueKey(job.syncKey), job.id);
  await multi.exec();
};

// ─── 分布式锁 ───────────────────────────────────────────────

/**
 * 尝试获取分布式锁（SET NX PX 实现）
 * @returns true 表示获取成功
 */
const acquireLock = async (redis: Redis, syncKey: string, lockValue: string) => {
  const result = await (redis as any).set(buildLockKey(syncKey), lockValue, 'PX', LOCK_TTL_MS, 'NX');
  return result === 'OK';
};

/** 刷新锁的过期时间（防止长任务处理期间锁过期） */
const refreshLock = async (redis: Redis, syncKey: string) => {
  await redis.pexpire(buildLockKey(syncKey), LOCK_TTL_MS);
};

/**
 * 释放分布式锁
 * 使用 Lua 脚本保证"只有持有者才能释放"的原子性
 */
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

// ─── 数据合并工具函数 ──────────────────────────────────────

/** 将输入规范化为带 id 的数组，过滤无效项 */
const normalizeList = <T extends { id: string }>(items: any): T[] =>
  Array.isArray(items) ? items.filter((item) => item && item.id) : [];

/** 确保每个元素都有 updatedAt 字段（回退到 createdAt 或当前时间） */
const ensureUpdatedAt = <T extends { id: string; updatedAt?: string; createdAt?: string }>(items: T[]) =>
  items.map((item) => ({
    ...item,
    updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
  }));

/**
 * 按 id 合并两个列表，冲突时以 updatedAt 较新者为准（last-write-wins）
 */
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

/**
 * 将已删除数据规范化为 { id: 删除时间 } 的 Record
 * 兼容旧格式（数组）和新格式（对象）
 */
const normalizeDeletedMap = (value: any): Record<string, string> => {
  // 旧格式：string[] → 转为 Record，删除时间统一设为当前时间
  if (Array.isArray(value)) {
    const now = new Date().toISOString();
    return value.reduce<Record<string, string>>((acc, id) => {
      if (typeof id === 'string') acc[id] = now;
      return acc;
    }, {});
  }
  // 新格式：Record<string, string>
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

/**
 * 合并两份已删除 countdowns 记录
 * 同一 id 取较晚的删除时间
 */
const mergeDeletedMap = (current: Record<string, string>, incoming: Record<string, string>) => {
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

/**
 * 根据删除记录过滤 countdowns 列表
 * 如果某个 countdown 的 updatedAt 晚于其删除时间，则视为"重新创建"，保留该项
 */
const filterByDeletions = (items: any[], deletedMap: Record<string, string>) => {
  const nextDeleted = { ...deletedMap };
  const filtered = items.filter((item) => {
    const deletedAt = deletedMap[item.id];
    if (!deletedAt) return true;
    const deletedMs = new Date(deletedAt).getTime();
    const updatedMs = item.updatedAt
      ? new Date(item.updatedAt).getTime()
      : new Date(item.createdAt).getTime();
    // 如果更新时间晚于删除时间，说明是删除后重新创建的，保留并移除删除标记
    if (updatedMs > deletedMs) {
      delete nextDeleted[item.id];
      return true;
    }
    return false;
  });
  return { filtered, nextDeleted };
};

/** 从嵌套的 payload 结构中提取指定 key 的数据 */
const resolvePayloadItems = (payload: any, key: string) =>
  payload?.data?.[key] ?? payload?.[key];

/** 比较两个时间戳，返回较晚的那个 */
const pickLatestTimestamp = (a?: string, b?: string) => {
  const aMs = a ? new Date(a).getTime() : 0;
  const bMs = b ? new Date(b).getTime() : 0;
  if (!aMs && !bMs) return undefined;
  if (bMs >= aMs) return b;
  return a;
};

// ─── 核心合并逻辑 ───────────────────────────────────────────

/**
 * 合并两份同步数据的完整载荷
 *
 * 合并策略：
 * - tasks / habits / countdowns：按 id + updatedAt 做 last-write-wins 合并
 * - deletions.tasks / countdowns：合并删除记录，并过滤已删除项
 * - settings / secrets：根据 lastLocalChange 时间戳决定哪一方的配置优先
 *
 * @param existingPayload - Redis 中已有的数据
 * @param incomingPayload - 客户端新推送的数据
 * @param existingMeta - Redis 中已有的元数据
 * @param incomingMeta - 客户端新推送的元数据
 * @returns 合并后的 payload 和 meta
 */
const mergeSyncPayload = (
  existingPayload: any,
  incomingPayload: any,
  existingMeta?: SyncMeta | null,
  incomingMeta?: SyncMeta | null,
) => {
  // 规范化并合并三类列表数据
  const currentTasks = ensureUpdatedAt(normalizeList(resolvePayloadItems(existingPayload, 'tasks')));
  const incomingTasks = ensureUpdatedAt(normalizeList(resolvePayloadItems(incomingPayload, 'tasks')));
  const currentHabits = ensureUpdatedAt(normalizeList(resolvePayloadItems(existingPayload, 'habits')));
  const incomingHabits = ensureUpdatedAt(normalizeList(resolvePayloadItems(incomingPayload, 'habits')));
  const currentCountdowns = ensureUpdatedAt(normalizeList(resolvePayloadItems(existingPayload, 'countdowns')));
  const incomingCountdowns = ensureUpdatedAt(normalizeList(resolvePayloadItems(incomingPayload, 'countdowns')));

  const mergedTasks = mergeById(currentTasks, incomingTasks);
  const mergedHabits = mergeById(currentHabits, incomingHabits);
  const mergedCountdowns = mergeById(currentCountdowns, incomingCountdowns);

  // 合并任务删除记录，并过滤已删除任务
  const existingDeletedTasks = normalizeDeletedMap(
    existingPayload?.deletions?.tasks ?? existingPayload?.deletedTasks,
  );
  const incomingDeletedTasks = normalizeDeletedMap(
    incomingPayload?.deletions?.tasks ?? incomingPayload?.deletedTasks,
  );
  const mergedDeletedTasks = mergeDeletedMap(existingDeletedTasks, incomingDeletedTasks);
  const { filtered: filteredTasks, nextDeleted: nextDeletedTasks } =
    filterByDeletions(mergedTasks, mergedDeletedTasks);

  // 合并 countdown 删除记录，并过滤已删除的 countdowns
  const existingDeletedCountdowns = normalizeDeletedMap(
    existingPayload?.deletions?.countdowns ?? existingPayload?.deletedCountdowns,
  );
  const incomingDeletedCountdowns = normalizeDeletedMap(
    incomingPayload?.deletions?.countdowns ?? incomingPayload?.deletedCountdowns,
  );
  const mergedDeletedCountdowns = mergeDeletedMap(existingDeletedCountdowns, incomingDeletedCountdowns);
  const { filtered: filteredCountdowns, nextDeleted: nextDeletedCountdowns } =
    filterByDeletions(mergedCountdowns, mergedDeletedCountdowns);

  // settings / secrets 根据 lastLocalChange 决定优先方
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
        tasks: filteredTasks,
        habits: mergedHabits,
        countdowns: filteredCountdowns,
      },
      deletions: {
        tasks: nextDeletedTasks,
        countdowns: nextDeletedCountdowns,
      },
      settings: mergedSettings,
      secrets: mergedSecrets,
    },
    meta: {
      lastLocalChange: pickLatestTimestamp(existingMeta?.lastLocalChange, incomingMeta?.lastLocalChange),
    },
  };
};

// ─── Redis 任务执行 ─────────────────────────────────────────

/**
 * 执行单个同步任务的 Redis 操作
 *
 * - pull：直接返回 Redis 中的数据快照
 * - push：将客户端数据与 Redis 数据合并后写回
 * - sync：合并后写回，并返回合并结果给客户端
 */
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

  // pull：只读，直接返回已有数据
  if (action === 'pull') {
    return { ok: true, data: existing?.payload ?? null, updatedAt: existing?.updatedAt ?? null, meta: existingMeta };
  }

  // push：合并后写入，不返回合并结果
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

  // sync：合并后写入，并返回合并结果供客户端更新本地数据
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

// ─── 公开 API ───────────────────────────────────────────────

/**
 * 创建一个同步任务记录（尚未入队）
 *
 * @param action - 操作类型
 * @param syncKey - 同步键（标识用户/数据集）
 * @param payload - 同步数据载荷
 * @returns 新创建的 SyncJobRecord
 */
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

/**
 * 将同步任务入队到 Redis
 * 创建短生命周期的 Redis 连接，操作完成后立即断开
 */
export const enqueueSyncJob = async (config: RedisConfig, job: SyncJobRecord) => {
  const redis = getRedis(config);
  await enqueueJob(redis, job);
  redis.disconnect();
};

/**
 * 查询同步任务的当前状态
 * 用于客户端轮询任务处理进度
 */
export const fetchSyncJob = async (config: RedisConfig, jobId: string) => {
  const redis = getRedis(config);
  const job = await getJob(redis, jobId);
  redis.disconnect();
  return job;
};

/**
 * 处理指定 syncKey 的同步队列
 *
 * 流程：
 * 1. 获取分布式锁（防止并发处理同一队列）
 * 2. 循环从队列头部取出任务并执行
 * 3. 每次循环刷新锁的过期时间
 * 4. 处理完毕后释放锁并断开连接
 *
 * 如果获取锁失败（其他进程正在处理），则直接返回
 */
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
      // 每次循环刷新锁，防止长时间处理导致锁过期
      await refreshLock(redis, syncKey);
      const jobId = await redis.lpop(buildQueueKey(syncKey));
      if (!jobId) break; // 队列为空，退出

      const job = await getJob(redis, jobId);
      if (!job) continue; // 任务记录已过期或不存在，跳过

      // 标记任务为处理中
      const nowIso = new Date().toISOString();
      job.status = 'processing';
      job.updatedAt = nowIso;
      await saveJob(redis, job);

      try {
        // 执行实际的同步操作
        const result = await executeRedisJob(redis, job.action, job.syncKey, job.payload);
        job.status = 'done';
        job.result = result;
        job.processedAt = new Date().toISOString();
        job.updatedAt = job.processedAt;
        await saveJob(redis, job);
      } catch (error) {
        // 任务执行失败，记录错误信息
        job.status = 'failed';
        job.error = String((error as Error)?.message || error);
        job.processedAt = new Date().toISOString();
        job.updatedAt = job.processedAt;
        await saveJob(redis, job);
      }
    }
  } finally {
    // 无论成功还是异常，都释放锁并断开连接
    await releaseLock(redis, syncKey, lockValue);
    redis.disconnect();
  }
};

export type { RedisConfig, SyncJobRecord };
