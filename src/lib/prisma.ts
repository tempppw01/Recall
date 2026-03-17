/**
 * Prisma 数据库客户端模块
 *
 * 默认模式：使用环境变量 DATABASE_URL 对服务端数据库建连。
 *
 * 高级模式（默认关闭）：允许未登录请求通过 `x-pg-*` 请求头连到自定义 PostgreSQL，
 * 仅建议用于自部署/受信网络。
 */

import { PrismaClient } from '@prisma/client';

type GlobalForPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

type DynamicPrismaCacheEntry = {
  client: PrismaClient;
  lastUsedAt: number;
};

export type RequestDbContext = {
  client: PrismaClient;
  userId: string;
  source: 'session' | 'dynamic-pg' | 'none';
};

const globalForPrisma = globalThis as GlobalForPrisma;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export interface PgConfig {
  host?: string;
  port?: string | number;
  database?: string;
  username?: string;
  password?: string;
}

export const DEFAULT_DYNAMIC_PG_USER_ID = 'local-user';

const DYNAMIC_PG_ENABLED = (process.env.ENABLE_DYNAMIC_PG_HEADERS || '').trim() === 'true';
const DYNAMIC_PG_MAX_CLIENTS = Math.max(Number(process.env.DYNAMIC_PG_MAX_CLIENTS || 3), 1);
const DYNAMIC_PG_IDLE_TTL_MS = Math.max(Number(process.env.DYNAMIC_PG_IDLE_TTL_MS || 2 * 60 * 1000), 30_000);
const DYNAMIC_PG_CONNECT_TIMEOUT_MS = Math.max(Number(process.env.DYNAMIC_PG_CONNECT_TIMEOUT_MS || 5_000), 1_000);
const DYNAMIC_PG_POOL_TIMEOUT_MS = Math.max(Number(process.env.DYNAMIC_PG_POOL_TIMEOUT_MS || 10_000), 1_000);
const DYNAMIC_PG_CONNECTION_LIMIT = Math.max(Number(process.env.DYNAMIC_PG_CONNECTION_LIMIT || 1), 1);

const dynamicClientCache = new Map<string, DynamicPrismaCacheEntry>();

const getPgHeadersToken = () => (process.env.PG_HEADERS_TOKEN || '').trim();
const getPgHostAllowlist = () =>
  (process.env.PG_HEADERS_HOST_ALLOWLIST || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const normalizePort = (value?: string | number) => {
  const raw = String(value || '5432').trim();
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return null;
  }
  return String(parsed);
};

const normalizePgConfig = (config: PgConfig): Required<PgConfig> | null => {
  const host = config.host?.trim();
  const database = config.database?.trim();
  const username = config.username?.trim();
  const port = normalizePort(config.port);

  if (!host || !database || !username || !port) {
    return null;
  }

  return {
    host,
    port,
    database,
    username,
    password: config.password || '',
  };
};

const buildConnectionUrl = (config: Required<PgConfig>) => {
  const password = encodeURIComponent(config.password || '');
  const params = new URLSearchParams({
    connection_limit: String(DYNAMIC_PG_CONNECTION_LIMIT),
    connect_timeout: String(Math.ceil(DYNAMIC_PG_CONNECT_TIMEOUT_MS / 1000)),
    pool_timeout: String(Math.ceil(DYNAMIC_PG_POOL_TIMEOUT_MS / 1000)),
  });
  return `postgresql://${config.username}:${password}@${config.host}:${config.port}/${config.database}?${params.toString()}`;
};

const buildDynamicCacheKey = (config: Required<PgConfig>) =>
  [config.host, config.port, config.database, config.username].join(':');

const disconnectEntry = async (key: string, entry: DynamicPrismaCacheEntry) => {
  dynamicClientCache.delete(key);
  try {
    await entry.client.$disconnect();
  } catch (error) {
    console.error('[prisma] failed to disconnect dynamic client', error);
  }
};

