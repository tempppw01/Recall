"use client";

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react';
import { pomodoroStore, PomodoroRecord } from '@/lib/store';
import { PHASE_LABELS, cycleOrder, ensurePomodoroAudioReady, formatTime, usePomodoroState } from '@/lib/pomodoro';

const sortRecords = (records: PomodoroRecord[]) =>
  [...records].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

export default function PomodoroTimer() {
  const { isReady, state, toggleRunning, reset, skip } = usePomodoroState();
  const [records, setRecords] = useState<PomodoroRecord[]>([]);
  const statePhaseIndex = state?.phaseIndex;
  const stateIsRunning = state?.isRunning;

  useEffect(() => {
    setRecords(sortRecords(pomodoroStore.getAll()));
  }, []);

  useEffect(() => {
    if (typeof statePhaseIndex === 'undefined') return;
    setRecords((previous) => {
      const next = sortRecords(pomodoroStore.getAll());
      if (previous.length === next.length && previous[0]?.id === next[0]?.id) {
        return previous;
      }
      return next;
    });
  }, [statePhaseIndex, stateIsRunning]);

  const deleteRecord = (id: string) => {
    if (!confirm('确认删除这条专注记录吗？')) return;
    pomodoroStore.remove(id);
    setRecords(sortRecords(pomodoroStore.getAll()));
  };

  const recordsByDate = useMemo(() => {
    const groups: Record<string, PomodoroRecord[]> = {};
    for (const record of records) {
      const displayDate = new Date(record.startTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      if (!groups[displayDate]) groups[displayDate] = [];
      groups[displayDate].push(record);
    }
    return groups;
  }, [records]);

  if (!isReady || !state) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] p-6 text-center text-sm text-[color:var(--ui-text-muted)]">
          正在恢复番茄状态…
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter((record) => record.startTime.startsWith(today));
  const todayCount = todayRecords.length;
  const todayDuration = todayRecords.reduce((acc, current) => acc + current.durationMinutes, 0);
  const totalCount = records.length;
  const totalDuration = records.reduce((acc, current) => acc + current.durationMinutes, 0);
  const currentRound = state.phaseIndex + 1;
  const totalRounds = cycleOrder.length;
  const overviewCards = [
    { label: '今日番茄', value: String(todayCount), suffix: '', accentClassName: 'from-rose-500/18 to-orange-400/8', borderClassName: 'border-rose-400/16' },
    { label: '今日专注', value: String(todayDuration), suffix: 'm', accentClassName: 'from-sky-500/18 to-cyan-400/8', borderClassName: 'border-sky-400/16' },
    { label: '总番茄', value: String(totalCount), suffix: '', accentClassName: 'from-violet-500/16 to-indigo-400/8', borderClassName: 'border-violet-400/16' },
    { label: '总专注', value: String(totalDuration), suffix: 'm', accentClassName: 'from-emerald-500/16 to-teal-400/8', borderClassName: 'border-emerald-400/16' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--ui-text-strong)]">番茄时钟</h3>
            <p className="text-xs text-[color:var(--ui-text-muted)]">
              {PHASE_LABELS[state.phase]} · 第 {currentRound}/{totalRounds} 轮
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-muted)]">
            默认 25/5/15
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl border ${card.borderClassName} bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-3.5 py-3`}
            >
              <div className={`h-1.5 w-10 rounded-full bg-gradient-to-r ${card.accentClassName}`} />
              <div className="mt-2 text-[11px] text-[color:var(--ui-text-muted)]">{card.label}</div>
              <div className="mt-1 flex items-end gap-1">
                <span className="text-xl font-semibold leading-none text-[color:var(--ui-text-strong)]">{card.value}</span>
                {card.suffix ? <span className="text-[11px] text-[color:var(--ui-text-muted)]">{card.suffix}</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center">
          <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(rgb(var(--theme-accent)) ${state.progress * 3.6}deg, rgba(148, 163, 184, 0.18) 0deg)`,
              }}
            />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-0)] text-3xl font-semibold text-[color:var(--ui-text-strong)]">
              {formatTime(state.remaining)}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => {
                void ensurePomodoroAudioReady();
                toggleRunning();
              }}
              className="flex items-center gap-2 rounded-lg bg-[rgba(248,113,113,0.92)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(248,113,113,0.18)] transition-colors hover:bg-[rgba(239,68,68,0.96)]"
            >
              {state.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {state.isRunning ? '暂停' : state.hasActiveSession ? '继续' : '开始'}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 rounded-lg border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] px-4 py-2 text-sm text-[color:var(--ui-text-primary)] transition-colors hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)]"
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </button>
            <button onClick={skip} className="text-xs text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text-strong)]">
              跳过
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-[color:var(--ui-text-strong)]">专注记录</h3>
          <div className="text-xs text-[color:var(--ui-text-muted)]">专注阶段结束后自动记录</div>
        </div>

        <div className="space-y-4">
          {Object.entries(recordsByDate).map(([date, dateRecords]) => (
            <div key={date}>
              <div className="mb-2 text-xs text-[color:var(--ui-text-muted)]">{date}</div>
              <div className="space-y-2">
                {dateRecords.map((record) => (
                  <div key={record.id} className="group flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                        <TimerIcon className="h-4 w-4" />
                      </div>
                      <div className="text-sm text-[color:var(--ui-text-primary)]">
                        {new Date(record.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(record.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[color:var(--ui-text-muted)]">{record.durationMinutes}m</span>
                      <button
                        onClick={() => deleteRecord(record.id)}
                        className="text-[color:var(--ui-text-faint)] opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      >
                        <RotateCcw className="h-3 w-3 rotate-45" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {records.length === 0 && (
            <div className="py-8 text-center text-xs text-[color:var(--ui-text-muted)]">暂无专注记录，开始一个番茄钟吧！</div>
          )}
        </div>
      </div>
    </div>
  );
}
