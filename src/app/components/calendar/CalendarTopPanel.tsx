import { useEffect, useState, type ReactNode } from 'react';
import { Crosshair, MapPin, Search } from 'lucide-react';

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
  hasSelectedCity: boolean;
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
  onCityInputBlur?: () => void;
  isLocatingCity?: boolean;
  locateErrorMessage?: string;
  onLocateCity?: () => void;
  onRetryLocate?: () => void;
  onSelectCity: (city: WeatherCity) => void;
};

const VIEW_OPTIONS: CalendarViewMode[] = ['day', 'week', 'month', 'agenda'];

const getViewLabel = (view: CalendarViewMode) => {
  switch (view) {
    case 'day':
      return '日视图';
    case 'week':
      return '周视图';
    case 'month':
      return '月视图';
    case 'agenda':
    default:
      return '日程视图';
  }
};

const getViewHint = (view: CalendarViewMode) => {
  switch (view) {
    case 'month':
      return '按月总览';
    case 'week':
      return '按周聚焦';
    case 'day':
      return '当日任务';
    case 'agenda':
    default:
      return '近期日程';
  }
};

export default function CalendarTopPanel({
  calendarView,
  showCompletedInCalendar,
  calendarCityInput,
  isSearchingWeatherCity,
  weatherCities,
  weatherCitySearchMessage,
  hasSelectedCity,
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
  onCityInputBlur,
  isLocatingCity,
  locateErrorMessage,
  onLocateCity,
  onRetryLocate,
  onSelectCity,
}: CalendarTopPanelProps) {
  const [isEditingCity, setIsEditingCity] = useState(false);
  const showCitySearch = !hasSelectedCity || isEditingCity;
  const showCityDropdown =
    showCitySearch && (isSearchingWeatherCity || weatherCities.length > 0 || Boolean(weatherCitySearchMessage));
  const isDayView = calendarView === 'day';

  useEffect(() => {
    if (hasSelectedCity) {
      setIsEditingCity(false);
    }
  }, [hasSelectedCity, cityLabel]);

  return (
    <div
      className={`calendar-top-panel glass-panel ${
        isDayView ? 'rounded-[24px] p-3 sm:p-4 space-y-3' : 'rounded-[24px] p-3.5 sm:p-4 space-y-3.5'
      }`}
    >
      <div className={`flex flex-col xl:flex-row xl:items-center xl:justify-between ${isDayView ? 'gap-2.5' : 'gap-3'}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {VIEW_OPTIONS.map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => onViewChange(view)}
              className={`rounded-xl border transition-all ${
                isDayView ? 'px-3 py-1.5' : 'px-3.5 py-1.5'
              } ${
                calendarView === view
                  ? 'border-blue-400/60 bg-blue-500/20 text-white shadow-[0_8px_24px_rgba(59,130,246,0.14)]'
                  : 'border-[#3A3F4B]/50 text-[#9A9A9A] hover:border-[#555D6D] hover:bg-[#23262E] hover:text-white'
              }`}
            >
              {getViewLabel(view)}
            </button>
          ))}
        </div>

        <div className={`flex flex-wrap items-center justify-start xl:justify-end ${isDayView ? 'gap-2' : 'gap-2.5'}`}>
          <button
            type="button"
            onClick={onToggleCompleted}
            title={showCompletedInCalendar ? '隐藏已完成任务' : '显示已完成任务'}
            className="rounded-xl border border-[#3A3F4B]/50 px-3 py-1.5 text-[11px] text-[#9A9A9A] transition-all hover:border-[#555D6D] hover:bg-[#23262E] hover:text-white"
          >
            {showCompletedInCalendar ? '隐藏已完成' : '显示已完成'}
          </button>
          <div className="text-[11px] text-[#666666]">{getViewHint(calendarView)}</div>
        </div>
      </div>

      <div className={showCitySearch ? `grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(15rem,0.9fr)]` : 'grid gap-3'}>
        {showCitySearch && (
          <div className="relative min-w-0">
            <div className={`glass-panel-soft flex items-center gap-2 rounded-2xl ${isDayView ? 'px-3 py-2.5' : 'px-3.5 py-3'}`}>
              <Search className="h-4 w-4 text-[#7A7A7A]" />
              <input
                value={calendarCityInput}
                onChange={(event) => onCityInputChange(event.target.value)}
                onFocus={() => onCityInputFocus?.()}
                onBlur={() => onCityInputBlur?.()}
                placeholder="搜索城市：例如 北京、上海、Tokyo"
                className="w-full bg-transparent text-sm text-[#DDDDDD] outline-none placeholder:text-[#5F5F5F]"
              />
              {onLocateCity && (
                <button
                  type="button"
                  onClick={onLocateCity}
                  className="btn btn-sm btn-ghost shrink-0"
                  title="定位当前城市"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  {isLocatingCity ? '定位中...' : '定位'}
                </button>
              )}
            </div>

            {locateErrorMessage && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                <span>{locateErrorMessage}</span>
                {onRetryLocate && (
                  <button type="button" onClick={onRetryLocate} className="btn btn-sm btn-ghost shrink-0">
                    重试定位
                  </button>
                )}
              </div>
            )}

            {showCityDropdown && (
              <div className="z-20 mt-2 max-h-[40vh] w-full overflow-y-auto overscroll-contain rounded-2xl border border-[#3A3F4B]/50 bg-[#171717]/92 shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:absolute sm:left-0 sm:right-0 sm:top-[calc(100%+0.5rem)] sm:mt-0 sm:max-h-56">
                {isSearchingWeatherCity ? (
                  <div className="px-3 py-2 text-xs text-[#777777]">城市搜索中...</div>
                ) : weatherCities.length > 0 ? (
                  weatherCities.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => {
                        onSelectCity(city);
                        setIsEditingCity(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-[#CCCCCC] transition-colors hover:bg-[#23262E]"
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
        )}

        <div className={`glass-panel-soft rounded-2xl ${isDayView ? 'px-3.5 py-3' : 'px-4 py-3.5'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-[#6E6E6E]">天气预报（{selectedCalendarLabel}）</div>
              <div className={`mt-1 flex items-start gap-2 text-sm text-[#DDDDDD] ${isDayView ? '' : 'sm:mt-1.5'}`}>
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-300" />
                <span className="break-words">{cityLabel}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-right">
              {weatherLoading ? (
                <span className="text-xs text-[#6E6E6E]">加载中...</span>
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

          {hasSelectedCity && (
            <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-[color:var(--ui-border-soft)] pt-2">
              <button
                type="button"
                onClick={() => setIsEditingCity(true)}
                className="btn btn-sm btn-ghost"
                title="更换天气城市"
              >
                更换
              </button>
              {onLocateCity && (
                <button
                  type="button"
                  onClick={onLocateCity}
                  className="btn btn-sm btn-ghost"
                  title="重新定位当前城市"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  {isLocatingCity ? '定位中...' : '定位'}
                </button>
              )}
            </div>
          )}
        </div>

        {!showCitySearch && locateErrorMessage && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            <span>{locateErrorMessage}</span>
            {onRetryLocate && (
              <button type="button" onClick={onRetryLocate} className="btn btn-sm btn-ghost shrink-0">
                重试定位
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
