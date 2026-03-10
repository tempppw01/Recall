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
    <div className="glass-panel rounded-[28px] p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => onMonthChange(-1)} className="p-2 rounded-xl hover:bg-white/5 text-[#888888] transition-colors" title="上个月">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-semibold text-[#E5E5E5]">{monthLabel}</div>
        <button onClick={() => onMonthChange(1)} className="p-2 rounded-xl hover:bg-white/5 text-[#888888] transition-colors" title="下个月">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-xs text-[#727272] mb-3 px-1">
        {weekdayLabels.map((label) => (
          <div key={label} className="text-center">{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2.5 text-sm">
        {calendarDays.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="h-16" />;
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
              className={`relative h-16 rounded-2xl flex flex-col items-center justify-center text-xs transition-all border ${
                isSelected
                  ? 'bg-blue-600/18 border-blue-500/55 text-white shadow-[0_10px_26px_rgba(59,130,246,0.16)]'
                  : 'border-white/6 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/12'
              } ${isToday ? 'text-blue-300' : 'text-[#D0D0D0]'}`}
            >
              <span className="leading-none font-medium">{day}</span>
              {note && (
                <span className="absolute top-1.5 left-1.5 text-[9px] text-blue-300 leading-none max-w-[70%] truncate">{note}</span>
              )}
              <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${hasTasks ? 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.65)]' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
