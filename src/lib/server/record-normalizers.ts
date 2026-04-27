import type { Prisma } from '@prisma/client';

const TASK_STATUSES = ['todo', 'in_progress', 'completed'] as const;
const ITEM_STATUSES = ['normal', 'low_stock', 'need_restock', 'missing'] as const;

export type TaskStatusValue = (typeof TASK_STATUSES)[number];
export type ItemStatusValue = (typeof ITEM_STATUSES)[number];

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

const normalizeStringArray = (value: unknown): Prisma.InputJsonValue =>
  Array.isArray(value)
    ? value
        .map((item) => normalizeString(item))
        .filter(Boolean)
        .map((item) => item as Prisma.InputJsonValue)
    : [];

const normalizeObjectArray = (value: unknown): Prisma.InputJsonValue =>
  Array.isArray(value)
    ? value
        .filter((item) => isPlainObject(item))
        .map((item) => item as Prisma.InputJsonObject)
    : [];

const normalizeTaskStatus = (value: unknown): TaskStatusValue =>
  TASK_STATUSES.includes(value as TaskStatusValue) ? (value as TaskStatusValue) : 'todo';

export const normalizeItemStatus = (value: unknown): ItemStatusValue =>
  ITEM_STATUSES.includes(value as ItemStatusValue) ? (value as ItemStatusValue) : 'normal';

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
  repeat: (isPlainObject(payload?.repeat) ? (payload.repeat as Prisma.InputJsonObject) : null),
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

export const normalizeItemPayload = (payload: any) => ({
  id: normalizeOptionalId(payload?.id),
  name: normalizeString(payload?.name),
  category: normalizeNullableString(payload?.category),
  tags: normalizeStringArray(payload?.tags),
  location: normalizeNullableString(payload?.location),
  quantity: Math.max(normalizeInt(payload?.quantity, 0), 0),
  status: normalizeItemStatus(payload?.status),
  note: normalizeNullableString(payload?.note),
  createdAt: normalizeDate(payload?.createdAt) ?? undefined,
});
