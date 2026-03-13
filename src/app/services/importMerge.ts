export function normalizeImportList<T extends { id: string }>(items: T[] | undefined) {
  return Array.isArray(items) ? items.filter((item) => item && item.id) : [];
}

export function ensureUpdatedAt<T extends { updatedAt?: string; createdAt?: string }>(items: T[]) {
  return items.map((item) => ({
    ...item,
    updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
  }));
}

export function mergeById<T extends { id: string; updatedAt?: string }>(current: T[], incoming: T[]) {
  const merged = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => {
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, item);
      return;
    }
    const existingUpdated = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
    const incomingUpdated = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
    merged.set(item.id, incomingUpdated >= existingUpdated ? item : existing);
  });
  return Array.from(merged.values());
}
