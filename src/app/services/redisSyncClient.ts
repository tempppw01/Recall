export type SyncAction = 'push' | 'pull' | 'sync';

export type RedisSyncConfig = {
  host: string;
  port: number;
  db: number;
  password?: string;
};

export async function executeRedisSyncJob(params: {
  action: SyncAction;
  namespace: string;
  redisConfig: RedisSyncConfig;
  payload?: any;
  pollSyncJob: (jobId: string) => Promise<any>;
}) {
  const { action, namespace, redisConfig, payload, pollSyncJob } = params;

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      namespace,
      redisConfig,
      ...(action !== 'pull' ? { payload: payload ?? null } : {}),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || '云同步失败');
  }
  if (!data?.jobId) {
    throw new Error('同步任务缺失');
  }
  return pollSyncJob(data.jobId);
}
