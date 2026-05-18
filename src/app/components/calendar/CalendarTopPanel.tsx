import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Crosshair, MapPin, Search } from 'lucide-react';
import type { WeatherCity } from '@/app/homeTypes';
import { CALENDAR_VIEW_OPTIONS, type CalendarViewMode } from '@/app/components/calendar/calendarTypes';

type CalendarTopPanelProps = {
  calendarView: CalendarViewMode;
  periodLabel: string;
  focusLabel: string;
  showCompletedInCalendar: boolean;
  calendarCityInput: string;
  isSearchingWeatherCity: boolean;
  weatherCities: WeatherCity[];
  weatherCitySearchMessage?: string;
  hasSelectedCity: boolean;
  cityLabel: string;
  weatherLoading: boolean;
  weatherSummaryLabel: string;
  weatherTemperatureText: string;
  weatherHintText?: string;
  weatherIcon: ReactNode;
  onViewChange: (view: CalendarViewMode) => void;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
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

export default function CalendarTopPanel({
  calendarView,
  periodLabel,
  focusLabel,
  showCompletedInCalendar,
  calendarCityInput,
  isSearchingWeatherCity,
  weatherCities,
  weatherCitySearchMessage,
  hasSelectedCity,
  cityLabel,
  weatherLoading,
  weatherSummaryLabel,
  weatherTemperatureText,
  weatherHintText,
  weatherIcon,
  onViewChange,
  onPrevious,
  onToday,
  onNext,
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

  useEffect(() => {
    if (hasSelectedCity) {
      setIsEditingCity(false);
    }
  }, [hasSelectedCity, cityLabel]);

  return (
    <div className="calendar-top-panel relative z-10 -mx-1 px-1 pb-2 pt-0 lg:sticky lg:top-[4.75rem] lg:z-20 xl:top-20">
      <div className="app-toolbar space-y-2 rounded-[22px] px-3 py-2.5 sm:px-3.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ui-text-muted)]">Calendar</div>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h2 className="min-w-0 truncate text-base font-semibold text-[color:var(--ui-text-strong)] sm:text-lg">{periodLabel}</h2>
              <span className="min-w-0 truncate text-[11px] text-[color:var(--ui-text-secondary)] sm:text-xs">焦点：{focusLabel}</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleCompleted}
              className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[11px] transition-colors ${
                showCompletedInCalendar
                  ? 'border-[rgba(var(--theme-accent),0.35)] bg-[rgba(var(--theme-accent),0.15)] text-[rgba(var(--theme-accent),0.96)]'
                  : 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-secondary)] hover:bg-[color:var(--ui-hover-bg)]'
              }`}
            >
              {showCompletedInCalendar ? '已显示完成项' : '隐藏完成项'}
            </button>
            <div className="inline-flex shrink-0 items-center rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] p-0.5">
              <button type="button" onClick={onPrevious} className="rounded-full p-2 text-[color:var(--ui-text-secondary)] transition-colors hover:bg-[color:var(--ui-hover-bg)] hover:text-[color:var(--ui-text-strong)]" aria-label="上一段">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={onToday} className="rounded-full px-3 py-2 text-xs font-medium text-[color:var(--ui-text-strong)] transition-colors hover:bg-[color:var(--ui-hover-bg)] sm:px-4">
                今天
              </button>
              <button type="button" onClick={onNext} className="rounded-full p-2 text-[color:var(--ui-text-secondary)] transition-colors hover:bg-[color:var(--ui-hover-bg)] hover:text-[color:var(--ui-text-strong)]" aria-label="下一段">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(4.6rem,1fr))] gap-1.5">
          {CALENDAR_VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onViewChange(option.value)}
              className={`min-w-0 rounded-full border px-2 py-1.5 text-[11px] transition-all ${
                calendarView === option.value
                  ? 'border-[rgba(var(--theme-accent),0.4)] bg-[rgba(var(--theme-accent),0.16)] text-[color:var(--ui-text-strong)] shadow-[0_10px_24px_rgba(37,99,235,0.16)]'
                  : 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-secondary)] hover:bg-[color:var(--ui-hover-bg)] hover:text-[color:var(--ui-text-strong)]'
              }`}
            >
              <span className="hidden truncate md:inline">{option.label}</span>
              <span className="truncate md:hidden">{option.shortLabel}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(15rem,0.85fr)]">
          <div className="relative min-w-0">
            <div className="flex min-h-10 items-center gap-2 rounded-[16px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-3">
              <Search className="h-4 w-4 text-[color:var(--ui-text-muted)]" />
              <input
                value={calendarCityInput}
                onChange={(event) => onCityInputChange(event.target.value)}
                onFocus={() => onCityInputFocus?.()}
                onBlur={() => onCityInputBlur?.()}
                placeholder="搜索天气城市，例如北京、上海、Tokyo"
                className="w-full bg-transparent text-sm text-[color:var(--ui-text-primary)] outline-none placeholder:text-[color:var(--ui-text-muted)]"
              />
              {onLocateCity && (
                <button
                  type="button"
                  onClick={onLocateCity}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1.5 text-[11px] text-[color:var(--ui-text-secondary)] transition-colors hover:bg-[color:var(--ui-hover-bg)]"
                  title="定位当前城市"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{isLocatingCity ? '定位中' : '定位'}</span>
                </button>
              )}
            </div>

            {locateErrorMessage && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                <span className="min-w-0 flex-1">{locateErrorMessage}</span>
                {onRetryLocate && (
                  <button
                    type="button"
                    onClick={onRetryLocate}
                    className="rounded-full border border-amber-300/25 px-2.5 py-1 text-[11px] transition-colors hover:bg-amber-500/10"
                  >
                    重试
                  </button>
                )}
              </div>
            )}

            {showCityDropdown && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-30 overflow-hidden rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-modal-bg)] shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                {isSearchingWeatherCity ? (
                  <div className="px-3 py-2.5 text-sm text-[color:var(--ui-text-secondary)]">城市搜索中...</div>
                ) : weatherCities.length > 0 ? (
                  weatherCities.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => {
                        onSelectCity(city);
                        setIsEditingCity(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-[color:var(--ui-text-primary)] transition-colors hover:bg-[color:var(--ui-hover-bg)]"
                    >
                      {[city.name, city.admin1, city.country].filter(Boolean).join(' · ')}
                    </button>
                  ))
                ) : weatherCitySearchMessage ? (
                  <div className="px-3 py-2.5 text-sm text-[color:var(--ui-text-secondary)]">{weatherCitySearchMessage}</div>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex min-h-10 items-center justify-between gap-3 rounded-[16px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)] px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-[color:var(--ui-text-primary)]">
                <MapPin className="h-4 w-4 shrink-0 text-[rgba(var(--theme-accent),0.94)]" />
                <span className="truncate">{cityLabel}</span>
              </div>
              {hasSelectedCity && (
                <button
                  type="button"
                  onClick={() => setIsEditingCity(true)}
                  className="mt-1 text-[11px] text-[color:var(--ui-text-secondary)] underline-offset-4 transition-colors hover:text-[color:var(--ui-text-strong)] hover:underline"
                >
                  更换城市
                </button>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2 text-right">
              {weatherLoading ? (
                <span className="text-sm text-[color:var(--ui-text-secondary)]">加载中...</span>
              ) : (
                <>
                  {weatherIcon}
                  <div>
                    <div className="text-sm text-[color:var(--ui-text-strong)]">{weatherSummaryLabel}</div>
                    <div className="text-[11px] text-[color:var(--ui-text-secondary)]">{weatherTemperatureText}</div>
                    {weatherHintText && (
                      <div className="text-[10px] text-[color:var(--ui-text-muted)]">{weatherHintText}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
