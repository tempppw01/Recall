import { useEffect, useRef } from 'react';

const PG_BOOTSTRAP_PAGE_SIZE = 200;

type ItemBase = { id: string; updatedAt?: string; createdAt?: string };

type UsePgBootstrapSyncParams<
  TTask extends ItemBase,
  THabit extends ItemBase,
  TCountdown extends ItemBase,
  TItem extends ItemBase,
> = {
  enabled: boolean;
  pgHost: string;
  pgPort: string;
  pgDatabase: string;
  pgUsername: string;
  pgPassword: string;
  pushLog: (level: 'info' | 'success' | 'warning' | 'error', title: string, detail?: string) => void;
  taskStore: {
    getAll: () => TTask[];
    replaceAll: (items: TTask[]) => void;
  };
  habitStore: {
    getAll: () => THabit[];
    replaceAll: (items: THabit[]) => void;
  };
  countdownStore: {
    getAll: () => TCountdown[];
    replaceAll: (items: TCountdown[]) => void;
  };
  itemStore: {
    getAll: () => TItem[];
    replaceAll: (items: TItem[]) => void;
  };
  setTasks: (items: TTask[]) => void;
  setHabits: (items: THabit[]) => void;
  setCountdowns: (items: TCountdown[]) => void;
  setItems: (items: TItem[]) => void;
};

const mergeData = <T extends ItemBase>(local: T[], remote: T[]) => {
  const map = new Map<string, T>();
  local.forEach((item) => map.set(item.id, item));

  let hasChange = false;
  remote.forEach((item) => {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      hasChange = true;
      return;
    }

    const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
    const remoteTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
    if (remoteTime > localTime) {
      map.set(item.id, item);
      hasChange = true;
    }
  });

  return { merged: Array.from(map.values()), hasChange };
};

export function usePgBootstrapSync<
  TTask extends ItemBase,
  THabit extends ItemBase,
  TCountdown extends ItemBase,
  TItem extends ItemBase,
>(params: UsePgBootstrapSyncParams<TTask, THabit, TCountdown, TItem>) {
  const {
    enabled,
    pgHost,
    pgPort,
    pgDatabase,
    pgUsername,
    pgPassword,
    pushLog,
    taskStore,
    habitStore,
    countdownStore,
    itemStore,
    setTasks,
    setHabits,
    setCountdowns,
    setItems,
  } = params;

  const pushLogRef = useRef(pushLog);
  const setTasksRef = useRef(setTasks);
  const setHabitsRef = useRef(setHabits);
  const setCountdownsRef = useRef(setCountdowns);
  const setItemsRef = useRef(setItems);

  useEffect(() => {
    pushLogRef.current = pushLog;
  }, [pushLog]);
  useEffect(() => {
    setTasksRef.current = setTasks;
  }, [setTasks]);
  useEffect(() => {
    setHabitsRef.current = setHabits;
  }, [setHabits]);
  useEffect(() => {
    setCountdownsRef.current = setCountdowns;
  }, [setCountdowns]);
  useEffect(() => {
    setItemsRef.current = setItems;
  }, [setItems]);

  const lastRunKeyRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !pgHost) return;

    const key = [pgHost, pgPort || '5432', pgDatabase, pgUsername].join('|');
    if (lastRunKeyRef.current === key) {
      return;
    }
    lastRunKeyRef.current = key;

    const headers = {
      'x-pg-host': pgHost,
      'x-pg-port': pgPort || '5432',
      'x-pg-database': pgDatabase,
      'x-pg-username': pgUsername,
      'x-pg-password': pgPassword,
    };

    const fetchAllPages = async <T>(endpoint: string) => {
      let offset = 0;
      const items: T[] = [];

      while (true) {
        const separator = endpoint.includes('?') ? '&' : '?';
        const response = await fetch(
          `${endpoint}${separator}limit=${PG_BOOTSTRAP_PAGE_SIZE}&offset=${offset}`,
          { headers },
        );

        if (!response.ok) {
          throw new Error(`${endpoint} request failed: ${response.status}`);
        }

        const payload = await response.json();
        if (Array.isArray(payload)) {
          return payload as T[];
        }

        const pageItems = Array.isArray(payload?.items) ? (payload.items as T[]) : [];
        items.push(...pageItems);

        const nextOffset =
          typeof payload?.page?.nextOffset === 'number' ? payload.page.nextOffset : null;

        if (!payload?.page?.hasMore || nextOffset === null) {
          return items;
        }

        offset = nextOffset;
      }
    };

    const uploadLocalCollection = async <T>(endpoint: string, items: T[]) => {
      await Promise.all(
        items.map((item) =>
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(item),
          }),
        ),
      );
    };

    const loadFromPg = async () => {
      try {
        const [remoteTasks, remoteHabits, remoteCountdowns, remoteItems] = await Promise.all([
          fetchAllPages<TTask>('/api/tasks'),
          fetchAllPages<THabit>('/api/habits'),
          fetchAllPages<TCountdown>('/api/countdowns'),
          fetchAllPages<TItem>('/api/items'),
        ]);

        const localTasks = taskStore.getAll();
        if (remoteTasks.length === 0 && localTasks.length > 0) {
          pushLogRef.current('info', 'PG database is empty', 'Uploading local task data...');
          uploadLocalCollection('/api/tasks', localTasks)
            .then(() => pushLogRef.current('success', 'Local tasks synced to PG'))
            .catch((error) => pushLogRef.current('error', 'Task upload failed', String(error)));
        } else {
          const { merged, hasChange } = mergeData(localTasks, remoteTasks);
          if (hasChange || localTasks.length !== merged.length) {
            taskStore.replaceAll(merged);
            setTasksRef.current(merged);
          }
        }

        const localHabits = habitStore.getAll();
        if (remoteHabits.length === 0 && localHabits.length > 0) {
          uploadLocalCollection('/api/habits', localHabits).catch(() => undefined);
        } else {
          const { merged } = mergeData(localHabits, remoteHabits);
          habitStore.replaceAll(merged);
          setHabitsRef.current(merged);
        }

        const localCountdowns = countdownStore.getAll();
        if (remoteCountdowns.length === 0 && localCountdowns.length > 0) {
          uploadLocalCollection('/api/countdowns', localCountdowns).catch(() => undefined);
        } else {
          const { merged } = mergeData(localCountdowns, remoteCountdowns);
          countdownStore.replaceAll(merged);
          setCountdownsRef.current(merged);
        }

        const localItems = itemStore.getAll();
        if (remoteItems.length === 0 && localItems.length > 0) {
          uploadLocalCollection('/api/items', localItems).catch(() => undefined);
        } else {
          const { merged } = mergeData(localItems, remoteItems);
          itemStore.replaceAll(merged);
          setItemsRef.current(merged);
        }

        pushLogRef.current('success', 'Connected to PG database', `Host: ${pgHost}`);
      } catch (error) {
        console.error('Failed to load from PG', error);
        pushLogRef.current('error', 'PG connection or load failed', String(error));
      }
    };

    void loadFromPg();
  }, [enabled, pgHost, pgPort, pgDatabase, pgUsername, pgPassword, taskStore, habitStore, countdownStore, itemStore]);
}
