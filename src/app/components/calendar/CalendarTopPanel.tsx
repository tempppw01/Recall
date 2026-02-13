import type { ReactNode } from 'react';
import { MapPin, Search } from 'lucide-react';

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

type WeatherCity = {
  id: string;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

type CalendarTopPanelProps = {
  calendarView: CalendarViewMode;
  showCompletedInCalendar: boolean;
  calendarCityInput: string;
  isSearchingWeatherCity: boolean;
  weatherCities: WeatherCity[];
  selectedCalendarLabel: string;
  cityLabel: string;
  weatherLoading: boolean;
  weatherSummaryLabel: string;
  weatherTemperatureText: string;
  weatherHintText?: string;
  weatherIcon: ReactNode;
  onViewChange: (view: CalendarViewMode) => void;
  onToggleCompleted: () => void;
  onCityInputChange: (value: string) => void;
  onSelectCity: (city: WeatherCity) => void;
};

/**
 * 日历顶部工具区：
 * - 视图切换
 * - 是否显示已完成
 * - 城市搜索与天气展示
 */
export default function CalendarTopPanel({
  calendarView,
  showCompletedInCalendar,
  calendarCityInput,
  isSearchingWeatherCity,
  weatherCities,
  selectedCalendarLabel,
  cityLabel,
  weatherLoading,
  weatherSummaryLabel,
  weatherTemperatureText,
  weatherHintText,
  weatherIcon,
  onViewChange,
  onToggleCompleted,
  onCityInputChange,
  onSelectCity,
}: CalendarTopPanelProps) {
  return (
    <div className="bg-[#202020] border border-[#2D2D2D] rounded-3xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {(['month', 'week', 'day', 'agenda'] as const).map((view) => (
            <button
              key={view}
              className={`px-3.5 py-1.5 rounded-xl border transition-colors ${
                calendarView === view
                  ? 'bg-blue-500/20 border-blue-400 text-white'
                  : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
              }`}
              onClick={() => onViewChange(view)}
            >
              {view === 'month' ? '月视图' : view === 'week' ? '周视图' : view === 'day' ? '日视图' : '日程视图'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCompleted}
            className="px-3 py-1.5 rounded-xl border text-[11px] transition-colors border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]"
            title={showCompletedInCalendar ? '隐藏已完成任务' : '显示已完成任务'}
          >
            {showCompletedInCalendar ? '隐藏已完成' : '显示已完成'}
          </button>
          <div className="text-[11px] text-[#666666]">
            {calendarView === 'month'
              ? '按月总览'
              : calendarView === 'week'
                ? '按周聚焦'
                : calendarView === 'day'
                  ? '当日任务'
                  : '近期日程'}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-[#333333] bg-[#171717]">
            <Search className="w-4 h-4 text-[#7A7A7A]" />
            <input
              value={calendarCityInput}
              onChange={(event) => onCityInputChange(event.target.value)}
              placeholder="搜索城市：例如 北京、上海、Tokyo"
              className="w-full bg-transparent text-sm text-[#DDDDDD] placeholder:text-[#5F5F5F] outline-none"
            />
          </div>
          {calendarCityInput.trim().length >= 2 && (
            <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 z-20 rounded-2xl border border-[#333333] bg-[#171717] max-h-56 overflow-y-auto">
              {isSearchingWeatherCity ? (
                <div className="px-3 py-2 text-xs text-[#777777]">城市搜索中…</div>
              ) : weatherCities.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[#666666]">未找到匹配城市</div>
              ) : (
                weatherCities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => onSelectCity(city)}
                    className="w-full text-left px-3 py-2 text-sm text-[#CCCCCC] hover:bg-[#222222]"
                  >
                    {[city.name, city.admin1, city.country].filter(Boolean).join(' · ')}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#333333] bg-[#171717] px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-[#6E6E6E]">天气预报（{selectedCalendarLabel}）</div>
            <div className="mt-1 flex items-center gap-2 text-sm text-[#DDDDDD] truncate">
              <MapPin className="w-3.5 h-3.5 text-blue-300" />
              <span className="truncate">{cityLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-right">
            {weatherLoading ? (
              <span className="text-xs text-[#6E6E6E]">加载中…</span>
            ) : (
              <>
                {weatherIcon}
                <div>
                  <div className="text-sm text-[#E5E5E5]">{weatherSummaryLabel}</div>
                  <div className="text-xs text-[#8A8A8A]">{weatherTemperatureText}</div>
                  {weatherHintText && <div className="text-[10px] text-amber-300/80">{weatherHintText}</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
