export function buildExportPayload(params: {
  appVersion: string;
  tasks: any[];
  habits: any[];
  countdowns: any[];
  deletedTasks: Record<string, string>;
  deletedCountdowns: Record<string, string>;
  deletedHabits: Record<string, string>;
}) {
  const {
    appVersion,
    tasks,
    habits,
    countdowns,
    deletedTasks,
    deletedCountdowns,
    deletedHabits,
  } = params;

  return {
    version: appVersion,
    exportedAt: new Date().toISOString(),
    data: {
      tasks,
      habits,
      countdowns,
    },
    deletions: {
      tasks: deletedTasks,
      countdowns: deletedCountdowns,
      habits: deletedHabits,
    },
  };
}

export function buildSyncPayload(params: {
  appVersion: string;
  tasks: any[];
  habits: any[];
  countdowns: any[];
  deletedTasks: Record<string, string>;
  deletedCountdowns: Record<string, string>;
  deletedHabits: Record<string, string>;
  settings: Record<string, any>;
  secrets: Record<string, any>;
}) {
  const {
    appVersion,
    tasks,
    habits,
    countdowns,
    deletedTasks,
    deletedCountdowns,
    deletedHabits,
    settings,
    secrets,
  } = params;

  return {
    version: appVersion,
    exportedAt: new Date().toISOString(),
    data: {
      tasks,
      habits,
      countdowns,
    },
    deletions: {
      tasks: deletedTasks,
      countdowns: deletedCountdowns,
      habits: deletedHabits,
    },
    settings,
    secrets,
  };
}
