import { useEffect, useRef } from 'react';

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

/**
 * PG 引导同步（bootstrap）
 *
 * 重要：该 hook 会触发 setState（setTasks/setHabits/setCountdowns），因此不能把 pushLog / setter 本身作为 useEffect 依赖，
 * 否则会在每次 render 时反复触发，导致“日志里一直在连接 PG 数据库”。
 *
 * 这里采用 ref 保存外部函数，并将 effect 依赖收敛到 PG 配置本身。
 */
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

  const pushLogRef = useRef(pushLog);
  const setTasksRef = useRef(setTasks);
  const setHabitsRef = useRef(setHabits);
  const setCountdownsRef = useRef(setCountdowns);

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
              pushLogRef.current('info', 'PG 数据库为空', '正在上传本地数据...');
              Promise.all(
                localTasks.map((task) =>
                  fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...headers },
                    body: JSON.stringify(task),
                  }),
                ),
              )
                .then(() => pushLogRef.current('success', '本地数据已上传至 PG'))
                .catch((error) => pushLogRef.current('error', '上传失败', String(error)));
            } else {
              const { merged, hasChange } = mergeData(localTasks, remoteTasks as TTask[]);
              if (hasChange || localTasks.length !== merged.length) {
                taskStore.replaceAll(merged);
                setTasksRef.current(merged);
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
              setHabitsRef.current(merged);
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
              setCountdownsRef.current(merged);
            }
          }
        }

        pushLogRef.current('success', '已连接 PG 数据库', `Host: ${pgHost}`);
      } catch (error) {
        console.error('Failed to load from PG', error);
        pushLogRef.current('error', 'PG 连接/加载失败', String(error));
      }
    };

    loadFromPg();
  }, [enabled, pgHost, pgPort, pgDatabase, pgUsername, pgPassword, taskStore, habitStore, countdownStore]);
}
