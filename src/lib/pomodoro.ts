'use client';

import { useCallback, useEffect, useState } from 'react';
import { pomodoroStore } from '@/lib/store';

export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  focus: '专注',
  shortBreak: '短休息',
  longBreak: '长休息',
};

export const PHASE_DURATIONS: Record<PomodoroPhase, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const cycleOrder: PomodoroPhase[] = ['focus', 'shortBreak', 'focus', 'shortBreak', 'focus', 'longBreak'];
export const STORAGE_KEY = 'recall_pomodoro_state';
export const POMODORO_STATE_EVENT = 'recall:pomodoro-state';

export type PersistedPomodoroState = {
  phaseIndex: number;
  remaining: number;
  isRunning: boolean;
  lastUpdated: number;
  sessionStartTime?: number | null;
};

export type ResolvedPomodoroState = {
  phaseIndex: number;
  phase: PomodoroPhase;
  remaining: number;
  isRunning: boolean;
  sessionStartTime: number | null;
  totalSeconds: number;
  progress: number;
  hasActiveSession: boolean;
};

const createId = () => Math.random().toString(36).substring(2, 9);

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const getDefaultPomodoroState = (now = Date.now()): PersistedPomodoroState => ({
  phaseIndex: 0,
  remaining: PHASE_DURATIONS[cycleOrder[0]],
  isRunning: false,
  lastUpdated: now,
  sessionStartTime: null,
});

const clampPhaseIndex = (phaseIndex: number) => {
  if (!Number.isFinite(phaseIndex)) return 0;
  return Math.min(Math.max(0, Math.floor(phaseIndex)), cycleOrder.length - 1);
};

const getPhaseDurationByIndex = (phaseIndex: number) => {
  const phase = cycleOrder[phaseIndex] ?? 'focus';
  return PHASE_DURATIONS[phase];
};

export const normalizePomodoroState = (
  source?: Partial<PersistedPomodoroState> | null,
  now = Date.now(),
): PersistedPomodoroState => {
  const defaultState = getDefaultPomodoroState(now);
  const phaseIndex = clampPhaseIndex(source?.phaseIndex ?? defaultState.phaseIndex);
  const phaseDuration = getPhaseDurationByIndex(phaseIndex);
  const rawRemaining = Number.isFinite(source?.remaining) ? Number(source?.remaining) : phaseDuration;
  const remaining = Math.min(Math.max(0, Math.floor(rawRemaining)), phaseDuration);

  return {
    phaseIndex,
    remaining,
    isRunning: Boolean(source?.isRunning),
    lastUpdated: typeof source?.lastUpdated === 'number' ? source.lastUpdated : now,
    sessionStartTime: typeof source?.sessionStartTime === 'number' ? source.sessionStartTime : null,
  };
};

export const safelyReadPomodoroState = (): PersistedPomodoroState => {
  if (typeof window === 'undefined') return getDefaultPomodoroState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPomodoroState();
    return normalizePomodoroState(JSON.parse(raw) as PersistedPomodoroState);
  } catch {
    return getDefaultPomodoroState();
  }
};

export const writePomodoroState = (payload: PersistedPomodoroState) => {
  if (typeof window === 'undefined') return;
  const normalized = normalizePomodoroState(payload);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(POMODORO_STATE_EVENT));
};

const saveFocusRecord = (sessionStartTime: number | null, endTimeMs: number) => {
  const safeEndTimeMs = Number.isFinite(endTimeMs) ? endTimeMs : Date.now();
  const computedStartMs = typeof sessionStartTime === 'number'
    ? sessionStartTime
    : safeEndTimeMs - PHASE_DURATIONS.focus * 1000;
  const durationMinutes = Math.max(1, Math.round((safeEndTimeMs - computedStartMs) / 60000));

  pomodoroStore.add({
    id: createId(),
    startTime: new Date(computedStartMs).toISOString(),
    endTime: new Date(safeEndTimeMs).toISOString(),
    durationMinutes,
  });
};

const getAdvancedPomodoroState = (source: PersistedPomodoroState, now = Date.now()) => {
  const base = normalizePomodoroState(source, now);
  if (!base.isRunning) {
    return { nextState: base, didChange: false };
  }

  const elapsed = Math.max(0, Math.floor((now - base.lastUpdated) / 1000));
  if (elapsed <= 0) {
    return { nextState: base, didChange: false };
  }

  if (elapsed < base.remaining) {
    const consumedAt = base.lastUpdated + elapsed * 1000;
    return {
      nextState: normalizePomodoroState({
        ...base,
        remaining: base.remaining - elapsed,
        lastUpdated: consumedAt,
      }, consumedAt),
      didChange: true,
    };
  }

  const completedPhase = cycleOrder[base.phaseIndex] ?? 'focus';
  const completedAt = base.lastUpdated + base.remaining * 1000;
  if (completedPhase === 'focus') {
    saveFocusRecord(base.sessionStartTime ?? null, completedAt);
  }

  const nextPhaseIndex = (base.phaseIndex + 1) % cycleOrder.length;
  return {
    nextState: normalizePomodoroState({
      phaseIndex: nextPhaseIndex,
      remaining: getPhaseDurationByIndex(nextPhaseIndex),
      isRunning: false,
      lastUpdated: completedAt,
      sessionStartTime: null,
    }, completedAt),
    didChange: true,
  };
};

