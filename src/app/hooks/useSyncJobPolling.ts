import { useCallback } from 'react';

export function useSyncJobPolling(params: {
  redisHost: string;
  redisPort: string;
  redisDb: string;
  redisPassword: string;
}) {
  const { redisHost, redisPort, redisDb, redisPassword } = params;

  const pollSyncJob = useCallback(async (jobId: string, timeoutMs = 60_000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const syncParams = new URLSearchParams({ jobId });
      if (redisHost) syncParams.set('redisHost', redisHost);
      if (redisPort) syncParams.set('redisPort', redisPort);
      if (redisDb) syncParams.set('redisDb', redisDb);
      if (redisPassword) syncParams.set('redisPassword', redisPassword);

      const res = await fetch(`/api/sync?${syncParams.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || '同步状态获取失败');
      }
      if (data.status === 'done') {
        return data.result;
      }
      if (data.status === 'failed') {
        throw new Error(data?.error || '同步失败');
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error('同步超时');
  }, [redisDb, redisHost, redisPassword, redisPort]);

  return { pollSyncJob };
}
