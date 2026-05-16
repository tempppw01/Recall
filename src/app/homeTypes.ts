import type { KnowledgeEntry as StoreKnowledgeEntry, Task, TaskRepeatRule } from '@/lib/store';

export type WeatherCity = {
  id: string;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type WeatherForecast = {
  weatherCode?: number;
  tempMax?: number;
  tempMin?: number;
  weatherText?: string;
  timezone?: string;
  provider?: string;
  warning?: string;
  errors?: string[];
};

export type TaskSortMode = 'priority' | 'dueDate' | 'createdAt' | 'title' | 'manual';
export type TaskGroupMode = 'none' | 'category' | 'priority' | 'dueDate';
export type TaskGroup = { key: string; label: string; items: Task[] };
export type FutureTaskBucketKey = 'overdue' | 'today' | 'upcoming' | 'future' | 'someday' | 'completed';

export type AgentItem = {
  id: string;
  title: string;
  dueDate?: string;
  priority?: number;
  category?: string;
  tags?: string[];
  subtasks?: { title?: string }[];
  scheduleOptions?: AgentScheduleOption[];
  timeReason?: string;
  repeat?: TaskRepeatRule;
};

export type AgentScheduleOption = {
  id?: string;
  label: string;
  dueDate?: string;
  priority?: number;
  reason?: string;
};

export type AgentTaskChanges = {
  title?: string;
  dueDate?: string | null;
  priority?: number;
  category?: string | null;
  tags?: string[];
  subtasks?: { title?: string }[];
  repeat?: {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;
    weekdays?: number[];
    monthDay?: number;
  } | null;
  status?: 'todo' | 'in_progress' | 'completed';
  pinned?: boolean;
};

export type AgentDecisionType = 'create' | 'update' | 'delete' | 'reuse' | 'skip' | 'blocked';

export type AgentDecision = {
  id: string;
  type: AgentDecisionType;
  reason?: string;
  taskId?: string;
  taskTitle?: string;
  blockedByTaskIds?: string[];
  blockedByTaskTitles?: string[];
  item?: AgentItem;
  changes?: AgentTaskChanges;
};

export type CountdownAgentItem = {
  id: string;
  title: string;
  targetDate?: string;
};

export type HabitAgentItem = {
  id: string;
  title: string;
  checkInDueDate?: string;
  reason?: string;
  frequency?: string;
  category?: string;
  priority?: number;
};

export type AgentMessage = {
  role: 'user' | 'assistant';
  content: string;
  knowledgeRefs?: KnowledgeReference[];
  variant?: 'error';
};

export type KnowledgeReference = Pick<KnowledgeEntry, 'id' | 'title' | 'content' | 'category'> & {
  strategy?: string;
};

export type KnowledgeEntry = StoreKnowledgeEntry;

export type UserMemory = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ManageAgentMessage = {
  role: 'user' | 'assistant';
  content: string;
  knowledgeRefs?: KnowledgeReference[];
};

export type ImageAttachment = {
  id: string;
  file: File;
  dataUrl: string;
};

export type CountdownDisplayMode = 'days' | 'date';
export type AiAssistantMode = 'chat' | 'record' | 'manage';
export type ManageAgentFilter = 'all' | 'todo' | 'today' | 'overdue';

export type StatusFeedback = {
  id: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
};
