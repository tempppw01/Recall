import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_WEBDAV_URL = 'https://disk.shuaihong.fun/dav';
const DEFAULT_WEBDAV_PATH = 'recall-sync.json';

const buildWebdavUrl = (baseUrl: string, path?: string) => {
  const safeBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const safePath = (path || DEFAULT_WEBDAV_PATH).replace(/^\//, '');
  return new URL(safePath, safeBase).toString();
};

const normalizeString = (value?: string) => (value || '').trim();

const buildSyncKey = (url: string, username: string, path: string) =>
  Buffer.from(`${url}|${username}|${path}`).toString('base64');

const ensureSyncState = async (syncKey: string) => {
  const existing = await prisma.syncState.findUnique({ where: { syncKey } });
  if (existing) return existing;
  return prisma.syncState.create({ data: { syncKey } });
};

const enqueueJob = async (payload: {
  syncKey: string;
  action: 'push' | 'pull' | 'sync';
  payload?: any;
  url: string;
  username: string;
  password: string;
  path: string;
}) => {
  const job = await prisma.syncJob.create({
    data: {
      syncKey: payload.syncKey,
      action: payload.action,
      status: 'pending',
      payload: {
        url: payload.url,
        username: payload.username,
        password: payload.password,
        path: payload.path,
        data: payload.payload ?? null,
      },
    },
  });
  return job;
};

const processQueue = async (syncKey: string) => {
  const state = await prisma.syncState.findUnique({ where: { syncKey } });
  if (state?.isProcessing) return;

  await prisma.syncState.update({ where: { syncKey }, data: { isProcessing: true } });

  try {
    let job = await prisma.syncJob.findFirst({
      where: { syncKey, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });

    while (job) {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: 'processing' },
      });

      const payload = job.payload as any;
      try {
        const result = await executeWebdavJob(job.action as 'push' | 'pull' | 'sync', payload);
        await prisma.syncJob.update({
          where: { id: job.id },
          data: {
            status: 'done',
            result,
            processedAt: new Date(),
          },
        });
        await prisma.syncState.update({
          where: { syncKey },
          data: { lastSyncedAt: new Date() },
        });
      } catch (error) {
        await prisma.syncJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error: String((error as Error)?.message || error),
            processedAt: new Date(),
          },
        });
      }

      job = await prisma.syncJob.findFirst({
        where: { syncKey, status: 'pending' },
        orderBy: { createdAt: 'asc' },
      });
    }
  } finally {
    await prisma.syncState.update({ where: { syncKey }, data: { isProcessing: false } });
  }
};

const executeWebdavJob = async (
  action: 'push' | 'pull' | 'sync',
  payload: { url: string; username: string; password: string; path: string; data?: any },
) => {
  const baseUrl = normalizeString(payload.url || DEFAULT_WEBDAV_URL);
  const user = normalizeString(payload.username);
  const pass = normalizeString(payload.password);
  const resolvedPath = normalizeString(payload.path || DEFAULT_WEBDAV_PATH);

  if (!baseUrl) throw new Error('WebDAV URL is required');
  if (!user || !pass) throw new Error('WebDAV credentials are required');

  const targetUrl = buildWebdavUrl(baseUrl, resolvedPath);
  const authHeader = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

  const executeRequest = async (requestAction: 'push' | 'pull') => {
    if (requestAction === 'push') {
      const res = await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload.data ?? {}),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'WebDAV push failed');
      }
      return { ok: true };
    }

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: { Authorization: authHeader },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'WebDAV pull failed');
    }
    const data = await res.json();
    return { ok: true, data };
  };

  if (action === 'push') {
    return executeRequest('push');
  }

  if (action === 'pull') {
    return executeRequest('pull');
  }

  const pullResult = await executeRequest('pull');
  await executeRequest('push');
  return { ok: true, data: (pullResult as any).data };
};

export async function POST(request: NextRequest) {
  try {
    const { action, url, username, password, path, payload } = await request.json();

    if (!['push', 'pull', 'sync'].includes(action)) {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const baseUrl = normalizeString(url || DEFAULT_WEBDAV_URL);
    const user = normalizeString(username);
    const resolvedPath = normalizeString(path || DEFAULT_WEBDAV_PATH);

    if (!baseUrl) {
      return NextResponse.json({ error: 'WebDAV URL is required' }, { status: 400 });
    }
    if (!user || !normalizeString(password)) {
      return NextResponse.json({ error: 'WebDAV credentials are required' }, { status: 400 });
    }

    const syncKey = buildSyncKey(baseUrl, user, resolvedPath);
    await ensureSyncState(syncKey);

    const job = await enqueueJob({
      syncKey,
      action,
      payload,
      url: baseUrl,
      username: user,
      password,
      path: resolvedPath,
    });

    processQueue(syncKey).catch((error) => {
      console.error('WebDAV sync queue error', error);
    });

    return NextResponse.json({ ok: true, jobId: job.id, status: job.status });
  } catch (error) {
    console.error('WebDAV sync error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }
    const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      status: job.status,
      result: job.result,
      error: job.error,
    });
  } catch (error) {
    console.error('WebDAV sync status error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