export const getResolvedPomodoroState = (
  source: PersistedPomodoroState,
  now = Date.now(),
): ResolvedPomodoroState => {
  const normalized = normalizePomodoroState(source, now);
  const phase = cycleOrder[normalized.phaseIndex] ?? 'focus';
  const totalSeconds = PHASE_DURATIONS[phase];
  const progress = 100 - Math.round((normalized.remaining / totalSeconds) * 100);
  const hasActiveSession = normalized.isRunning || normalized.remaining !== totalSeconds;

  return {
    phaseIndex: normalized.phaseIndex,
    phase,
    remaining: normalized.remaining,
    isRunning: normalized.isRunning,
    sessionStartTime: normalized.sessionStartTime ?? null,
    totalSeconds,
    progress,
    hasActiveSession,
  };
};

export const syncPomodoroState = (now = Date.now()) => {
  const base = safelyReadPomodoroState();
  const { nextState, didChange } = getAdvancedPomodoroState(base, now);
  if (didChange) {
    writePomodoroState(nextState);
  }
  return getResolvedPomodoroState(nextState, now);
};

export const togglePomodoroRunning = (now = Date.now()) => {
  const state = syncPomodoroState(now);
  writePomodoroState({
    phaseIndex: state.phaseIndex,
    remaining: state.remaining,
    isRunning: !state.isRunning,
    lastUpdated: now,
    sessionStartTime:
      !state.isRunning && state.phase === 'focus'
        ? (state.sessionStartTime ?? now)
        : state.sessionStartTime,
  });
  return syncPomodoroState(now);
};

export const resetPomodoroTimer = (now = Date.now()) => {
  writePomodoroState(getDefaultPomodoroState(now));
  return syncPomodoroState(now);
};

export const skipPomodoroPhase = (now = Date.now()) => {
  const state = syncPomodoroState(now);
  const nextPhaseIndex = (state.phaseIndex + 1) % cycleOrder.length;
  writePomodoroState({
    phaseIndex: nextPhaseIndex,
    remaining: getPhaseDurationByIndex(nextPhaseIndex),
    isRunning: false,
    lastUpdated: now,
    sessionStartTime: null,
  });
  return syncPomodoroState(now);
};

const getNextPomodoroSyncDelay = (now = Date.now()) => {
  const state = safelyReadPomodoroState();
  if (!state.isRunning) return 1000;

  const elapsedMs = Math.max(0, now - state.lastUpdated);
  const msUntilNextSecond = 1000 - (elapsedMs % 1000);
  return Math.min(Math.max(80, msUntilNextSecond + 12), 1000);
};

export const usePomodoroState = () => {
  const [state, setState] = useState<null | ResolvedPomodoroState>(() => (
    typeof window === 'undefined' ? null : syncPomodoroState(Date.now())
  ));
  const [isReady, setIsReady] = useState(() => typeof window !== 'undefined');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sync = () => {
      setState(syncPomodoroState(Date.now()));
      setIsReady(true);
    };

    sync();
    let timer: number | null = null;
    const scheduleSync = () => {
      timer = window.setTimeout(() => {
        timer = null;
        sync();
        if (timer === null) scheduleSync();
      }, getNextPomodoroSyncDelay(Date.now()));
    };
    scheduleSync();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === STORAGE_KEY) {
        if (timer) window.clearTimeout(timer);
        timer = null;
        sync();
        if (timer === null) scheduleSync();
      }
    };
    const onPomodoroEvent = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
      sync();
      if (timer === null) scheduleSync();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(POMODORO_STATE_EVENT, onPomodoroEvent);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(POMODORO_STATE_EVENT, onPomodoroEvent);
    };
  }, []);

  const syncNow = useCallback(() => {
    const next = syncPomodoroState(Date.now());
    setState(next);
    return next;
  }, []);

  const toggleRunning = useCallback(() => {
    const next = togglePomodoroRunning(Date.now());
    setState(next);
    return next;
  }, []);

  const reset = useCallback(() => {
    const next = resetPomodoroTimer(Date.now());
    setState(next);
    return next;
  }, []);

  const skip = useCallback(() => {
    const next = skipPomodoroPhase(Date.now());
    setState(next);
    return next;
  }, []);

  return {
    isReady,
    state,
    syncNow,
    toggleRunning,
    reset,
    skip,
  };
};
