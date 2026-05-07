import type { RepeatType, TaskRepeatRule } from '@/lib/store';

const REPEAT_TYPES: RepeatType[] = ['none', 'daily', 'weekly', 'monthly', 'custom'];
const WEEKDAY_MAP: Record<string, number> = {
  '0': 0,
  '7': 0,
  日: 0,
  天: 0,
  七: 0,
  '1': 1,
  一: 1,
  '2': 2,
  二: 2,
  两: 2,
  '3': 3,
  三: 3,
  '4': 4,
  四: 4,
  '5': 5,
  五: 5,
  '6': 6,
  六: 6,
};

const CHINESE_NUMBER_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

const normalizeWeekday = (value: unknown) => {
  const key = String(value ?? '').trim();
  if (key in WEEKDAY_MAP) return WEEKDAY_MAP[key];
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  const rounded = Math.round(numeric);
  return rounded >= 0 && rounded <= 6 ? rounded : undefined;
};

const getWeekdayFromDueDate = (dueDate?: string) => {
  if (!dueDate) return undefined;
  const date = new Date(dueDate);
  return Number.isNaN(date.getTime()) ? undefined : date.getDay();
};

const getMonthDayFromDueDate = (dueDate?: string) => {
  if (!dueDate) return undefined;
  const date = new Date(dueDate);
  return Number.isNaN(date.getTime()) ? undefined : date.getDate();
};

const uniqueWeekdays = (weekdays: number[]) => (
  weekdays.filter((weekday, index) => weekdays.indexOf(weekday) === index)
);

const buildWeekdayRange = (start: number, end: number) => {
  const weekdays: number[] = [];
  let current = start;
  for (let guard = 0; guard < 7; guard += 1) {
    weekdays.push(current);
    if (current === end) break;
    current = (current + 1) % 7;
  }
  return weekdays;
};

const parsePositiveInt = (value: string) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.round(numeric);
  return CHINESE_NUMBER_MAP[value] ?? undefined;
};

export function normalizeTaskRepeatRule(value: unknown, dueDate?: string): TaskRepeatRule | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Partial<TaskRepeatRule>;
  const type = REPEAT_TYPES.includes(source.type as RepeatType) ? source.type : 'none';
  if (!type || type === 'none') return undefined;

  if (type === 'daily') return { type: 'daily' };

  if (type === 'weekly') {
    const weekdays = uniqueWeekdays(
      (Array.isArray(source.weekdays) ? source.weekdays : [])
        .map(normalizeWeekday)
        .filter((weekday): weekday is number => typeof weekday === 'number'),
    );
    const fallbackWeekday = getWeekdayFromDueDate(dueDate);
    return {
      type: 'weekly',
      weekdays: weekdays.length > 0
        ? weekdays
        : typeof fallbackWeekday === 'number'
          ? [fallbackWeekday]
          : undefined,
    };
  }

  if (type === 'monthly') {
    const monthDay = Number.isFinite(Number(source.monthDay))
      ? Math.max(1, Math.min(31, Math.round(Number(source.monthDay))))
      : getMonthDayFromDueDate(dueDate);
    return { type: 'monthly', monthDay };
  }

  const interval = Number.isFinite(Number(source.interval))
    ? Math.max(1, Math.round(Number(source.interval)))
    : 1;
  return { type: 'custom', interval };
}

export function inferRepeatRuleFromText(text: string, dueDate?: string): TaskRepeatRule | undefined {
  const source = text.trim();
  if (!source) return undefined;

  const customMatch = source.match(/每(?:隔)?\s*([0-9一二两三四五六七八九十]+)\s*(?:天|日)/);
  if (customMatch && !/(每天|每日|天天)/.test(source)) {
    const interval = parsePositiveInt(customMatch[1]);
    if (interval && interval > 1) return { type: 'custom', interval };
  }

  if (/(每周|每星期|每个星期|周[一二三四五六日天]|星期[一二三四五六日天]|工作日|周末)/.test(source)) {
    let weekdays: number[] = [];
    const rangeMatch = source.match(/(?:每周|每星期|每个星期|周|星期)?([一二三四五六日天])\s*(?:到|至|-|~)\s*(?:周|星期)?([一二三四五六日天])/);
    if (rangeMatch) {
      const start = normalizeWeekday(rangeMatch[1]);
      const end = normalizeWeekday(rangeMatch[2]);
      if (typeof start === 'number' && typeof end === 'number') weekdays = buildWeekdayRange(start, end);
    } else if (/工作日/.test(source)) {
      weekdays = [1, 2, 3, 4, 5];
    } else if (/周末/.test(source)) {
      weekdays = [0, 6];
    } else {
      const weeklySegment = source.match(/(?:每周|每星期|每个星期)([^，。；;,.]*)/)?.[1];
      const matches = weeklySegment
        ? weeklySegment.match(/[一二三四五六日天]/g)
        : Array.from(source.matchAll(/(?:周|星期)([一二三四五六日天])/g)).map((match) => match[1]);
      weekdays = uniqueWeekdays((matches ?? [])
        .map(normalizeWeekday)
        .filter((weekday): weekday is number => typeof weekday === 'number'));
    }

    const fallbackWeekday = getWeekdayFromDueDate(dueDate);
    return {
      type: 'weekly',
      weekdays: weekdays.length > 0
        ? uniqueWeekdays(weekdays)
        : typeof fallbackWeekday === 'number'
          ? [fallbackWeekday]
          : undefined,
    };
  }

  if (/(每天|每日|天天)/.test(source)) return { type: 'daily' };

  if (/(每月|每个月)/.test(source)) {
    return { type: 'monthly', monthDay: getMonthDayFromDueDate(dueDate) };
  }

  return undefined;
}
