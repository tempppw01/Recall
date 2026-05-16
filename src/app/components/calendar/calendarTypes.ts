export type CalendarViewMode =
  | 'year'
  | 'month'
  | 'week'
  | 'day'
  | 'agenda'
  | 'multiDay'
  | 'multiWeek';

export const CALENDAR_VIEW_OPTIONS: Array<{
  value: CalendarViewMode;
  label: string;
  shortLabel: string;
}> = [
  { value: 'day', label: '日视图', shortLabel: '日' },
  { value: 'week', label: '周视图', shortLabel: '周' },
  { value: 'month', label: '月视图', shortLabel: '月' },
  { value: 'year', label: '年视图', shortLabel: '年' },
  { value: 'agenda', label: '日程视图', shortLabel: '日程' },
  { value: 'multiDay', label: '多日视图', shortLabel: '3日' },
  { value: 'multiWeek', label: '多周视图', shortLabel: '2周' },
];

export const getCalendarViewLabel = (view: CalendarViewMode) => (
  CALENDAR_VIEW_OPTIONS.find((option) => option.value === view)?.label ?? '日视图'
);

export const getCalendarViewShortLabel = (view: CalendarViewMode) => (
  CALENDAR_VIEW_OPTIONS.find((option) => option.value === view)?.shortLabel ?? '日'
);
