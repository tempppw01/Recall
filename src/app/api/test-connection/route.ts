/**
 * 连接测试 API 路由
 *
 * POST /api/test-connection - 测试外部服务连接是否可用
 * 支持三种连接类型：
 * - pg：PostgreSQL 数据库连接测试
 * - redis：Redis 连接测试
 * - webdav：WebDAV 服务连接测试
 */

import { NextResponse } from 'next/server';
import { createDynamicPrismaClient, disconnectDynamicPrisma } from '@/lib/prisma';
import Redis from 'ioredis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, config } = body;

    if (!type || !config) {
      return NextResponse.json({ error: 'Missing type or config' }, { status: 400 });
    }

    if (type === 'pg') {
      const client = createDynamicPrismaClient(config);
      if (!client) {
        return NextResponse.json({ error: 'Invalid configuration' }, { status: 400 });
      }

      try {
        await client.$queryRaw`SELECT 1`;
        await disconnectDynamicPrisma(client);
        return NextResponse.json({ success: true, message: 'PostgreSQL 连接成功' });
      } catch (error) {
        await disconnectDynamicPrisma(client);
        return NextResponse.json({ error: '连接失败', details: String(error) }, { status: 500 });
      }
    }

    if (type === 'redis') {
      const { host, port, db, password } = config;
      if (!host || !port) {
        return NextResponse.json({ error: 'Invalid configuration' }, { status: 400 });
      }

      const redis = new Redis({
        host,
        port: Number(port),
        db: Number(db || 0),
        password: password || undefined,
        connectTimeout: 5000,
        lazyConnect: true,
      });

      try {
        await redis.connect();
        await redis.ping();
        await redis.quit();
        return NextResponse.json({ success: true, message: 'Redis 连接成功' });
      } catch (error) {
        redis.disconnect();
        return NextResponse.json({ error: '连接失败', details: String(error) }, { status: 500 });
      }
    }

    if (type === 'webdav') {
      const { url, username, password } = config;
      if (!url || !username || !password) {
        return NextResponse.json({ error: 'Invalid configuration' }, { status: 400 });
      }

      try {
        const headers = new Headers();
        headers.set('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
        headers.set('Depth', '0');

        const res = await fetch(url, {
          method: 'PROPFIND',
          headers,
        });

        if (res.ok || res.status === 207 || res.status === 405) {
          return NextResponse.json({ success: true, message: 'WebDAV 连接成功' });
        }

        return NextResponse.json(
          {
            error: '连接失败',
            details: `Status: ${res.status} ${res.statusText}`,
          },
          { status: res.status },
        );
      } catch (error) {
        return NextResponse.json({ error: '连接失败', details: String(error) }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
  }
}
