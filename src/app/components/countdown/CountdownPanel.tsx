import { Bot, CalendarDays, Check, Clock3, Edit3, Pin, PinOff, Plus, Send, Sparkles, Timer, Trash2 } from 'lucide-react';
import type { Countdown } from '@/lib/store';
import type { AgentMessage, CountdownAgentItem, CountdownDisplayMode } from '@/app/homeTypes';

type CountdownPanelProps = {
  countdowns: Countdown[];
  countdownDisplayMode: CountdownDisplayMode;
  countdownAgentMessages: AgentMessage[];
  countdownAgentInput: string;
  countdownAgentLoading: boolean;
  countdownAgentError: string | null;
  countdownAgentItems: CountdownAgentItem[];
  addedCountdownAgentItemIds: Set<string>;
  showCountdownAgentBulkAdd: boolean;
  setCountdownAgentInput: (value: string) => void;
  onOpenCreate: () => void;
  onOpenEdit: (item: Countdown) => void;
  onTogglePinned: (item: Countdown) => void;
  onRemove: (itemId: string) => void;
  onAgentSend: () => void;
  onAddAgentItem: (item: CountdownAgentItem) => void;
  onAddAllAgentItems: () => void;
};

type CountdownEntry = {
  item: Countdown;
  diff: number;
  displayDays: number;
  isPast: boolean;
};

