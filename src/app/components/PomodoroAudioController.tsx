"use client";

import { useEffect, useRef } from 'react';
import { playPomodoroTickSound, usePomodoroState } from '@/lib/pomodoro';

export default function PomodoroAudioController() {
  const { state } = usePomodoroState();
  const previousRemainingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state) return;

    const previousRemaining = previousRemainingRef.current;
    if (!state.isRunning) {
      previousRemainingRef.current = state.remaining;
      return;
    }

    if (previousRemaining !== null && state.remaining > 0 && state.remaining < previousRemaining) {
      playPomodoroTickSound();
    }

    previousRemainingRef.current = state.remaining;
  }, [state]);

  return null;
}
