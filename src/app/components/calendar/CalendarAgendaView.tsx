import type { Task } from '@/lib/store';
import { formatZonedTime, getTimezoneOffset, parseDateKey } from '@/app/homeUtils';
import { getCalendarTaskTone } from '@/app/components/calendar/calendarTheme';

type CalendarAgendaViewProps = {
  dateKeys: string[];
  tasksByDate: Record<string, Task[]>;
  calendarNotes?: Record<string, string>;
  onSelectTask?: (task: Task) => void;
};

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default function CalendarAgendaView({
  dateKeys,
  tasksByDate,
  calendarNotes,
  onSelectTask,
}: CalendarAgendaViewProps) {
  const sections = dateKeys
    .map((dateKey) => ({
      dateKey,
      date: parseDateKey(dateKey),
      tasks: [...(tasksByDate[dateKey] || [])].sort((left, right) => {
        const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : 0;
        const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : 0;
        return leftTime - rightTime;
      }),
    }))
    .filter((section) => section.tasks.length > 0);

  if (sections.length === 0) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/90 text-sm text-[color:var(--ui-text-secondary)]">
        近期还没有排入日程的任务
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <section
          key={section.dateKey}
          className="rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/92 p-3.5 sm:p-4"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[color:var(--ui-border-soft)] pb-3">
            <div>
              <div className="text-2xl font-semibold text-[color:var(--ui-text-strong)]">{section.date.getDate()}</div>
              <div className="text-sm text-[color:var(--ui-text-secondary)]">{WEEKDAY_LABELS[section.date.getDay()]}</div>
            </div>
            {calendarNotes?.[section.dateKey] && (
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200">
                {calendarNotes[section.dateKey]}
              </span>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {section.tasks.map((task) => {
              const tone = getCalendarTaskTone(task);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelectTask?.(task)}
                  className="flex w-full min-w-0 items-start gap-2.5 rounded-[18px] border px-3 py-2.5 text-left transition-transform hover:-translate-y-[1px] sm:gap-4 sm:px-4 sm:py-3"
                  style={{
                    background: tone.background,
                    borderColor: tone.border,
                    color: tone.text,
                    boxShadow: tone.shadow,
                  }}
                >
                  <div className="w-16 shrink-0 text-[12px] font-medium sm:w-24 sm:text-[14px]">
                    {task.dueDate ? formatZonedTime(task.dueDate, getTimezoneOffset(task)) : '未设时间'}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium">{task.title}</div>
                    {task.category && (
                      <div className="mt-1 text-[12px] opacity-80">{task.category}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
