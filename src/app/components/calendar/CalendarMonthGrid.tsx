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

/**
 * 月视图网格：只处理日期矩阵渲染和切月交互。
 */
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
  return (
    <div className="bg-[#202020] border border-[#2C2C2C] rounded-3xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(-1)} className="p-1 rounded hover:bg-[#2A2A2A] text-[#888888]" title="上个月">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-semibold text-[#DDDDDD]">{monthLabel}</div>
        <button onClick={() => onMonthChange(1)} className="p-1 rounded hover:bg-[#2A2A2A] text-[#888888]" title="下个月">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-xs text-[#727272] mb-3">
        {weekdayLabels.map((label) => (
          <div key={label} className="text-center">{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 text-sm">
        {calendarDays.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="h-14" />;
          }
          const dateKey = `${monthLabel}-${String(day).padStart(2, '0')}`;
          const note = calendarNotes[dateKey];
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === effectiveCalendarDate;
          const hasTasks = (tasksByDate[dateKey] || []).length > 0;

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              className={`relative h-14 rounded-2xl flex flex-col items-center justify-center text-xs transition-colors border ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'border-transparent hover:bg-[#2A2A2A]'
              } ${isToday ? 'text-blue-300' : 'text-[#CCCCCC]'}`}
            >
              <span className="leading-none">{day}</span>
              {note && (
                <span className="absolute top-1 left-1 text-[9px] text-blue-300 leading-none">{note}</span>
              )}
              <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${hasTasks ? 'bg-blue-400' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
