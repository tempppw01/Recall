import { NextResponse } from 'next/server';
import { getDynamicPrisma } from '@/lib/prisma';
import Redis from 'ioredis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, config } = body;

    if (!type || !config) {
      return NextResponse.json({ error: 'Missing type or config' }, { status: 400 });
    }

    if (type === 'pg') {
      const client = getDynamicPrisma(config);
      if (!client) {
        return NextResponse.json({ error: 'Invalid configuration' }, { status: 400 });
      }
      try {
        // 尝试查询数据库版本或执行简单查询
        await client.$queryRaw`SELECT 1`;
        await client.$disconnect();
        return NextResponse.json({ success: true, message: 'PostgreSQL 连接成功' });
      } catch (error) {
        await client.$disconnect();
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
        // 尝试发送 PROPFIND 请求来检查根目录
        const headers = new Headers();
        headers.set('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
        
        // 注意：有些 WebDAV 服务器可能需要 depth: 0 或 1
        headers.set('Depth', '0');

        const res = await fetch(url, {
          method: 'PROPFIND',
          headers,
        });

        if (res.ok || res.status === 207 || res.status === 405) { // 405 意味着方法不允许，但连接通了
           return NextResponse.json({ success: true, message: 'WebDAV 连接成功' });
        }
        
        return NextResponse.json({ 
          error: '连接失败', 
          details: `Status: ${res.status} ${res.statusText}` 
        }, { status: res.status });

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
