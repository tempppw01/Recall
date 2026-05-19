import { filterOutOnboardingTasks } from '@/lib/onboardingTasks';

export function buildExportPayload(params: {
  appVersion: string;
  tasks: any[];
  habits: any[];
  countdowns: any[];
  items: any[];
  knowledgeEntries: any[];
  deletedTasks: Record<string, string>;
  deletedCountdowns: Record<string, string>;
  deletedHabits: Record<string, string>;
  deletedItems: Record<string, string>;
  deletedKnowledgeEntries: Record<string, string>;
}) {
  const {
    appVersion,
    tasks,
    habits,
    countdowns,
    items,
    knowledgeEntries,
    deletedTasks,
    deletedCountdowns,
    deletedHabits,
    deletedItems,
    deletedKnowledgeEntries,
  } = params;

  return {
    version: appVersion,
    exportedAt: new Date().toISOString(),
    data: {
      tasks: filterOutOnboardingTasks(tasks),
      habits,
      countdowns,
      items,
      knowledgeEntries,
    },
    deletions: {
      tasks: deletedTasks,
      countdowns: deletedCountdowns,
      habits: deletedHabits,
      items: deletedItems,
      knowledgeEntries: deletedKnowledgeEntries,
    },
  };
}

export function buildSyncPayload(params: {
  appVersion: string;
  tasks: any[];
  habits: any[];
  countdowns: any[];
  items: any[];
  knowledgeEntries: any[];
  deletedTasks: Record<string, string>;
  deletedCountdowns: Record<string, string>;
  deletedHabits: Record<string, string>;
  deletedItems: Record<string, string>;
  deletedKnowledgeEntries: Record<string, string>;
  settings: Record<string, any>;
  secrets: Record<string, any>;
}) {
  const {
    appVersion,
    tasks,
    habits,
    countdowns,
    items,
    knowledgeEntries,
    deletedTasks,
    deletedCountdowns,
    deletedHabits,
    deletedItems,
    deletedKnowledgeEntries,
    settings,
    secrets,
  } = params;

  return {
    version: appVersion,
    exportedAt: new Date().toISOString(),
    data: {
      tasks: filterOutOnboardingTasks(tasks),
      habits,
      countdowns,
      items,
      knowledgeEntries,
    },
    deletions: {
      tasks: deletedTasks,
      countdowns: deletedCountdowns,
      habits: deletedHabits,
      items: deletedItems,
      knowledgeEntries: deletedKnowledgeEntries,
    },
    settings,
    secrets,
  };
}
