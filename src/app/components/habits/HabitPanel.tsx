import { CalendarCheck, CheckCircle2, Flame, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import type { Habit } from '@/lib/store';
import type { HabitAgentItem } from '@/app/homeTypes';
import { DEFAULT_TIMEZONE_OFFSET, formatZonedDateTime, getRecentDays, getTodayKey } from '@/app/homeUtils';

type HabitPanelProps = {
  habits: Habit[];
  hasApiKey: boolean;
  habitAgentInput: string;
  habitAgentLoading: boolean;
  habitAgentError: string | null;
  habitAgentItems: HabitAgentItem[];
  addedHabitAgentItemIds: Set<string>;
  setHabitAgentInput: (value: string) => void;
  onHabitAgentSend: () => void;
  onAddHabitAgentItem: (item: HabitAgentItem) => void;
  onToggleHabitToday: (habitId: string) => void;
  onRemoveHabit: (habitId: string) => void;
  getHabitStreak: (habit: Habit) => number;
};

const formatPercent = (value: number) => `${Math.round(Math.max(0, Math.min(100, value)))}%`;

export default function HabitPanel({
  habits,
  hasApiKey,
  habitAgentInput,
  habitAgentLoading,
  habitAgentError,
  habitAgentItems,
  addedHabitAgentItemIds,
  setHabitAgentInput,
  onHabitAgentSend,
  onAddHabitAgentItem,
  onToggleHabitToday,
  onRemoveHabit,
  getHabitStreak,
}: HabitPanelProps) {
  const todayKey = getTodayKey();
  const recentDays = getRecentDays(7);
  const completedToday = habits.filter((habit) => habit.logs.some((log) => log.date === todayKey)).length;
  const todayRate = habits.length > 0 ? (completedToday / habits.length) * 100 : 0;
  const bestStreak = habits.reduce((max, habit) => Math.max(max, getHabitStreak(habit)), 0);
  const weekCheckCount = habits.reduce((sum, habit) => {
    const logSet = new Set(habit.logs.map((log) => log.date));
    return sum + recentDays.filter((day) => logSet.has(day)).length;
  }, 0);

  const submit = () => {
    if (!habitAgentInput.trim() || habitAgentLoading) return;
    onHabitAgentSend();
  };

  return (
    <div className="theme-native-surface space-y-4">
      <section className="motion-enter relative overflow-hidden rounded-[28px] border border-[rgba(var(--theme-accent),0.22)] bg-[linear-gradient(135deg,rgba(249,115,22,0.16),rgba(var(--theme-accent),0.08),rgba(255,255,255,0.018))] p-3.5 shadow-[0_24px_70px_rgba(0,0,0,0.18)] sm:p-4">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-orange-400/18 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-12 h-28 w-48 rounded-full bg-[rgba(var(--theme-accent),0.12)] blur-3xl" />

        <div className="relative grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-orange-300/25 bg-orange-400/14 text-orange-200 shadow-[0_12px_30px_rgba(249,115,22,0.16)]">
                <Flame className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ui-text-muted)]">Habit Studio</p>
                <h3 className="truncate text-lg font-semibold text-[color:var(--ui-text-strong)]">今天先完成一个小动作</h3>
              </div>
            </div>

            <div className="mt-3 rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-input-bg)]/82 p-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[18px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-0)]/50 px-3">
                  <Sparkles className="h-4 w-4 shrink-0 text-orange-300" />
                  <input
                    type="text"
                    value={habitAgentInput}
                    onChange={(event) => setHabitAgentInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        submit();
                      }
                    }}
                    placeholder={hasApiKey ? '例如：我想每天学英语' : '例如：每天学英语'}
                    className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-[color:var(--ui-text-strong)] outline-none placeholder:text-[color:var(--ui-text-muted)]"
                    disabled={habitAgentLoading}
                  />
                </div>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!habitAgentInput.trim() || habitAgentLoading}
                  className="motion-press surface-sheen inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[18px] border border-orange-300/30 bg-[linear-gradient(135deg,rgba(249,115,22,0.96),rgba(245,158,11,0.84))] px-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {hasApiKey ? <Wand2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {habitAgentLoading ? '整理中...' : hasApiKey ? '智能拆解' : '创建习惯'}
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[color:var(--ui-text-muted)]">
                <span className="rounded-full border border-[color:var(--ui-border-soft)] px-2 py-0.5">
                  {hasApiKey ? 'AI 会生成习惯和检查任务' : '未配置 AI，回车直接创建'}
                </span>
                <span className="rounded-full border border-orange-300/20 bg-orange-400/10 px-2 py-0.5 text-orange-200">
                  今天 {todayKey.slice(5)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/70 p-3">
              <p className="text-[11px] text-[color:var(--ui-text-muted)]">今日</p>
              <p className="mt-1 text-xl font-semibold text-[color:var(--ui-text-strong)]">{completedToday}/{habits.length}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--ui-hover-bg)]">
                <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300" style={{ width: formatPercent(todayRate) }} />
              </div>
            </div>
            <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/70 p-3">
              <p className="text-[11px] text-[color:var(--ui-text-muted)]">最佳连续</p>
              <p className="mt-1 text-xl font-semibold text-[color:var(--ui-text-strong)]">{bestStreak}<span className="ml-1 text-xs text-[color:var(--ui-text-muted)]">天</span></p>
              <Flame className="mt-2 h-4 w-4 text-orange-300" />
            </div>
            <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/70 p-3">
              <p className="text-[11px] text-[color:var(--ui-text-muted)]">本周打卡</p>
              <p className="mt-1 text-xl font-semibold text-[color:var(--ui-text-strong)]">{weekCheckCount}</p>
              <CalendarCheck className="mt-2 h-4 w-4 text-emerald-300" />
            </div>
          </div>
        </div>

        {habitAgentError && (
          <div className="relative mt-3 whitespace-pre-wrap rounded-[18px] border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-300">
            {habitAgentError}
          </div>
        )}
      </section>

      {habitAgentItems.length > 0 && (
        <section className="motion-enter grid gap-2 lg:grid-cols-2">
          {habitAgentItems.map((item) => {
            const isAdded = addedHabitAgentItemIds.has(item.id);
            return (
              <div key={item.id} className="motion-card rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/86 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-orange-400/12 text-orange-300">
                        <Sparkles className="h-3.5 w-3.5" />
                      </span>
                      <h4 className="truncate text-sm font-semibold text-[color:var(--ui-text-strong)]">{item.title}</h4>
                    </div>
                    <p className="mt-2 text-[11px] text-[color:var(--ui-text-secondary)]">
                      {item.frequency ? `${item.frequency} · ` : ''}
                      {item.checkInDueDate ? formatZonedDateTime(item.checkInDueDate, DEFAULT_TIMEZONE_OFFSET) : '今晚 20:00 检查'}
                    </p>
                    {item.reason && <p className="mt-1 line-clamp-2 text-xs text-orange-200/90">{item.reason}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddHabitAgentItem(item)}
                    disabled={isAdded}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                      isAdded
                        ? 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-muted)]'
                        : 'border-orange-300/35 bg-orange-400/10 text-orange-100 hover:bg-orange-400/16'
                    }`}
                  >
                    {isAdded ? '已加入' : '采纳'}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {habits.length === 0 ? (
        <section className="motion-enter flex min-h-[22rem] flex-col items-center justify-center rounded-[28px] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/35 px-6 text-center">
          <div className="icon-halo float-bob flex h-16 w-16 items-center justify-center rounded-[28px] border border-orange-300/25 bg-orange-400/12 text-orange-300">
            <Flame className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-[color:var(--ui-text-strong)]">先放一个最容易坚持的习惯</h3>
          <p className="mt-2 max-w-sm text-sm text-[color:var(--ui-text-secondary)]">例如“每天学英语 15 分钟”。创建后，今天就可以一键打卡。</p>
        </section>
      ) : (
        <section className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {habits.map((habit, index) => {
            const hasToday = habit.logs.some((log) => log.date === todayKey);
            const streak = getHabitStreak(habit);
            const logSet = new Set(habit.logs.map((log) => log.date));
            const weekCount = recentDays.filter((day) => logSet.has(day)).length;

            return (
              <article
                key={habit.id}
                className={`motion-card motion-enter group/habit relative overflow-hidden rounded-[26px] border p-3.5 transition-all ${
                  hasToday
                    ? 'border-orange-300/30 bg-[linear-gradient(180deg,rgba(249,115,22,0.13),rgba(255,255,255,0.025))]'
                    : 'border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/88'
                }`}
                style={{ animationDelay: `${Math.min(index * 35, 180)}ms` }}
              >
                <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-orange-400/12 blur-2xl transition-opacity group-hover/habit:opacity-100" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border text-sm font-semibold ${
                      hasToday
                        ? 'border-orange-300/30 bg-orange-400/16 text-orange-200 shadow-[0_0_22px_rgba(249,115,22,0.18)]'
                        : 'border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-secondary)]'
                    }`}>
                      {hasToday ? <Flame className="h-5 w-5" /> : habit.title.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-semibold text-[color:var(--ui-text-strong)]">{habit.title}</h4>
                      <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">连续 {streak} 天 · 本周 {weekCount}/7</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveHabit(habit.id)}
                    className="shrink-0 rounded-full p-2 text-[color:var(--ui-text-muted)] opacity-70 transition-colors hover:bg-red-500/10 hover:text-red-300 group-hover/habit:opacity-100"
                    title="删除习惯"
                    aria-label={`删除习惯：${habit.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative mt-4 grid grid-cols-7 gap-1.5">
                  {recentDays.map((day) => {
                    const checked = logSet.has(day);
                    const isToday = day === todayKey;
                    return (
                      <div key={day} className="flex flex-col items-center gap-1">
                        <div className={`flex h-7 w-full min-w-0 items-center justify-center rounded-full border transition-all ${
                          checked
                            ? 'border-orange-300/45 bg-orange-400/18 text-orange-200 shadow-[0_0_16px_rgba(249,115,22,0.16)]'
                            : isToday
                              ? 'border-[rgba(var(--theme-accent),0.28)] bg-[rgba(var(--theme-accent),0.08)] text-[color:var(--ui-text-secondary)]'
                              : 'border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)]/45 text-[color:var(--ui-text-faint)]'
                        }`}>
                          {checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-55" />}
                        </div>
                        <span className={`text-[10px] ${isToday ? 'text-orange-200' : 'text-[color:var(--ui-text-muted)]'}`}>{day.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => onToggleHabitToday(habit.id)}
                  disabled={hasToday}
                  className={`motion-press relative mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] border text-sm font-semibold transition-all ${
                    hasToday
                      ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                      : 'border-orange-300/35 bg-orange-400/10 text-orange-100 hover:bg-orange-400/16 hover:shadow-[0_14px_34px_rgba(249,115,22,0.16)]'
                  } disabled:cursor-default`}
                >
                  {hasToday ? <CheckCircle2 className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
                  {hasToday ? '今天已完成' : '今日打卡'}
                </button>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
