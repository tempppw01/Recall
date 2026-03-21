import { useCallback, useEffect, useRef, useState } from 'react';

export type SyncAction = 'push' | 'pull' | 'sync';

export type SyncManagerParams = {
  redisHost: string;
  redisPort: number;
  redisDb: number;
  redisPassword: string;
  syncNamespace: string;
  autoSyncEnabled: boolean;
  autoSyncIntervalMin: number;
  buildSyncPayload: () => any;
  getLastLocalChange: () => string | undefined | null;
  applyImportedData: (payload: any, mode: 'merge' | 'overwrite') => void;
  applySyncedSettings: (payload: any) => void;
  pushLog: (level: 'info' | 'success' | 'warning' | 'error', title: string, detail?: string, options?: { silentFeedback?: boolean }) => void;
  onNeedSettings?: () => void;
};

type SyncErrorShape = {
  status?: number;
  code?: string;
  message?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeSyncError = (error: unknown): SyncErrorShape => {
  if (error && typeof error === 'object') {
    const e = error as SyncErrorShape;
    return {
      status: typeof e.status === 'number' ? e.status : undefined,
      code: typeof e.code === 'string' ? e.code : undefined,
      message: typeof e.message === 'string' ? e.message : String(error),
    };
  }
  return { message: String(error || 'unknown error') };
};

const classifySyncErrorMessage = (error: unknown) => {
  const { status, code, message } = normalizeSyncError(error);
  const msg = (message || '').toLowerCase();

  if (msg.includes('同步超时')) {
    return {
      title: '云同步超时',
      detail: '网络较慢或服务端繁忙，请稍后重试',
    };
  }

  if (code === 'SYNC_REDIS_CONFIG_MISSING' || msg.includes('redis config missing')) {
    return {
      title: '云同步配置不完整',
      detail: '请检查 Redis Host/Port/DB/Password 配置',
    };
  }

  if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('forbidden')) {
    return {
      title: '云同步鉴权失败',
      detail: '当前同步凭据不可用，请检查权限后重试',
    };
  }

  if (
    msg.includes('failed to fetch')
    || msg.includes('networkerror')
    || msg.includes('network request failed')
    || msg.includes('load failed')
  ) {
    return {
      title: '云同步网络异常',
      detail: '请检查网络连接后重试',
    };
  }

  if (status && status >= 500) {
    return {
      title: '云同步服务异常',
      detail: '服务端暂时不可用，请稍后重试',
    };
  }

  return {
    title: '云同步失败',
    detail: message || '未知错误',
  };
};

