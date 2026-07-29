/**
 * 服务端数据库入口。
 *
 * - DATABASE_URL 为 mysql/mariadb 时使用 MySQL Prisma Client。
 * - 没有配置 MySQL 时，初始化页会把选择写入 /app/data/database.json，之后使用持久化 SQLite。
 * - 未完成选择前，业务 API 保持未就绪，不会悄悄把数据写回浏览器 LocalStorage。
 */

import { PrismaClient as MysqlPrismaClient } from '@prisma/client';
import { PrismaClient as SqlitePrismaClient } from '@/generated/prisma/sqlite';
import {
  ensureDatabaseSchema,
  getDatabaseProvider,
  getDatabaseStatus,
  getSqliteDatabaseUrl,
  type DatabaseProvider,
} from '@/lib/database';

export type AppPrismaClient = any;

const mysqlUrl = process.env.DATABASE_URL?.trim() || 'mysql://recall:recall@127.0.0.1:3306/recall';
const sqliteUrl = getSqliteDatabaseUrl();
const initialProvider = getDatabaseProvider();

const globalForPrisma = globalThis as typeof globalThis & {
  recallMysqlPrisma?: MysqlPrismaClient;
  recallSqlitePrisma?: SqlitePrismaClient;
};

const mysqlPrisma =
  globalForPrisma.recallMysqlPrisma ??
  new MysqlPrismaClient({
    datasources: { db: { url: mysqlUrl } },
    log: ['error', 'warn'],
  });

const sqlitePrisma =
  globalForPrisma.recallSqlitePrisma ??
  new SqlitePrismaClient({
    datasources: { db: { url: sqliteUrl } },
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.recallMysqlPrisma = mysqlPrisma;
  globalForPrisma.recallSqlitePrisma = sqlitePrisma;
}

// 未初始化时先绑定到 SQLite 路径，完成选择后同一进程可直接继续使用该客户端。
export const prisma: AppPrismaClient = initialProvider === 'mysql' ? mysqlPrisma : sqlitePrisma;

export const getActiveDatabaseProvider = (): Exclude<DatabaseProvider, 'none'> | null => {
  const provider = getDatabaseProvider();
  return provider === 'none' ? null : provider;
};

export const isSqliteDatabase = () => getActiveDatabaseProvider() === 'sqlite';

export const ensureActiveDatabase = async () => {
  const provider = getActiveDatabaseProvider();
  if (!provider) return false;
  await ensureDatabaseSchema(prisma, provider);
  return true;
};

export const getDatabaseReadiness = () => getDatabaseStatus();

export type MysqlConfig = {
  host?: string;
  port?: string | number;
  database?: string;
  username?: string;
  password?: string;
};

// 兼容旧设置页的字段名；新部署推荐直接通过 DATABASE_URL 配置 MySQL。
export type PgConfig = MysqlConfig;
export const DEFAULT_DYNAMIC_PG_USER_ID = 'local-user';

const normalizePort = (value?: string | number) => {
  const parsed = Number(String(value || '3306').trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) return null;
  return String(parsed);
};

const normalizeConfig = (config: MysqlConfig): Required<MysqlConfig> | null => {
  const host = config.host?.trim();
  const database = config.database?.trim();
  const username = config.username?.trim();
  const port = normalizePort(config.port);
  if (!host || !database || !username || !port) return null;
  return { host, port, database, username, password: config.password || '' };
};

const buildMysqlUrl = (config: Required<MysqlConfig>) =>
  `mysql://${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@${config.host}:${config.port}/${config.database}`;

export const createDynamicPrismaClient = (config: MysqlConfig) => {
  const normalized = normalizeConfig(config);
  if (!normalized) return null;
  return new MysqlPrismaClient({
    datasources: { db: { url: buildMysqlUrl(normalized) } },
    log: ['error', 'warn'],
  });
};

export const disconnectDynamicPrisma = async (client: AppPrismaClient) => {
  if (!client) return;
  await client.$disconnect().catch((error: unknown) => {
    console.error('[prisma] failed to disconnect dynamic client', error);
  });
};

export const getPgConfigFromHeaders = (headers: Headers): PgConfig | null => {
  const host = headers.get('x-pg-host');
  const database = headers.get('x-pg-database');
  const username = headers.get('x-pg-username');
  if (!host || !database || !username) return null;
  return {
    host,
    port: headers.get('x-pg-port') || '3306',
    database,
    username,
    password: headers.get('x-pg-password') || '',
  };
};

export type RequestDbContext = {
  client: AppPrismaClient;
  userId: string;
  source: 'session' | 'local-database' | 'none';
  provider: Exclude<DatabaseProvider, 'none'> | null;
};

export const ensureLocalUser = async (client: AppPrismaClient, userId: string) => {
  if (userId !== DEFAULT_DYNAMIC_PG_USER_ID) return;
  await client.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name: 'Local User' },
  });
};

export const resolveRequestDbContext = async (
  request: Request,
  getUserId: () => Promise<string>,
): Promise<RequestDbContext> => {
  const provider = getActiveDatabaseProvider();
  if (!provider) {
    return { client: prisma, userId: '', source: 'none', provider: null };
  }

  await ensureActiveDatabase();
  const userId = await getUserId();
  if (userId) {
    return { client: prisma, userId, source: 'session', provider };
  }

  await ensureLocalUser(prisma, DEFAULT_DYNAMIC_PG_USER_ID);
  return {
    client: prisma,
    userId: DEFAULT_DYNAMIC_PG_USER_ID,
    source: 'local-database',
    provider,
  };
};
