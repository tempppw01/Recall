const TASK_STATUSES = ['todo', 'in_progress', 'completed'] as const;

export type TaskStatusValue = (typeof TASK_STATUSES)[number];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeNullableString = (value: unknown) => {
  const normalized = normalizeString(value);
  return normalized || null;
};

const normalizeOptionalId = (value: unknown) => {
  const normalized = normalizeString(value);
  return normalized || undefined;
};

const normalizeDate = (value: unknown) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => normalizeString(item))
        .filter(Boolean)
    : [];

const normalizeObjectArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value
        .filter((item) => isPlainObject(item))
    : [];

const normalizeTaskStatus = (value: unknown): TaskStatusValue =>
  TASK_STATUSES.includes(value as TaskStatusValue) ? (value as TaskStatusValue) : 'todo';

export const normalizeTaskPayload = (payload: any) => ({
  id: normalizeOptionalId(payload?.id),
  title: normalizeString(payload?.title),
  dueDate: normalizeDate(payload?.dueDate),
  priority: normalizeInt(payload?.priority, 0),
  category: normalizeNullableString(payload?.category),
  status: normalizeTaskStatus(payload?.status),
  sortOrder: normalizeInt(payload?.sortOrder, 0),
  tags: normalizeStringArray(payload?.tags),
  subtasks: normalizeObjectArray(payload?.subtasks),
  attachments: normalizeObjectArray(payload?.attachments),
  repeat: isPlainObject(payload?.repeat) ? payload.repeat : null,
  createdAt: normalizeDate(payload?.createdAt) ?? undefined,
});

export const normalizeHabitPayload = (payload: any) => ({
  id: normalizeOptionalId(payload?.id),
  title: normalizeString(payload?.title),
  logs: normalizeObjectArray(payload?.logs),
  createdAt: normalizeDate(payload?.createdAt) ?? undefined,
});

export const normalizeCountdownPayload = (payload: any) => ({
  id: normalizeOptionalId(payload?.id),
  title: normalizeString(payload?.title),
  targetDate: normalizeDate(payload?.targetDate),
  pinned: Boolean(payload?.pinned),
  createdAt: normalizeDate(payload?.createdAt) ?? undefined,
});
