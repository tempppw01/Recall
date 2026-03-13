import { useEffect } from 'react';

type ItemBase = { id: string; updatedAt?: string; createdAt?: string };

type UsePgBootstrapSyncParams<TTask extends ItemBase, THabit extends ItemBase, TCountdown extends ItemBase> = {
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
  setTasks: (items: TTask[]) => void;
  setHabits: (items: THabit[]) => void;
  setCountdowns: (items: TCountdown[]) => void;
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

export function usePgBootstrapSync<TTask extends ItemBase, THabit extends ItemBase, TCountdown extends ItemBase>(
  params: UsePgBootstrapSyncParams<TTask, THabit, TCountdown>,
) {
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
    setTasks,
    setHabits,
    setCountdowns,
  } = params;

  useEffect(() => {
    if (!enabled || !pgHost) return;

    const headers = {
      'x-pg-host': pgHost,
      'x-pg-port': pgPort || '5432',
      'x-pg-database': pgDatabase,
      'x-pg-username': pgUsername,
      'x-pg-password': pgPassword,
    };

    const loadFromPg = async () => {
      try {
        const [tasksRes, habitsRes, countdownsRes] = await Promise.all([
          fetch('/api/tasks', { headers }),
          fetch('/api/habits', { headers }),
          fetch('/api/countdowns', { headers }),
        ]);

        if (tasksRes.ok) {
          const remoteTasks = await tasksRes.json();
          if (Array.isArray(remoteTasks)) {
            const localTasks = taskStore.getAll();
            if (remoteTasks.length === 0 && localTasks.length > 0) {
              pushLog('info', 'PG 数据库为空', '正在上传本地数据...');
              Promise.all(
                localTasks.map((task) =>
                  fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...headers },
                    body: JSON.stringify(task),
                  }),
                ),
              )
                .then(() => pushLog('success', '本地数据已上传至 PG'))
                .catch((error) => pushLog('error', '上传失败', String(error)));
            } else {
              const { merged, hasChange } = mergeData(localTasks, remoteTasks as TTask[]);
              if (hasChange || localTasks.length !== merged.length) {
                taskStore.replaceAll(merged);
                setTasks(merged);
              }
            }
          }
        }

        if (habitsRes.ok) {
          const remoteHabits = await habitsRes.json();
          if (Array.isArray(remoteHabits)) {
            const localHabits = habitStore.getAll();
            if (remoteHabits.length === 0 && localHabits.length > 0) {
              Promise.all(
                localHabits.map((habit) =>
                  fetch('/api/habits', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...headers },
                    body: JSON.stringify(habit),
                  }),
                ),
              ).catch(() => undefined);
            } else {
              const { merged } = mergeData(localHabits, remoteHabits as THabit[]);
              habitStore.replaceAll(merged);
              setHabits(merged);
            }
          }
        }

        if (countdownsRes.ok) {
          const remoteCountdowns = await countdownsRes.json();
          if (Array.isArray(remoteCountdowns)) {
            const localCountdowns = countdownStore.getAll();
            if (remoteCountdowns.length === 0 && localCountdowns.length > 0) {
              Promise.all(
                localCountdowns.map((countdown) =>
                  fetch('/api/countdowns', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...headers },
                    body: JSON.stringify(countdown),
                  }),
                ),
              ).catch(() => undefined);
            } else {
              const { merged } = mergeData(localCountdowns, remoteCountdowns as TCountdown[]);
              countdownStore.replaceAll(merged);
              setCountdowns(merged);
            }
          }
        }

        pushLog('success', '已连接 PG 数据库', `Host: ${pgHost}`);
      } catch (error) {
        console.error('Failed to load from PG', error);
        pushLog('error', 'PG 连接/加载失败', String(error));
      }
    };

    loadFromPg();
  }, [
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
    setTasks,
    setHabits,
    setCountdowns,
  ]);
}
