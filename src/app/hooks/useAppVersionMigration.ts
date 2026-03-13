import { useEffect } from 'react';

/**
 * 将 app version 写入 localStorage，并在版本变化时触发一次迁移回调。
 * 目的：把 page.tsx 里的版本迁移逻辑收敛成一个小 hook。
 */
export function useAppVersionMigration(params: {
  appVersion: string;
  storageKey: string;
  onMigrate?: (fromVersion: string | null, toVersion: string) => void;
}) {
  const { appVersion, storageKey, onMigrate } = params;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const cachedVersion = window.localStorage.getItem(storageKey);
      if (cachedVersion !== appVersion) {
        onMigrate?.(cachedVersion, appVersion);
        window.localStorage.setItem(storageKey, appVersion);
      }
    } catch (error) {
      console.error('Failed to migrate localStorage version', error);
    }
  }, [appVersion, storageKey, onMigrate]);
}