const formatCountdownDate = (dateText: string) => {
  const [year, month, day] = dateText.split('-');
  if (!year || !month || !day) return dateText;
  return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}`;
};

const getCountdownDays = (targetDate: string) => {
  const target = new Date(targetDate);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getEntryTone = (entry: CountdownEntry) => {
  if (entry.isPast) return 'rose';
  if (entry.displayDays <= 30) return 'amber';
  return 'accent';
};

const getStatusLabel = (entry: CountdownEntry) => {
  if (entry.isPast) return '已过去';
  if (entry.displayDays === 0) return '今天';
  if (entry.displayDays <= 30) return '临近';
  return '未来';
};

const toneClassName = (tone: 'accent' | 'amber' | 'rose') => {
  if (tone === 'rose') {
    return {
      rail: 'bg-rose-400',
      chip: 'bg-rose-500/10 text-rose-300',
      value: 'text-rose-300',
    };
  }
  if (tone === 'amber') {
    return {
      rail: 'bg-amber-300',
      chip: 'bg-amber-400/10 text-amber-300',
      value: 'text-amber-300',
    };
  }
  return {
    rail: 'bg-[rgba(var(--theme-accent),0.92)]',
    chip: 'bg-[rgba(var(--theme-accent),0.10)] text-[rgba(var(--theme-accent),0.95)]',
    value: 'text-[rgba(var(--theme-accent),0.96)]',
  };
};

export default function CountdownPanel({
  countdowns,
  countdownDisplayMode,
  countdownAgentMessages,
  countdownAgentInput,
  countdownAgentLoading,
  countdownAgentError,
  countdownAgentItems,
  addedCountdownAgentItemIds,
  showCountdownAgentBulkAdd,
  setCountdownAgentInput,
  onOpenCreate,
  onOpenEdit,
  onTogglePinned,
  onRemove,
  onAgentSend,
  onAddAgentItem,
  onAddAllAgentItems,
}: CountdownPanelProps) {
  const enrichedCountdowns = countdowns
    .map((item) => {
      const diff = getCountdownDays(item.targetDate);
      return {
        item,
        diff,
        displayDays: Math.abs(diff),
        isPast: diff < 0,
      };
    })
    .sort((left, right) => {
      if (left.item.pinned !== right.item.pinned) return left.item.pinned ? -1 : 1;
      if (left.isPast !== right.isPast) return left.isPast ? 1 : -1;
      return left.diff - right.diff;
    });

  const upcoming = enrichedCountdowns.filter((entry) => !entry.isPast);
  const past = enrichedCountdowns.filter((entry) => entry.isPast);
  const pinnedCount = countdowns.filter((item) => item.pinned).length;
  const nearest = upcoming[0];
  const groupedCountdowns = [
    { key: 'pinned', title: '置顶', entries: enrichedCountdowns.filter((entry) => entry.item.pinned) },
    { key: 'upcoming', title: '未来', entries: enrichedCountdowns.filter((entry) => !entry.item.pinned && !entry.isPast) },
    { key: 'past', title: '已过去', entries: enrichedCountdowns.filter((entry) => !entry.item.pinned && entry.isPast) },
  ].filter((group) => group.entries.length > 0);

  const submitAgent = () => {
    if (!countdownAgentInput.trim() || countdownAgentLoading) return;
    onAgentSend();
  };

  return (
    <div className="theme-native-surface grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,0.32fr)]">
      <div className="min-w-0 space-y-3">
        <section className="app-section motion-enter overflow-hidden rounded-[24px]">
          <div className="relative border-b border-[color:var(--ui-border-soft)] px-3.5 py-2.5 sm:px-4">
            <div className="pointer-events-none absolute -right-10 -top-20 h-44 w-44 rounded-full bg-[rgba(var(--theme-accent),0.13)] blur-3xl" />
            <div className="relative flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.11)] text-[rgba(var(--theme-accent),0.95)]">
                  <Timer className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ui-text-muted)]">Countdown</p>
                  <h3 className="truncate text-lg font-semibold tracking-tight text-[color:var(--ui-text-strong)]">倒数日</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenCreate}
                className="motion-press surface-sheen inline-flex h-10 items-center gap-2 rounded-[16px] border border-[rgba(var(--theme-accent),0.32)] bg-[linear-gradient(135deg,rgba(var(--theme-accent),0.92),rgba(var(--theme-grad-end),0.82))] px-3.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(var(--theme-accent),0.20)]"
              >
                <Plus className="h-4 w-4" />
                新建
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-[color:var(--ui-border-soft)] p-2.5 sm:grid-cols-4">
            {[
              ['总数', countdowns.length],
              ['未来', upcoming.length],
              ['已过去', past.length],
              ['置顶', pinnedCount],
            ].map(([label, value]) => (
              <div key={label} className="app-micro-card rounded-[16px] px-3 py-2">
                <p className="text-[10px] text-[color:var(--ui-text-muted)]">{label}</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[color:var(--ui-text-strong)]">{value}</p>
              </div>
            ))}
          </div>

          {nearest && (
            <div className="flex min-w-0 items-center gap-2 border-b border-[color:var(--ui-border-soft)] px-3.5 py-2.5 text-xs sm:px-4">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[rgba(var(--theme-accent),0.95)]" />
              <span className="shrink-0 text-[color:var(--ui-text-muted)]">下一件</span>
              <span className="min-w-0 flex-1 truncate font-medium text-[color:var(--ui-text-strong)]">{nearest.item.title}</span>
              <span className="shrink-0 rounded-full bg-[rgba(var(--theme-accent),0.10)] px-2 py-0.5 text-[rgba(var(--theme-accent),0.95)]">
                {nearest.displayDays === 0 ? '今天' : `${nearest.displayDays} 天后`}
              </span>
            </div>
          )}

          {countdowns.length === 0 ? (
            <div className="flex min-h-[18rem] flex-col items-center justify-center px-6 text-center">
              <div className="icon-halo float-bob flex h-16 w-16 items-center justify-center rounded-[28px] border border-[rgba(var(--theme-accent),0.25)] bg-[rgba(var(--theme-accent),0.12)] text-[rgba(var(--theme-accent),0.95)]">
                <CalendarDays className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[color:var(--ui-text-strong)]">先记下一个值得期待的日子</h3>
              <p className="mt-2 max-w-sm text-sm text-[color:var(--ui-text-secondary)]">生日、旅行、考试、发布日，都可以放在这里。</p>
            </div>
          ) : (
            <div className="space-y-2.5 p-2.5">
              {groupedCountdowns.map((group) => (
                <div key={group.key} className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ui-text-muted)]">{group.title}</p>
                    <span className="text-[11px] tabular-nums text-[color:var(--ui-text-faint)]">{group.entries.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {group.entries.map((entry, index) => {
                      const tone = toneClassName(getEntryTone(entry));
                      return (
                        <article
                          key={entry.item.id}
                          className="motion-card motion-enter group/countdown app-micro-card relative grid min-h-[56px] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-[18px] px-3 py-2 transition-all hover:-translate-y-0.5 hover:bg-[color:var(--ui-card-hover-bg)]"
                          style={{ animationDelay: `${Math.min(index * 22, 160)}ms` }}
                        >
                          <span className={`absolute bottom-2 left-0 top-2 w-1 rounded-r-full ${tone.rail}`} />
                          <div className="min-w-0 pl-2">
                            <div className="flex min-w-0 items-center gap-2">
                              {entry.item.pinned && (
                                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-amber-400/14 text-amber-300">
                                  <Pin className="h-3 w-3" />
                                </span>
                              )}
                              <h4 className="truncate text-sm font-semibold text-[color:var(--ui-text-strong)]">{entry.item.title}</h4>
                            </div>
                            <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] text-[color:var(--ui-text-muted)]">
                              <span className="shrink-0 tabular-nums">{formatCountdownDate(entry.item.targetDate)}</span>
                              <span className="text-[color:var(--ui-text-faint)]">·</span>
                              <span className={`shrink-0 rounded-full px-1.5 py-0.5 ${tone.chip}`}>{getStatusLabel(entry)}</span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <div className="min-w-[4.2rem] text-right">
                              {countdownDisplayMode === 'date' ? (
                                <>
                                  <p className={`text-sm font-semibold tabular-nums ${tone.value}`}>{formatCountdownDate(entry.item.targetDate)}</p>
                                  <p className="text-[10px] text-[color:var(--ui-text-muted)]">{entry.isPast ? `${entry.displayDays} 天前` : `${entry.displayDays} 天后`}</p>
                                </>
                              ) : (
                                <>
                                  <p className={`text-2xl font-semibold leading-none tabular-nums ${tone.value}`}>{entry.displayDays}</p>
                                  <p className="mt-0.5 text-[10px] text-[color:var(--ui-text-muted)]">{entry.isPast ? '天前' : '天后'}</p>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/countdown:opacity-100 sm:group-focus-within/countdown:opacity-100">
                              <button
                                type="button"
                                onClick={() => onTogglePinned(entry.item)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-card-bg)] hover:text-[color:var(--ui-text-strong)]"
                                title={entry.item.pinned ? '取消置顶' : '置顶'}
                                aria-label={entry.item.pinned ? `取消置顶：${entry.item.title}` : `置顶：${entry.item.title}`}
                              >
                                {entry.item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenEdit(entry.item)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-card-bg)] hover:text-[color:var(--ui-text-strong)]"
                                title="编辑"
                                aria-label={`编辑倒数日：${entry.item.title}`}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemove(entry.item.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--ui-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-300"
                                title="删除"
                                aria-label={`删除倒数日：${entry.item.title}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="min-w-0 space-y-3 xl:sticky xl:top-3 xl:self-start">
        <section className="app-section motion-enter rounded-[22px] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-[rgba(var(--theme-accent),0.12)] text-[rgba(var(--theme-accent),0.95)]">
                  <Bot className="h-4 w-4" />
                </span>
                <h3 className="truncate text-sm font-semibold text-[color:var(--ui-text-strong)]">日期识别</h3>
              </div>
              <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">一句话提取重要日期</p>
            </div>
            <Sparkles className="h-4 w-4 text-[color:var(--ui-text-faint)]" />
          </div>

          <div className="mt-3 max-h-[30vh] space-y-2 overflow-y-auto pr-1">
            {countdownAgentMessages.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)]/45 px-3 py-2 text-xs text-[color:var(--ui-text-muted)]">
                例如：“10 月 1 日去旅行”。
              </div>
            ) : (
              countdownAgentMessages.slice(-4).map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`w-fit max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    message.role === 'user'
                      ? 'ml-auto bg-[rgba(var(--theme-accent),0.16)] text-[color:var(--ui-text-strong)]'
                      : 'mr-auto border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-primary)]'
                  }`}
                >
                  {message.content}
                </div>
              ))
            )}
          </div>

          {countdownAgentError && (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-[16px] border border-red-500/25 bg-red-500/10 p-2 text-xs text-red-300">
              <span className="whitespace-pre-wrap leading-relaxed">{countdownAgentError}</span>
              <button type="button" onClick={onAgentSend} disabled={countdownAgentLoading} className="shrink-0 text-red-200 underline hover:text-white">
                重试
              </button>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={countdownAgentInput}
              onChange={(event) => setCountdownAgentInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submitAgent();
                }
              }}
              placeholder="例如：10 月 1 日去旅行"
              className="ui-input min-h-11 min-w-0 flex-1 rounded-[16px] px-3 text-sm"
              disabled={countdownAgentLoading}
            />
            <button
              type="button"
              onClick={submitAgent}
              disabled={countdownAgentLoading || !countdownAgentInput.trim()}
              className="motion-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[rgba(var(--theme-accent),0.88)] text-white shadow-[0_12px_26px_rgba(var(--theme-accent),0.22)] disabled:cursor-not-allowed disabled:opacity-50"
              title={countdownAgentLoading ? '识别中' : '发送'}
              aria-label={countdownAgentLoading ? '识别中' : '发送'}
            >
              {countdownAgentLoading ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </section>

        <section className="app-section-quiet rounded-[22px] p-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-[color:var(--ui-text-strong)]">识别结果</h4>
            {showCountdownAgentBulkAdd && (
              <button
                type="button"
                onClick={onAddAllAgentItems}
                disabled={countdownAgentItems.length === 0 || addedCountdownAgentItemIds.size === countdownAgentItems.length}
                className="rounded-full border border-[rgba(var(--theme-accent),0.3)] px-2.5 py-1 text-[11px] text-[rgba(var(--theme-accent),0.95)] transition-colors hover:bg-[rgba(var(--theme-accent),0.1)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                全部添加
              </button>
            )}
          </div>

          {countdownAgentItems.length === 0 ? (
            <div className="mt-3 rounded-[18px] border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)]/36 px-3 py-3 text-xs text-[color:var(--ui-text-muted)]">
              识别后的日期会在这里变成可采纳的小卡片。
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {countdownAgentItems.map((item) => {
                const isAdded = addedCountdownAgentItemIds.has(item.id);
                const hasDate = Boolean(item.targetDate);
                return (
                  <div key={item.id} className="app-micro-card rounded-[18px] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[color:var(--ui-text-strong)]">{item.title}</p>
                        <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">{item.targetDate || '未识别日期'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAddAgentItem(item)}
                        disabled={isAdded || !hasDate}
                        className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors ${
                          isAdded
                            ? 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-muted)]'
                            : hasDate
                              ? 'border-[rgba(var(--theme-accent),0.32)] text-[rgba(var(--theme-accent),0.95)] hover:bg-[rgba(var(--theme-accent),0.1)]'
                              : 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-faint)]'
                        }`}
                      >
                        {isAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        {isAdded ? '已加' : hasDate ? '采纳' : '缺日期'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
