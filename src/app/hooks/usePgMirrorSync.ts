import { useCallback } from 'react';
import { PgSyncConfig, PgSyncEntity, PgSyncMethod, syncToPg as syncToPgImpl } from '@/app/services/pgSyncClient';

export function usePgMirrorSync(params: {
  enabled: boolean;
  config: PgSyncConfig;
  pushLog: (level: 'info' | 'success' | 'warning' | 'error', title: string, detail?: string) => void;
}) {
  const { enabled, config, pushLog } = params;

  const syncToPg = useCallback(
    async (type: PgSyncEntity, method: PgSyncMethod, data: any) => {
      if (!enabled) return;
      if (!config.pgHost) return;
      try {
        await syncToPgImpl({ config, type, method, data });
      } catch (error) {
        console.error(`Failed to sync ${type} to PG`, error);
        pushLog('error', 'PG 同步失败', String(error));
      }
    },
    [enabled, config, pushLog],
  );

  return { syncToPg };
}
