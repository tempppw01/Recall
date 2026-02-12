/**
 * Prisma 数据库客户端模块
 *
 * 提供两种连接方式：
 * 1. 静态连接 —— 使用环境变量 DATABASE_URL，适用于服务端默认数据库
 * 2. 动态连接 —— 根据前端传入的 PG 配置（通过请求头）按需创建实例，
 *    适用于用户自定义数据库场景
 */

import { PrismaClient } from '@prisma/client';

/**
 * 扩展 globalThis 类型，用于在开发环境下缓存 PrismaClient 实例，
 * 避免 Next.js 热重载时反复创建连接导致连接池耗尽。
 */
type GlobalForPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalForPrisma;

/**
 * 默认的静态 Prisma 实例（使用环境变量 DATABASE_URL）
 * 开发环境下挂载到 globalThis 以复用连接
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

// 开发环境下缓存实例，防止热重载时重复创建
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** 动态 PostgreSQL 连接配置 */
export interface PgConfig {
  host?: string;
  port?: string | number;
  database?: string;
  username?: string;
  password?: string;
}

/**
 * 根据用户提供的 PG 配置动态创建 Prisma Client 实例
 *
 * 注意：由于 Next.js API Routes 的无状态性，频繁创建连接可能导致连接池耗尽。
 * 在生产环境中，建议使用连接池（如 PgBouncer）或限制并发。
 * 调用方使用完毕后需手动调用 `$disconnect()` 释放连接。
 *
 * @param config - 用户提供的数据库连接参数
 * @returns PrismaClient 实例，配置不完整时返回 null（回退到默认连接）
 */
export const getDynamicPrisma = (config: PgConfig) => {
  // 必填字段缺失时返回 null，由调用方回退到默认 prisma
  if (!config.host || !config.database || !config.username) {
    return null;
  }

  // 拼接 PostgreSQL 连接字符串，密码需 URL 编码
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

/**
 * 从 HTTP 请求头中解析 PG 连接配置
 *
 * 前端通过自定义请求头 `x-pg-*` 传递数据库连接信息，
 * 实现"用户在浏览器端配置自己的数据库"的功能。
 *
 * @param headers - HTTP 请求头对象
 * @returns 解析后的 PgConfig，必填字段缺失时返回 null
 */
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
