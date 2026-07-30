/**
 * 连接测试 API 路由
 *
 * POST /api/test-connection - 测试外部服务连接是否可用
 * 目前只提供 WebDAV 连接测试。数据库和 Redis 均由服务端部署环境管理。
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, config } = body;

    if (!type || !config) {
      return NextResponse.json({ error: 'Missing type or config' }, { status: 400 });
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
