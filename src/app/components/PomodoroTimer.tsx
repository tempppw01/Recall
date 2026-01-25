"use client";

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

const PHASE_LABELS: Record<PomodoroPhase, string> = {
  focus: '专注',
  shortBreak: '短休息',
  longBreak: '长休息',
};

const PHASE_DURATIONS: Record<PomodoroPhase, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const cycleOrder: PomodoroPhase[] = ['focus', 'shortBreak', 'focus', 'shortBreak', 'focus', 'longBreak'];

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export default function PomodoroTimer() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [remaining, setRemaining] = useState(PHASE_DURATIONS[cycleOrder[0]]);
  const [isRunning, setIsRunning] = useState(false);

  const phase = cycleOrder[phaseIndex] ?? 'focus';
  const totalSeconds = PHASE_DURATIONS[phase];
  const progress = useMemo(() => 100 - Math.round((remaining / totalSeconds) * 100), [remaining, totalSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const handleNextPhase = () => {
    const nextIndex = (phaseIndex + 1) % cycleOrder.length;
    setPhaseIndex(nextIndex);
    setRemaining(PHASE_DURATIONS[cycleOrder[nextIndex]]);
  };

  useEffect(() => {
    if (remaining === 0) {
      handleNextPhase();
    }
  }, [remaining]);

  const resetTimer = () => {
    setIsRunning(false);
    setRemaining(PHASE_DURATIONS[phase]);
  };

  const totalRounds = cycleOrder.length;
  const currentRound = phaseIndex + 1;

  return (
    <div className="space-y-6">
      <div className="bg-[#202020] border border-[#2C2C2C] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#EEEEEE]">番茄时钟</h3>
            <p className="text-xs text-[#777777]">{PHASE_LABELS[phase]} · 第 {currentRound}/{totalRounds} 轮</p>
          </div>
          <span className="text-xs text-[#666666]">默认 25/5/15</span>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <div className="relative w-40 h-40 rounded-full border border-[#2C2C2C] flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(#3B82F6 ${progress * 3.6}deg, #2A2A2A 0deg)`,
              }}
            />
            <div className="relative bg-[#1A1A1A] w-32 h-32 rounded-full flex items-center justify-center text-3xl font-semibold">
              {formatTime(remaining)}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setIsRunning((prev) => !prev)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? '暂停' : '开始'}
            </button>
            <button
              onClick={resetTimer}
              className="flex items-center gap-2 bg-[#2A2A2A] text-[#CCCCCC] px-4 py-2 rounded-lg text-sm hover:text-white hover:bg-[#333333] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
            <button
              onClick={handleNextPhase}
              className="text-xs text-[#888888] hover:text-[#CCCCCC]"
            >
              跳过当前阶段
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#202020] border border-[#2C2C2C] rounded-xl p-4 text-xs text-[#777777] leading-relaxed">
        <p>专注 25 分钟后自动进入短休息，完成三轮后进入长休息。</p>
        <p className="mt-2">此视图独立维护状态，不影响任务列表与日历。</p>
      </div>
    </div>
  );
}