const sweepDynamicClientCache = async () => {
  if (dynamicClientCache.size === 0) return;

  const now = Date.now();
  const entries = Array.from(dynamicClientCache.entries());

  for (const [key, entry] of entries) {
    if (now - entry.lastUsedAt > DYNAMIC_PG_IDLE_TTL_MS) {
      await disconnectEntry(key, entry);
    }
  }

  if (dynamicClientCache.size <= DYNAMIC_PG_MAX_CLIENTS) return;

  const survivors = Array.from(dynamicClientCache.entries()).sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
  while (survivors.length > DYNAMIC_PG_MAX_CLIENTS) {
    const oldest = survivors.shift();
    if (!oldest) break;
    await disconnectEntry(oldest[0], oldest[1]);
  }
};

export const createDynamicPrismaClient = (config: PgConfig) => {
  const normalized = normalizePgConfig(config);
  if (!normalized) {
    return null;
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: buildConnectionUrl(normalized),
      },
    },
    log: ['error', 'warn'],
  });
};

export const getDynamicPrisma = (config: PgConfig) => {
  const normalized = normalizePgConfig(config);
  if (!normalized) {
    return null;
  }

  void sweepDynamicClientCache();

  const cacheKey = buildDynamicCacheKey(normalized);
  const cached = dynamicClientCache.get(cacheKey);
  if (cached) {
    cached.lastUsedAt = Date.now();
    return cached.client;
  }

  const client = createDynamicPrismaClient(normalized);
  if (!client) {
    return null;
  }

  dynamicClientCache.set(cacheKey, {
    client,
    lastUsedAt: Date.now(),
  });

  void sweepDynamicClientCache();
  return client;
};

export const disconnectDynamicPrisma = async (client: PrismaClient | null | undefined) => {
  if (!client) return;
  try {
    await client.$disconnect();
  } catch (error) {
    console.error('[prisma] failed to disconnect prisma client', error);
  }
};

export const getPgConfigFromHeaders = (headers: Headers): PgConfig | null => {
  if (!DYNAMIC_PG_ENABLED) {
    return null;
  }

  const host = headers.get('x-pg-host');
  const port = headers.get('x-pg-port');
  const database = headers.get('x-pg-database');
  const username = headers.get('x-pg-username');
  const password = headers.get('x-pg-password');

  const normalized = normalizePgConfig({
    host: host || undefined,
    port: port || undefined,
    database: database || undefined,
    username: username || undefined,
    password: password || undefined,
  });

  if (!normalized) {
    return null;
  }

  const requiredToken = getPgHeadersToken();
  if (requiredToken) {
    const providedToken = headers.get('x-pg-token') || '';
    if (providedToken !== requiredToken) {
      return null;
    }
  }

  const allowlist = getPgHostAllowlist();
  if (allowlist.length > 0 && !allowlist.includes(normalized.host)) {
    return null;
  }

  return normalized;
};

export const resolveRequestDbContext = async (
  request: Request,
  getUserId: () => Promise<string>,
): Promise<RequestDbContext> => {
  const userId = await getUserId();
  if (userId) {
    return {
      client: prisma,
      userId,
      source: 'session',
    };
  }

  const pgConfig = getPgConfigFromHeaders(request.headers);
  if (!pgConfig) {
    return {
      client: prisma,
      userId: '',
      source: 'none',
    };
  }

  const dynamicClient = getDynamicPrisma(pgConfig);
  if (!dynamicClient) {
    return {
      client: prisma,
      userId: '',
      source: 'none',
    };
  }

  return {
    client: dynamicClient,
    userId: DEFAULT_DYNAMIC_PG_USER_ID,
    source: 'dynamic-pg',
  };
};

export const ensureLocalUser = async (client: PrismaClient, userId: string) => {
  if (userId !== DEFAULT_DYNAMIC_PG_USER_ID) {
    return;
  }

  const userExists = await client.user.findUnique({ where: { id: userId } });
  if (!userExists) {
    await client.user.create({ data: { id: userId, name: 'Local User' } });
  }
};

