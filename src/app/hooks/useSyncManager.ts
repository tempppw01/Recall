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
  getLastLocalChange: () => string | null;
  applyImportedData: (payload: any, mode: 'merge' | 'overwrite') => void;
  applySyncedSettings: (payload: any) => void;
  pushLog: (level: 'info' | 'success' | 'warning' | 'error', title: string, detail?: string, extra?: string) => void;
  onNeedSettings?: () => void;
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

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || '云同步失败');
        }
        return data;
      };

      if (action === 'pull') {
        const data = await executeRequest('pull');
        const remotePayload = data?.result?.data;
        if (remotePayload) {
          applyImportedData(remotePayload, 'merge');
          applySyncedSettings(remotePayload);
          if (!options?.silent) {
            pushLog('success', '云同步拉取完成');
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
      const data = await executeRequest('sync');
      const remotePayload = data?.result?.data;
      if (remotePayload) {
        applyImportedData(remotePayload, 'merge');
        applySyncedSettings(remotePayload);
      } else if (!options?.silent) {
        pushLog('warning', '云同步失败', '未读取到远端数据');
      }
      if (!options?.silent) {
        pushLog('success', '云同步完成', '已完成服务端合并');
      }
    } catch (error) {
      console.error(error);
      if (!options?.silent) {
        pushLog('error', '云同步失败', String((error as Error)?.message || error));
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
