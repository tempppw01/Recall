'use client';

import { Database, HardDrive, Loader2, Server } from 'lucide-react';
import { useEffect, useState } from 'react';

type DatabaseStatus = {
  configured: boolean;
  setupRequired: boolean;
  provider: 'mysql' | 'sqlite' | 'none';
  sqlitePath?: string;
  error?: string;
};

const loadStatus = async (): Promise<DatabaseStatus> => {
  const response = await fetch('/api/setup', { cache: 'no-store' });
  const payload = (await response.json()) as DatabaseStatus;
  if (!response.ok && payload.provider !== 'mysql' && payload.provider !== 'sqlite') {
    throw new Error(payload.error || '无法读取数据库状态');
  }
  return payload;
};

export default function DatabaseSetupGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      setError('');
      setStatus(await loadStatus());
    } catch (nextError) {
      setError(String((nextError as Error)?.message || nextError));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const initializeSqlite = async () => {
    setInitializing(true);
    setError('');
    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'sqlite' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.details || payload.error || 'SQLite 初始化失败');
      await refresh();
    } catch (nextError) {
      setError(String((nextError as Error)?.message || nextError));
    } finally {
      setInitializing(false);
    }
  };

  if (status?.configured && status.provider !== 'none' && !status.error) return children;
  if (status?.configured && status.error) {
    return (
      <main className="min-h-screen bg-[#111315] px-5 py-12 text-white">
        <section className="mx-auto max-w-xl rounded-[28px] border border-red-300/20 bg-white/[0.06] p-7 shadow-2xl">
          <div className="mb-5 flex items-center gap-3 text-red-200"><Server className="h-5 w-5" /><span>数据库连接失败</span></div>
          <p className="text-sm leading-6 text-white/65">已检测到 {status.provider.toUpperCase()} 配置，但服务端无法连接。</p>
          <pre className="mt-4 overflow-auto rounded-2xl bg-black/25 p-4 text-xs text-red-100/80">{status.error}</pre>
          <button type="button" onClick={() => void refresh()} className="btn btn-primary mt-5 rounded-2xl">重新检测</button>
        </section>
      </main>
    );
  }
  if (!status && !error) {
    return <main className="grid min-h-screen place-items-center bg-[#111315] text-white"><Loader2 className="h-6 w-6 animate-spin text-white/70" /></main>;
  }

  return (
    <main className="min-h-screen bg-[#111315] px-5 py-12 text-white sm:px-8">
      <section className="mx-auto max-w-3xl">
        <div className="mb-8 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/65"><Database className="h-3.5 w-3.5" />首次初始化</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">选择 Recall 的数据存储</h1>
          <p className="mt-3 text-sm leading-6 text-white/60 sm:text-base">当前 Compose 没有检测到 MySQL。请选择 SQLite 后，任务、习惯和倒计时会写入服务端持久化数据库。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[28px] border border-sky-300/25 bg-sky-300/[0.08] p-6 shadow-[0_18px_70px_rgba(14,165,233,0.12)]">
            <div className="flex items-center gap-3"><HardDrive className="h-5 w-5 text-sky-200" /><h2 className="font-medium">初始化 SQLite</h2></div>
            <p className="mt-4 text-sm leading-6 text-white/65">推荐单机、NAS 和轻量部署。数据库文件会保存到容器的 `/app/data/recall.db`，重建容器不会丢失。</p>
            <button type="button" disabled={initializing} onClick={() => void initializeSqlite()} className="btn btn-primary mt-6 w-full rounded-2xl disabled:opacity-50">
              {initializing ? <><Loader2 className="h-4 w-4 animate-spin" />正在初始化…</> : '初始化并开始使用'}
            </button>
          </article>
          <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center gap-3"><Server className="h-5 w-5 text-white/70" /><h2 className="font-medium">使用 MySQL</h2></div>
            <p className="mt-4 text-sm leading-6 text-white/55">在 Compose 的 `.env` 中填写 `DATABASE_URL=mysql://…`，然后重启容器。支持本地 Compose MySQL 和远程 MySQL。</p>
            <code className="mt-5 block rounded-2xl bg-black/25 p-3 text-xs text-white/65">DATABASE_URL=mysql://user:password@host:3306/recall</code>
          </article>
        </div>
        {(error || status?.error) && <p className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/[0.08] p-4 text-sm text-red-100">{error || status?.error}</p>}
      </section>
    </main>
  );
}
