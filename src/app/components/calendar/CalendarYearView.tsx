import type { Task } from '@/lib/store';
import { parseDateKey } from '@/app/homeUtils';

type CalendarYearViewProps = {
  year: number;
  tasksByDate: Record<string, Task[]>;
  selectedDateKey: string;
  todayKey: string;
  onSelectDate: (dateKey: string) => void;
};

const MONTH_LABELS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export default function CalendarYearView({
  year,
  tasksByDate,
  selectedDateKey,
  todayKey,
  onSelectDate,
}: CalendarYearViewProps) {
  const selectedDate = parseDateKey(selectedDateKey);
  const selectedMonth = selectedDate.getMonth();
  const today = parseDateKey(todayKey);

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13.5rem),1fr))] gap-3">
      {Array.from({ length: 12 }, (_, monthIndex) => {
        const monthStart = new Date(year, monthIndex, 1);
        const firstWeekday = monthStart.getDay();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const cells: Array<number | null> = [
          ...Array.from({ length: firstWeekday }, () => null),
          ...Array.from({ length: daysInMonth }, (_, dayIndex) => dayIndex + 1),
        ];

        return (
          <section
            key={`${year}-${monthIndex}`}
            className={`overflow-hidden rounded-[22px] border px-3 py-3 transition-colors ${
              selectedMonth === monthIndex
                ? 'border-[rgba(var(--theme-accent),0.32)] bg-[linear-gradient(180deg,rgba(var(--theme-accent),0.12),rgba(10,10,12,0.08))]'
                : 'border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/90'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[color:var(--ui-text-strong)]">{MONTH_LABELS[monthIndex]}</h3>
              <span className="text-[11px] text-[color:var(--ui-text-muted)]">{daysInMonth} 天</span>
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-[11px] text-[color:var(--ui-text-secondary)]">
              {WEEKDAY_LABELS.map((label) => (
                <div key={`${monthIndex}-${label}`} className="text-center">
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-0.5 text-sm sm:gap-1">
              {cells.map((day, cellIndex) => {
                if (!day) {
                  return <div key={`empty-${monthIndex}-${cellIndex}`} className="h-7 rounded-xl sm:h-8" />;
                }

                const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDateKey;
                const hasTasks = (tasksByDate[dateKey] || []).length > 0;
                const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => onSelectDate(dateKey)}
                    className={`relative flex h-7 items-center justify-center rounded-xl text-[12px] transition-all sm:h-8 sm:text-[13px] ${
                      isSelected
                        ? 'bg-[rgba(var(--theme-accent),0.9)] text-white shadow-[0_12px_24px_rgba(37,99,235,0.28)]'
                        : isToday
                          ? 'bg-[rgba(var(--theme-accent),0.18)] text-[color:var(--ui-text-strong)] ring-1 ring-[rgba(var(--theme-accent),0.34)]'
                          : hasTasks
                            ? 'bg-[rgba(78,91,133,0.72)] text-[#F4F7FF] hover:bg-[rgba(88,102,152,0.84)]'
                            : 'text-[color:var(--ui-text-secondary)] hover:bg-[color:var(--ui-hover-bg)]'
                    } ${isCurrentMonth && !isSelected && !isToday ? 'font-medium' : ''}`}
                  >
                    {day}
                    {hasTasks && !isSelected && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current opacity-70" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