export function useSyncManager(params: SyncManagerParams) {
  const {
    redisHost,
    redisPort,
    redisDb,
    redisPassword,
    syncNamespace,
    autoSyncEnabled,
    autoSyncIntervalMin,
    buildSyncPayload,
    getLastLocalChange,
    applyImportedData,
    applySyncedSettings,
    pushLog,
    onNeedSettings,
  } = params;

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing'>('idle');
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const pollSyncJob = useCallback(async (jobId: string, timeoutMs = 60_000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const query = new URLSearchParams({ jobId });
      if (redisHost) query.set('redisHost', redisHost);
      if (Number.isFinite(redisPort)) query.set('redisPort', String(redisPort));
      if (Number.isFinite(redisDb)) query.set('redisDb', String(redisDb));

      const res = await fetch(`/api/sync?${query.toString()}`, {
        headers: redisPassword ? { 'x-sync-redis-password': redisPassword } : undefined,
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (error) {
        throw {
          status: res.status,
          message: '同步状态解析失败',
        } satisfies SyncErrorShape;
      }

      if (!res.ok) {
        throw {
          status: res.status,
          code: data?.code,
          message: data?.error || '同步状态获取失败',
        } satisfies SyncErrorShape;
      }

      if (data.status === 'done') {
        return data.result;
      }
      if (data.status === 'failed') {
        throw {
          status: 400,
          code: 'SYNC_JOB_FAILED',
          message: data?.error || '同步失败',
        } satisfies SyncErrorShape;
      }
      await sleep(1000);
    }
    throw new Error('同步超时');
  }, [redisDb, redisHost, redisPassword, redisPort]);

  const handleSync = useCallback(async (action: SyncAction, options?: { silent?: boolean }) => {
    if (syncStatus === 'syncing') return;

    if (!redisHost) {
      if (!options?.silent) {
        pushLog('warning', 'Redis 配置不完整', '请填写 Redis Host 以开启云同步');
        onNeedSettings?.();
      }
      return;
    }

    setSyncStatus('syncing');
    setIsSyncingNow(true);

    if (!options?.silent) {
      const label = action === 'push' ? '云同步上传中' : action === 'pull' ? '云同步拉取中' : '云同步合并中';
      pushLog('info', label);
    }

    try {
      const executeRequest = async (requestAction: SyncAction) => {
        const lastLocalChange = getLastLocalChange();
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: requestAction,
            namespace: syncNamespace,
            redisConfig: {
              host: redisHost,
              port: redisPort,
              db: redisDb,
              password: redisPassword,
            },
            ...(requestAction !== 'pull'
              ? { payload: { data: buildSyncPayload(), meta: { lastLocalChange } } }
              : {}),
          }),
        });

        let data: any = null;
        try {
          data = await res.json();
        } catch (error) {
          throw {
            status: res.status,
            message: '同步响应解析失败',
          } satisfies SyncErrorShape;
        }

        if (!res.ok) {
          throw {
            status: res.status,
            code: data?.code,
            message: data?.error || '云同步失败',
          } satisfies SyncErrorShape;
        }
        if (!data?.jobId) {
          throw new Error('同步任务缺失');
        }
        const result = await pollSyncJob(data.jobId);
        return result;
      };

      if (action === 'pull') {
        const result = await executeRequest('pull');
        const remotePayload = result?.data;
        if (remotePayload) {
          applyImportedData(remotePayload, 'merge');
          applySyncedSettings(remotePayload);
          if (!options?.silent) {
            pushLog('success', '云同步完成', `导入任务 ${remotePayload?.data?.tasks?.length ?? 0} 条`);
          }
        } else if (!options?.silent) {
          pushLog('warning', '云同步失败', '未读取到远端数据');
        }
        return;
      }

      if (action === 'push') {
        await executeRequest('push');
        if (!options?.silent) {
          pushLog('success', '云同步上传完成');
        }
        return;
      }

      // sync
      const result = await executeRequest('sync');
      const remotePayload = result?.data;
      if (remotePayload) {
        applyImportedData(remotePayload, 'merge');
        applySyncedSettings(remotePayload);

        const remoteLastChange = result?.meta?.lastLocalChange;
        const localLastChange = getLastLocalChange();
        if (remoteLastChange && localLastChange && !options?.silent) {
          const remoteMs = new Date(remoteLastChange).getTime();
          const localMs = new Date(localLastChange).getTime();
          if (remoteMs > localMs) {
            pushLog('info', '检测到远端更新，已合并', remoteLastChange);
          }
        }
      } else if (!options?.silent) {
        pushLog('warning', '云同步失败', '未读取到远端数据');
      }

      if (!options?.silent) {
        pushLog('success', '云同步完成', '已完成服务端合并');
      }
    } catch (error) {
      console.error(error);
      if (!options?.silent) {
        const mapped = classifySyncErrorMessage(error);
        pushLog('error', mapped.title, mapped.detail);
      }
    } finally {
      setSyncStatus('idle');
      setIsSyncingNow(false);
    }
  }, [
    syncStatus,
    redisHost,
    redisPort,
    redisDb,
    redisPassword,
    syncNamespace,
    buildSyncPayload,
    getLastLocalChange,
    applyImportedData,
    applySyncedSettings,
    pushLog,
    onNeedSettings,
    pollSyncJob,
  ]);

  // Auto-sync interval
  const syncRef = useRef(handleSync);
  useEffect(() => {
    syncRef.current = handleSync;
  }, [handleSync]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!autoSyncEnabled) return;
    if (!redisHost) return;

    const intervalMs = Math.max(1, autoSyncIntervalMin) * 60 * 1000;
    const timer = window.setInterval(() => {
      syncRef.current('sync', { silent: true });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [autoSyncEnabled, autoSyncIntervalMin, redisHost]);

  return {
    syncStatus,
    isSyncingNow,
    handleSync,
  };
}
