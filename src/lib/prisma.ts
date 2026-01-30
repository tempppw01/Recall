import { PrismaClient } from '@prisma/client';

type GlobalForPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalForPrisma;

// 默认的静态连接（走环境变量）
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 动态连接配置接口
export interface PgConfig {
  host?: string;
  port?: string | number;
  database?: string;
  username?: string;
  password?: string;
}

// 动态创建 Prisma Client
// 注意：由于 Next.js API Routes 的无状态性，频繁创建连接可能导致连接池耗尽。
// 在生产环境中，建议使用连接池（如 PgBouncer）或限制并发。
// 这里为了满足“前端动态配置”的需求，每次请求构建新的 Client 实例，使用后需 disconnect。
export const getDynamicPrisma = (config: PgConfig) => {
  // 如果配置不完整，回退到默认 prisma
  if (!config.host || !config.database || !config.username) {
    return null;
  }

  const { host, port = 5432, database, username, password } = config;
  const encodedPassword = encodeURIComponent(password || '');
  const url = `postgresql://${username}:${encodedPassword}@${host}:${port}/${database}`;

  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
    log: ['error', 'warn'],
  });
};

// 从请求头解析 PG 配置
export const getPgConfigFromHeaders = (headers: Headers): PgConfig | null => {
  const host = headers.get('x-pg-host');
  const port = headers.get('x-pg-port');
  const database = headers.get('x-pg-database');
  const username = headers.get('x-pg-username');
  const password = headers.get('x-pg-password');

  if (!host || !database || !username) {
    return null;
  }

  return {
    host,
    port: port || 5432,
    database,
    username,
    password: password || '',
  };
};
