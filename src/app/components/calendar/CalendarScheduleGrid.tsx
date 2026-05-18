import type { Task } from '@/lib/store';
import { formatZonedTime, getTimezoneOffset, parseDateKey } from '@/app/homeUtils';
import { getCalendarTaskTone } from '@/app/components/calendar/calendarTheme';

type CalendarScheduleGridProps = {
  dateKeys: string[];
  tasksByDate: Record<string, Task[]>;
  todayKey: string;
  calendarNotes?: Record<string, string>;
  visibleStartHour: number;
  visibleEndHour: number;
  onSelectDate?: (dateKey: string) => void;
  onSelectTask?: (task: Task) => void;
};

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const getHourBuckets = (tasks: Task[]) => {
  const buckets: Record<number, Task[]> = {};
  tasks.forEach((task) => {
    if (!task.dueDate) return;
    const zoned = new Date(new Date(task.dueDate).getTime() + (getTimezoneOffset(task) * 60 * 1000));
    const hour = zoned.getUTCHours();
    buckets[hour] = buckets[hour] ? [...buckets[hour], task] : [task];
  });
  Object.keys(buckets).forEach((key) => {
    buckets[Number(key)].sort((left, right) => {
      const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : 0;
      const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : 0;
      return leftTime - rightTime;
    });
  });
  return buckets;
};

export default function CalendarScheduleGrid({
  dateKeys,
  tasksByDate,
  todayKey,
  calendarNotes,
  visibleStartHour,
  visibleEndHour,
  onSelectDate,
  onSelectTask,
}: CalendarScheduleGridProps) {
  const hours = Array.from(
    { length: visibleEndHour - visibleStartHour + 1 },
    (_, index) => visibleStartHour + index,
  );
  const hasAnyTask = dateKeys.some((dateKey) => (tasksByDate[dateKey] || []).length > 0);
  const timeColumnWidth = dateKeys.length <= 3 ? 64 : 52;

  return (
    <div className="overflow-hidden rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/92 shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
      <div
        className="grid min-w-0"
        style={{ gridTemplateColumns: `${timeColumnWidth}px repeat(${dateKeys.length}, minmax(0, 1fr))` }}
      >
        <div className="sticky left-0 z-[6] border-b border-r border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]/96 backdrop-blur" />
        {dateKeys.map((dateKey) => {
          const date = parseDateKey(dateKey);
          const isToday = dateKey === todayKey;
          return (
            <button
              key={`header-${dateKey}`}
              type="button"
              onClick={() => onSelectDate?.(dateKey)}
              className={`relative z-[1] flex min-h-[58px] min-w-0 flex-col items-start justify-center gap-0.5 border-b border-r border-[color:var(--ui-border-soft)] px-1.5 text-left backdrop-blur transition-colors last:border-r-0 sm:min-h-[64px] sm:px-3 ${
                isToday
                  ? 'bg-[rgba(var(--theme-accent),0.14)]'
                  : 'bg-[color:var(--ui-surface-1)]/96 hover:bg-[color:var(--ui-hover-bg)]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                <span className={`text-lg font-semibold sm:text-xl ${isToday ? 'text-[rgba(var(--theme-accent),0.96)]' : 'text-[color:var(--ui-text-strong)]'}`}>
                  {date.getDate()}
                </span>
                <span className="truncate text-[11px] text-[color:var(--ui-text-secondary)] sm:text-sm">{WEEKDAY_LABELS[date.getDay()]}</span>
              </div>
              {calendarNotes?.[dateKey] && (
                <span className="max-w-full truncate text-[11px] text-emerald-300/90">{calendarNotes[dateKey]}</span>
              )}
            </button>
          );
        })}

        {hours.map((hour) => (
          <div key={`hour-${hour}`} className="contents">
            <div className="sticky left-0 z-[5] flex min-h-[72px] items-start justify-end border-b border-r border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]/94 px-1.5 py-2.5 text-[10px] text-[color:var(--ui-text-secondary)] backdrop-blur sm:min-h-[82px] sm:px-3 sm:text-[12px]">
              {String(hour).padStart(2, '0')}:00
            </div>
            {dateKeys.map((dateKey) => {
              const dayBuckets = getHourBuckets(tasksByDate[dateKey] || []);
              const bucket = dayBuckets[hour] || [];
              return (
                <div
                  key={`${dateKey}-${hour}`}
                  className="min-h-[72px] min-w-0 border-b border-r border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-0)]/80 px-1 py-1.5 last:border-r-0 sm:min-h-[82px] sm:px-2 sm:py-2"
                >
                  <div className="space-y-1">
                    {bucket.map((task) => {
                      const tone = getCalendarTaskTone(task);
                      const timeLabel = task.dueDate ? formatZonedTime(task.dueDate, getTimezoneOffset(task)) : '未设时间';
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => onSelectTask?.(task)}
                          className="w-full min-w-0 rounded-[14px] border px-1.5 py-1.5 text-left transition-transform hover:-translate-y-[1px] sm:rounded-[16px] sm:px-2.5 sm:py-2"
                          style={{
                            background: tone.background,
                            borderColor: tone.border,
                            color: tone.text,
                            boxShadow: tone.shadow,
                          }}
                        >
                          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2"
                              style={{ background: tone.dot }}
                            />
                            <span className="truncate text-[11px] font-medium sm:text-[13px]">{task.title}</span>
                          </div>
                          <div className="mt-0.5 truncate text-[10px] opacity-85 sm:mt-1 sm:text-[11px]">{timeLabel}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!hasAnyTask && (
        <div className="flex min-h-[14rem] items-center justify-center text-sm text-[color:var(--ui-text-secondary)]">
          这个时间范围里还没有任务安排
        </div>
      )}
    </div>
  );
}
