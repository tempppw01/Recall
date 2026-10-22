/** 滴答清单风格的共享格式化工具：日期标签与优先级描边色。 */

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export const TICK_DUE_RED = '#e03131';
export const TICK_DUE_BLUE = '#4772fa';

/**
 * 滴答清单风格的任务日期标签：今天 / 明天 / 昨天 / 周三 / 10月21日。
 * tone: soon = 未来日期（蓝），late = 已过期（红）。
 */
export const formatTickDueLabel = (
  dueDate?: string,
  offsetMinutes?: number,
  nowMs?: number,
): { text: string; tone: 'soon' | 'late' | 'normal'; hasTime: boolean } | null => {
  if (!dueDate) return null;
  const dueMs = new Date(dueDate).getTime();
  if (!Number.isFinite(dueMs)) return null;

  const offset = offsetMinutes ?? 0;
  const dueZoned = new Date(dueMs + offset * MINUTE_MS);
  const nowZoned = new Date((nowMs ?? Date.now()) + offset * MINUTE_MS);

  const dueDayKey = Date.UTC(dueZoned.getUTCFullYear(), dueZoned.getUTCMonth(), dueZoned.getUTCDate());
  const nowDayKey = Date.UTC(nowZoned.getUTCFullYear(), nowZoned.getUTCMonth(), nowZoned.getUTCDate());
  const dayDiff = Math.round((dueDayKey - nowDayKey) / DAY_MS);

  const hours = dueZoned.getUTCHours();
  const minutes = dueZoned.getUTCMinutes();
  const hasTime = hours !== 0 || minutes !== 0;
  const sameYear = dueZoned.getUTCFullYear() === nowZoned.getUTCFullYear();

  let text: string;
  if (dayDiff === 0) text = '今天';
  else if (dayDiff === 1) text = '明天';
  else if (dayDiff === -1) text = '昨天';
  else if (dayDiff > 1 && dayDiff <= 7) text = WEEKDAY_LABELS[dueZoned.getUTCDay()];
  else if (sameYear) text = `${dueZoned.getUTCMonth() + 1}月${dueZoned.getUTCDate()}日`;
  else text = `${dueZoned.getUTCFullYear()}年${dueZoned.getUTCMonth() + 1}月${dueZoned.getUTCDate()}日`;

  const tone: 'soon' | 'late' | 'normal' = dayDiff < 0 ? 'late' : 'soon';

  return { text, tone, hasTime };
};

/** 滴答清单优先级描边色：高=红、中=橙，低优先级保持中性描边。 */
export const priorityBorderColor = (priority: number) => {
  if (priority >= 2) return '#e13e39';
  if (priority === 1) return '#faa80c';
  return null;
};
