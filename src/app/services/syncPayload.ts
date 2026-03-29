export function buildExportPayload(params: {
  appVersion: string;
  tasks: any[];
  habits: any[];
  countdowns: any[];
  items: any[];
  deletedTasks: Record<string, string>;
  deletedCountdowns: Record<string, string>;
  deletedHabits: Record<string, string>;
  deletedItems: Record<string, string>;
}) {
  const {
    appVersion,
    tasks,
    habits,
    countdowns,
    items,
    deletedTasks,
    deletedCountdowns,
    deletedHabits,
    deletedItems,
  } = params;

  return {
    version: appVersion,
    exportedAt: new Date().toISOString(),
    data: {
      tasks,
      habits,
      countdowns,
      items,
    },
    deletions: {
      tasks: deletedTasks,
      countdowns: deletedCountdowns,
      habits: deletedHabits,
      items: deletedItems,
    },
  };
}

export function buildSyncPayload(params: {
  appVersion: string;
  tasks: any[];
  habits: any[];
  countdowns: any[];
  items: any[];
  deletedTasks: Record<string, string>;
  deletedCountdowns: Record<string, string>;
  deletedHabits: Record<string, string>;
  deletedItems: Record<string, string>;
  settings: Record<string, any>;
  secrets: Record<string, any>;
}) {
  const {
    appVersion,
    tasks,
    habits,
    countdowns,
    items,
    deletedTasks,
    deletedCountdowns,
    deletedHabits,
    deletedItems,
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
      items,
    },
    deletions: {
      tasks: deletedTasks,
      countdowns: deletedCountdowns,
      habits: deletedHabits,
      items: deletedItems,
    },
    settings,
    secrets,
  };
}
