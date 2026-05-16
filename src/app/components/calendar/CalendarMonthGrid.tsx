import type { Task } from '@/lib/store';
import { formatZonedTime, getTimezoneOffset } from '@/app/homeUtils';
import { getCalendarTaskTone } from '@/app/components/calendar/calendarTheme';

export type CalendarGridCell = {
  dateKey: string | null;
  dayLabel?: string;
  inCurrentMonth?: boolean;
};

type CalendarMonthGridProps = {
  cells: CalendarGridCell[];
  weekdayLabels: string[];
  selectedDateKey: string;
  todayKey: string;
  calendarNotes: Record<string, string>;
  tasksByDate: Record<string, Task[]>;
  onSelectDate: (dateKey: string) => void;
  maxEventsPerDay?: number;
  dense?: boolean;
  showNotesInActiveWeekOnly?: boolean;
};

export default function CalendarMonthGrid({
  cells,
  weekdayLabels,
  selectedDateKey,
  todayKey,
  calendarNotes,
  tasksByDate,
  onSelectDate,
  maxEventsPerDay = 3,
  dense = false,
  showNotesInActiveWeekOnly = false,
}: CalendarMonthGridProps) {
  const anchorDateKey = selectedDateKey || todayKey;
  const anchorIndex = cells.findIndex((cell) => cell.dateKey === anchorDateKey);
  const activeWeekIndex = anchorIndex >= 0 ? Math.floor(anchorIndex / 7) : -1;

  return (
    <div className="overflow-x-auto rounded-[28px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/92 shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
      <div className={`grid min-w-[920px] grid-cols-7 ${dense ? '' : ''}`}>
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="border-b border-r border-[color:var(--ui-border-soft)] px-3 py-3 text-center text-[12px] text-[color:var(--ui-text-secondary)] last:border-r-0"
          >
            {label}
          </div>
        ))}

        {cells.map((cell, index) => {
          if (!cell.dateKey) {
            return (
              <div
                key={`empty-${index}`}
                className={`border-b border-r border-[color:var(--ui-border-soft)] last:border-r-0 ${
                  dense ? 'min-h-[8rem]' : 'min-h-[9.75rem]'
                } bg-[color:var(--ui-surface-0)]/36`}
              />
            );
          }

          const tasks = [...(tasksByDate[cell.dateKey] || [])].sort((left, right) => {
            const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : 0;
            const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : 0;
            return leftTime - rightTime;
          });
          const overflowCount = Math.max(0, tasks.length - maxEventsPerDay);
          const note = calendarNotes[cell.dateKey];
          const weekIndex = Math.floor(index / 7);
          const showNote = note && (!showNotesInActiveWeekOnly || activeWeekIndex === weekIndex);
          const isToday = cell.dateKey === todayKey;
          const isSelected = cell.dateKey === selectedDateKey;
          const isOutside = cell.inCurrentMonth === false;

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => onSelectDate(cell.dateKey as string)}
              className={`flex flex-col border-b border-r border-[color:var(--ui-border-soft)] px-3 py-2.5 text-left transition-colors last:border-r-0 ${
                dense ? 'min-h-[8rem]' : 'min-h-[9.75rem]'
              } ${
                isSelected
                  ? 'bg-[rgba(var(--theme-accent),0.12)]'
                  : isToday
                    ? 'bg-[rgba(var(--theme-accent),0.08)]'
                    : 'bg-[color:var(--ui-surface-0)]/74 hover:bg-[color:var(--ui-hover-bg)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className={`text-[13px] font-semibold ${
                    isSelected
                      ? 'text-[rgba(var(--theme-accent),0.98)]'
                      : isToday
                        ? 'text-[color:var(--ui-text-strong)]'
                        : isOutside
                          ? 'text-[color:var(--ui-text-dim)]'
                          : 'text-[color:var(--ui-text-strong)]'
                  }`}>
                    {cell.dayLabel ?? cell.dateKey.slice(-2).replace(/^0/, '')}
                  </div>
                  {showNote && (
                    <div className="mt-1 max-w-full truncate text-[10px] text-emerald-300/90">
                      {note}
                    </div>
                  )}
                </div>
                {isToday && (
                  <span className="rounded-full border border-[rgba(var(--theme-accent),0.32)] bg-[rgba(var(--theme-accent),0.16)] px-2 py-0.5 text-[10px] text-[rgba(var(--theme-accent),0.94)]">
                    今天
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-1.5">
                {tasks.slice(0, maxEventsPerDay).map((task) => {
                  const tone = getCalendarTaskTone(task);
                  const timeText = task.dueDate ? formatZonedTime(task.dueDate, getTimezoneOffset(task)) : '';
                  return (
                    <div
                      key={task.id}
                      className="rounded-[12px] border px-2.5 py-1.5"
                      style={{
                        background: tone.background,
                        borderColor: tone.border,
                        color: tone.text,
                        boxShadow: tone.shadow,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: tone.dot }}
                        />
                        <span className="truncate text-[11px] font-medium">{task.title}</span>
                      </div>
                      {timeText && (
                        <div className="mt-1 text-[10px] opacity-85">{timeText}</div>
                      )}
                    </div>
                  );
                })}

                {overflowCount > 0 && (
                  <div className="pl-1 text-[11px] text-[color:var(--ui-text-secondary)]">
                    +{overflowCount} 项安排
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
