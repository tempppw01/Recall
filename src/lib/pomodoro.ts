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

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const getDefaultPomodoroState = (): PersistedPomodoroState => ({
  phaseIndex: 0,
  remaining: PHASE_DURATIONS[cycleOrder[0]],
  isRunning: false,
  lastUpdated: Date.now(),
  sessionStartTime: null,
});

export const safelyReadPomodoroState = (): PersistedPomodoroState => {
  if (typeof window === 'undefined') return getDefaultPomodoroState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPomodoroState();
    const parsed = JSON.parse(raw) as PersistedPomodoroState;
    if (typeof parsed?.phaseIndex !== 'number' || typeof parsed?.remaining !== 'number') {
      return getDefaultPomodoroState();
    }
    return {
      phaseIndex: parsed.phaseIndex,
      remaining: parsed.remaining,
      isRunning: Boolean(parsed.isRunning),
      lastUpdated: typeof parsed.lastUpdated === 'number' ? parsed.lastUpdated : Date.now(),
      sessionStartTime: typeof parsed.sessionStartTime === 'number' ? parsed.sessionStartTime : null,
    };
  } catch {
    return getDefaultPomodoroState();
  }
};

export const writePomodoroState = (payload: PersistedPomodoroState) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(POMODORO_STATE_EVENT));
};

export const getResolvedPomodoroState = (source: PersistedPomodoroState, now = Date.now()) => {
  let phaseIndex = source.phaseIndex;
  let remaining = source.remaining;
  let isRunning = source.isRunning;
  let sessionStartTime = source.sessionStartTime ?? null;

  if (isRunning) {
    const elapsed = Math.max(0, Math.floor((now - source.lastUpdated) / 1000));
    if (elapsed >= remaining) {
      const nextIndex = (phaseIndex + 1) % cycleOrder.length;
      phaseIndex = nextIndex;
      remaining = PHASE_DURATIONS[cycleOrder[nextIndex]];
      isRunning = false;
      sessionStartTime = null;
    } else if (elapsed > 0) {
      remaining = Math.max(remaining - elapsed, 0);
    }
  }

  const phase = cycleOrder[phaseIndex] ?? 'focus';
  const totalSeconds = PHASE_DURATIONS[phase];
  const progress = 100 - Math.round((remaining / totalSeconds) * 100);
  const hasActiveSession = isRunning || remaining !== totalSeconds;

  return {
    phaseIndex,
    phase,
    remaining,
    isRunning,
    sessionStartTime,
    totalSeconds,
    progress,
    hasActiveSession,
  };
};
