import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_WEBDAV_URL = 'https://disk.shuaihong.fun/dav';
const DEFAULT_WEBDAV_PATH = 'recall-sync.json';

const buildWebdavUrl = (baseUrl: string, path?: string) => {
  const safeBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const safePath = (path || DEFAULT_WEBDAV_PATH).replace(/^\//, '');
  return new URL(safePath, safeBase).toString();
};

export async function POST(request: NextRequest) {
  try {
    const { action, url, username, password, path, payload } = await request.json();

    const baseUrl = (url || DEFAULT_WEBDAV_URL).trim();
    const user = (username || '').trim();
    const pass = (password || '').trim();
    const resolvedPath = (path || DEFAULT_WEBDAV_PATH).trim();

    if (!baseUrl) {
      return NextResponse.json({ error: 'WebDAV URL is required' }, { status: 400 });
    }
    if (!user || !pass) {
      return NextResponse.json({ error: 'WebDAV credentials are required' }, { status: 400 });
    }

    const targetUrl = buildWebdavUrl(baseUrl, resolvedPath);
    const authHeader = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

    if (action === 'push') {
      const res = await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload ?? {}),
      });

      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: text || 'WebDAV push failed' }, { status: res.status });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === 'pull') {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: text || 'WebDAV pull failed' }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json({ ok: true, data });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('WebDAV sync error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
