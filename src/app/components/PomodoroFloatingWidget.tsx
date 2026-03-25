"use client";

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Timer, X } from 'lucide-react';
import {
  PHASE_DURATIONS,
  PHASE_LABELS,
  POMODORO_STATE_EVENT,
  cycleOrder,
  formatTime,
  getDefaultPomodoroState,
  getResolvedPomodoroState,
  safelyReadPomodoroState,
  writePomodoroState,
} from '@/lib/pomodoro';

type PomodoroFloatingWidgetProps = {
  onOpenPomodoro: () => void;
};

export default function PomodoroFloatingWidget({ onOpenPomodoro }: PomodoroFloatingWidgetProps) {
  const [tick, setTick] = useState(Date.now());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const sync = () => {
      setTick(Date.now());
      const base = safelyReadPomodoroState();
      const resolved = getResolvedPomodoroState(base, Date.now());
      if (resolved.hasActiveSession) {
        setDismissed(false);
      }
      if (
        (resolved.phaseIndex !== base.phaseIndex || resolved.remaining !== base.remaining || resolved.isRunning !== base.isRunning)
      ) {
        writePomodoroState({
          phaseIndex: resolved.phaseIndex,
          remaining: resolved.remaining,
          isRunning: resolved.isRunning,
          lastUpdated: Date.now(),
          sessionStartTime: resolved.sessionStartTime,
        });
      }
    };

    sync();
    const timer = window.setInterval(sync, 1000);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'recall_pomodoro_state') sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(POMODORO_STATE_EVENT, sync as EventListener);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(POMODORO_STATE_EVENT, sync as EventListener);
    };
  }, []);

  const state = useMemo(() => {
    const base = safelyReadPomodoroState();
    return getResolvedPomodoroState(base, tick);
  }, [tick]);

  if (!state.hasActiveSession || dismissed) return null;

  const toggleRunning = () => {
    const base = safelyReadPomodoroState();
    const resolved = getResolvedPomodoroState(base, Date.now());
    writePomodoroState({
      phaseIndex: resolved.phaseIndex,
      remaining: resolved.remaining,
      isRunning: !resolved.isRunning,
      lastUpdated: Date.now(),
      sessionStartTime: !resolved.isRunning && resolved.phase === 'focus'
        ? (resolved.sessionStartTime ?? Date.now())
        : resolved.sessionStartTime,
    });
    setTick(Date.now());
  };

  const resetTimer = () => {
    const phase = cycleOrder[state.phaseIndex] ?? 'focus';
    writePomodoroState({
      phaseIndex: state.phaseIndex,
      remaining: PHASE_DURATIONS[phase],
      isRunning: false,
      lastUpdated: Date.now(),
      sessionStartTime: null,
    });
    setTick(Date.now());
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[65] w-[min(88vw,320px)] rounded-2xl border border-[rgba(var(--theme-accent),0.26)] bg-[rgba(19,22,28,0.94)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpenPomodoro} className="min-w-0 text-left flex-1">
          <div className="flex items-center gap-2 text-[11px] text-[#8FA1C8]">
            <Timer className="w-3.5 h-3.5 text-blue-300" />
            番茄时钟进行中
          </div>
          <div className="mt-1 text-base font-semibold text-[#F3F6FF]">{formatTime(state.remaining)}</div>
          <div className="mt-0.5 text-xs text-[#7d8595]">{PHASE_LABELS[state.phase]} · 点击回到番茄时钟</div>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-full border border-[var(--ui-border-soft)] p-1 text-[#8A94A7] hover:text-white hover:border-[#55607A]"
          title="收起悬浮组件"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(92,123,250,0.9),rgba(110,231,255,0.85))] transition-all duration-300"
          style={{ width: `${state.progress}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleRunning}
          className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(var(--theme-accent),0.35)] bg-[rgba(var(--theme-accent),0.12)] px-3 py-1.5 text-xs text-[#E7EEFF] hover:bg-[rgba(var(--theme-accent),0.18)]"
        >
          {state.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {state.isRunning ? '暂停' : '继续'}
        </button>
        <button
          type="button"
          onClick={resetTimer}
          className="rounded-full border border-[var(--ui-border-soft)] px-3 py-1.5 text-xs text-[#9AA3B5] hover:text-white hover:border-[#55607A]"
        >
          重置
        </button>
      </div>
    </div>
  );
}
