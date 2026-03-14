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
  weatherCitySearchMessage?: string;
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
  onCityInputFocus?: () => void;
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
  weatherCitySearchMessage,
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
  onCityInputFocus,
  onSelectCity,
}: CalendarTopPanelProps) {
  const showCityDropdown =
    isSearchingWeatherCity || weatherCities.length > 0 || Boolean(weatherCitySearchMessage);

  return (
    <div className="glass-panel rounded-[28px] p-4 sm:p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {(['month', 'week', 'day', 'agenda'] as const).map((view) => (
            <button
              key={view}
              className={`px-3.5 py-1.5 rounded-xl border transition-all ${
                calendarView === view
                  ? 'bg-blue-500/20 border-blue-400/60 text-white shadow-[0_8px_24px_rgba(59,130,246,0.14)]'
                  : 'border-[#3A3F4B]/50 text-[#9A9A9A] hover:text-white hover:border-[#555D6D] hover:bg-[#23262E]'
              }`}
              onClick={() => onViewChange(view)}
            >
              {view === 'month' ? '月视图' : view === 'week' ? '周视图' : view === 'day' ? '日视图' : '日程视图'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <button
            onClick={onToggleCompleted}
            className="px-3 py-1.5 rounded-xl border text-[11px] transition-all border-[#3A3F4B]/50 text-[#9A9A9A] hover:text-white hover:border-[#555D6D] hover:bg-[#23262E]"
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="relative">
          <div className="glass-panel-soft flex items-center gap-2 px-3.5 py-3 rounded-2xl">
            <Search className="w-4 h-4 text-[#7A7A7A]" />
            <input
              value={calendarCityInput}
              onChange={(event) => onCityInputChange(event.target.value)}
              onFocus={() => onCityInputFocus?.()}
              placeholder="搜索城市：例如 北京、上海、Tokyo"
              className="w-full bg-transparent text-sm text-[#DDDDDD] placeholder:text-[#5F5F5F] outline-none"
            />
          </div>
          {showCityDropdown && (
            <div className="z-20 mt-2 w-full rounded-2xl border border-[#3A3F4B]/50 bg-[#171717]/92 backdrop-blur-xl max-h-[40vh] overflow-y-auto overscroll-contain shadow-[0_16px_40px_rgba(0,0,0,0.24)] sm:absolute sm:mt-0 sm:top-[calc(100%+0.5rem)] sm:left-0 sm:right-0 sm:max-h-56">
              {isSearchingWeatherCity ? (
                <div className="px-3 py-2 text-xs text-[#777777]">城市搜索中…</div>
              ) : weatherCities.length > 0 ? (
                weatherCities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => onSelectCity(city)}
                    className="w-full text-left px-3 py-2.5 text-sm text-[#CCCCCC] hover:bg-[#23262E] transition-colors"
                  >
                    {[city.name, city.admin1, city.country].filter(Boolean).join(' · ')}
                  </button>
                ))
              ) : weatherCitySearchMessage ? (
                <div className="px-3 py-2 text-xs text-[#777777]">{weatherCitySearchMessage}</div>
              ) : null}
            </div>
          )}
        </div>

        <div className="glass-panel-soft rounded-2xl px-4 py-3.5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] text-[#6E6E6E]">天气预报（{selectedCalendarLabel}）</div>
            <div className="mt-1.5 flex items-start gap-2 text-sm text-[#DDDDDD]">
              <MapPin className="w-3.5 h-3.5 text-blue-300" />
              <span className="break-words">{cityLabel}</span>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-2 text-right sm:w-auto sm:justify-end shrink-0">
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
