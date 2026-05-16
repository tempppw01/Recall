import { ChevronLeft, ChevronRight } from 'lucide-react';

type CalendarMonthGridProps = {
  monthLabel: string;
  weekdayLabels: string[];
  calendarDays: (number | null)[];
  effectiveCalendarDate: string;
  todayKey: string;
  calendarNotes: Record<string, string>;
  tasksByDate: Record<string, { id: string }[]>;
  onMonthChange: (offset: number) => void;
  onSelectDate: (dateKey: string) => void;
};

export default function CalendarMonthGrid({
  monthLabel,
  weekdayLabels,
  calendarDays,
  effectiveCalendarDate,
  todayKey,
  calendarNotes,
  tasksByDate,
  onMonthChange,
  onSelectDate,
}: CalendarMonthGridProps) {
  const anchorDateKey = effectiveCalendarDate.startsWith(monthLabel)
    ? effectiveCalendarDate
    : todayKey.startsWith(monthLabel)
      ? todayKey
      : `${monthLabel}-01`;
  const anchorDay = Number(anchorDateKey.slice(-2));
  const anchorIndex = calendarDays.findIndex((day) => day === anchorDay);
  const activeWeekIndex = anchorIndex >= 0 ? Math.floor(anchorIndex / 7) : -1;

  return (
    <div className="glass-panel rounded-[28px] p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(-1)}
          className="rounded-xl p-2 text-[#888888] transition-colors hover:bg-[#23262E]"
          title="上一个月"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold text-[#E5E5E5]">{monthLabel}</div>
        <button
          type="button"
          onClick={() => onMonthChange(1)}
          className="rounded-xl p-2 text-[#888888] transition-colors hover:bg-[#23262E]"
          title="下一个月"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2.5 grid grid-cols-7 px-1 text-xs text-[#727272]">
        {weekdayLabels.map((label) => (
          <div key={label} className="text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 text-sm">
        {calendarDays.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="h-14 sm:h-[3.6rem]" />;
          }

          const dateKey = `${monthLabel}-${String(day).padStart(2, '0')}`;
          const note = calendarNotes[dateKey];
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === effectiveCalendarDate;
          const hasTasks = (tasksByDate[dateKey] || []).length > 0;
          const shouldShowNote = Boolean(note) && Math.floor(idx / 7) === activeWeekIndex;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`relative flex h-14 flex-col items-center justify-center rounded-2xl border text-xs transition-all sm:h-[3.6rem] ${
                isSelected
                  ? 'border-blue-300/80 bg-blue-600 text-white shadow-[0_14px_34px_rgba(59,130,246,0.30)]'
                  : isToday
                    ? 'border-blue-400/80 bg-blue-500 text-white shadow-[0_12px_30px_rgba(59,130,246,0.26)] hover:border-blue-200 hover:bg-blue-400'
                    : 'border-[#3A3F4B]/45 bg-[#1E2128]/78 text-[#D0D0D0] hover:border-[#555D6D] hover:bg-white/[0.05]'
              } ${isToday ? 'ring-2 ring-inset ring-blue-100/20' : ''}`}
            >
              <span className={`leading-none ${isToday ? 'font-semibold text-white' : 'font-medium'}`}>{day}</span>
              {shouldShowNote && (
                <span
                  className={`absolute left-1.5 top-1.5 max-w-[72%] truncate text-[8px] leading-none ${
                    isToday ? 'text-blue-50/90' : 'text-blue-300'
                  }`}
                >
                  {note}
                </span>
              )}
              <span
                className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${
                  hasTasks
                    ? isToday
                      ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.55)]'
                      : 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.65)]'
                    : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
