export type DeletedMap = Record<string, string>;

export function readDeletedMap(key: string): DeletedMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as DeletedMap;
  } catch (error) {
    console.error(`Failed to read deleted map for ${key}`, error);
    return {};
  }
}

export function persistDeletedMap(key: string, next: DeletedMap) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch (error) {
    console.error(`Failed to write deleted map for ${key}`, error);
  }
}

export function markDeleted(key: string, id: string, deletedAt = new Date().toISOString()) {
  const current = readDeletedMap(key);
  const existing = current[id];
  const incomingMs = new Date(deletedAt).getTime();
  const existingMs = existing ? new Date(existing).getTime() : 0;
  if (!existing || incomingMs > existingMs) {
    current[id] = deletedAt;
    persistDeletedMap(key, current);
  }
  return current;
}

export function normalizeDeletedMap(value: any): DeletedMap {
  if (Array.isArray(value)) {
    const now = new Date().toISOString();
    return value.reduce<DeletedMap>((acc, id) => {
      if (typeof id === 'string') acc[id] = now;
      return acc;
    }, {});
  }
  if (value && typeof value === 'object') {
    const next: DeletedMap = {};
    Object.entries(value as Record<string, unknown>).forEach(([id, time]) => {
      if (typeof id === 'string' && typeof time === 'string') {
        next[id] = time;
      }
    });
    return next;
  }
  return {};
}

export function mergeDeletedMap(current: DeletedMap, incoming: DeletedMap) {
  const next = { ...current };
  Object.entries(incoming).forEach(([id, time]) => {
    const incomingMs = new Date(time).getTime();
    const existingMs = next[id] ? new Date(next[id]).getTime() : 0;
    if (Number.isNaN(incomingMs)) return;
    if (!next[id] || incomingMs > existingMs) {
      next[id] = time;
    }
  });
  return next;
}

export function filterByDeletions<T extends { id: string; updatedAt?: string; createdAt: string }>(
  items: T[],
  deletedMap: DeletedMap,
) {
  const nextDeleted = { ...deletedMap };
  const filtered = items.filter((item) => {
    const deletedAt = deletedMap[item.id];
    if (!deletedAt) return true;
    const deletedMs = new Date(deletedAt).getTime();
    const updatedMs = item.updatedAt
      ? new Date(item.updatedAt).getTime()
      : new Date(item.createdAt).getTime();
    if (updatedMs > deletedMs) {
      delete nextDeleted[item.id];
      return true;
    }
    return false;
  });
  return { filtered, nextDeleted };
}
