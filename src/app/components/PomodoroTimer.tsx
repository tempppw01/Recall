"use client";

/**
 * 番茄钟组件
 *
 * 功能：
 * - 专注/短休息/长休息循环计时
 * - 本地持久化当前计时状态（刷新后可恢复）
 * - 记录专注时段历史（保存到 pomodoroStore）
 * - 秒级提示音
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Plus, MoreHorizontal, Timer as TimerIcon } from 'lucide-react';
import { pomodoroStore, PomodoroRecord } from '@/lib/store';

/** 番茄钟阶段 */
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
const STORAGE_KEY = 'recall_pomodoro_state';

/** 将秒数格式化为 mm:ss */
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/** 生成本地记录 ID */
const createId = () => Math.random().toString(36).substring(2, 9);

export default function PomodoroTimer() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [remaining, setRemaining] = useState(PHASE_DURATIONS[cycleOrder[0]]);
  const [isRunning, setIsRunning] = useState(false);
  const [records, setRecords] = useState<PomodoroRecord[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousRemainingRef = useRef(remaining);
  const sessionStartTimeRef = useRef<number | null>(null);

  const phase = cycleOrder[phaseIndex] ?? 'focus';
  const totalSeconds = PHASE_DURATIONS[phase];
  const progress = useMemo(() => 100 - Math.round((remaining / totalSeconds) * 100), [remaining, totalSeconds]);

  useEffect(() => {
    setRecords(pomodoroStore.getAll().sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
  }, []);

  const saveRecord = (durationMinutes: number, endTime = new Date()) => {
    // 只有专注阶段才记录
    if (phase !== 'focus') return;
    const startTime = sessionStartTimeRef.current 
      ? new Date(sessionStartTimeRef.current).toISOString() 
      : new Date(endTime.getTime() - durationMinutes * 60000).toISOString();
    
    const record: PomodoroRecord = {
      id: createId(),
      startTime,
      endTime: endTime.toISOString(),
      durationMinutes,
    };
    pomodoroStore.add(record);
    setRecords(pomodoroStore.getAll().sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
    sessionStartTimeRef.current = null;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        phaseIndex: number;
        remaining: number;
        isRunning: boolean;
        lastUpdated: number;
        sessionStartTime?: number;
      };
      if (typeof parsed.phaseIndex !== 'number' || typeof parsed.remaining !== 'number') {
        return;
      }

      let nextPhaseIndex = parsed.phaseIndex;
      let nextRemaining = parsed.remaining;
      let nextIsRunning = parsed.isRunning;

      if (parsed.sessionStartTime) {
        sessionStartTimeRef.current = parsed.sessionStartTime;
      }

      if (parsed.isRunning && typeof parsed.lastUpdated === 'number') {
        const elapsed = Math.floor((Date.now() - parsed.lastUpdated) / 1000);
        if (elapsed >= nextRemaining) {
          // 自动完成
          const currentPhase = cycleOrder[nextPhaseIndex];
          if (currentPhase === 'focus') {
            const duration = Math.round(PHASE_DURATIONS.focus / 60);
            // 这里我们无法直接调用 saveRecord 因为闭包问题和状态更新时机，
            // 简单处理：如果恢复时发现已经结束了，就自动进入下一阶段，不补录记录（或者补录但时间可能不准）
            // 为了准确性，这里仅重置状态，不自动保存记录以免数据混乱。
            // 用户体验权衡：如果后台跑完了，用户回来看到“已完成”，手动点确认更好。
            // 但为了自动化，我们直接进入下一阶段。
          }
          const advancedIndex = (nextPhaseIndex + 1) % cycleOrder.length;
          nextPhaseIndex = advancedIndex;
          nextRemaining = PHASE_DURATIONS[cycleOrder[advancedIndex]];
          nextIsRunning = false;
          sessionStartTimeRef.current = null;
        } else if (elapsed > 0) {
          nextRemaining = Math.max(nextRemaining - elapsed, 0);
        }
      }

      setPhaseIndex(nextPhaseIndex);
      setRemaining(nextRemaining);
      setIsRunning(nextIsRunning);
    } catch (error) {
      console.error('Failed to restore pomodoro state', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      phaseIndex,
      remaining,
      isRunning,
      lastUpdated: Date.now(),
      sessionStartTime: sessionStartTimeRef.current,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [phaseIndex, remaining, isRunning]);

  useEffect(() => {
    if (isRunning && !sessionStartTimeRef.current && phase === 'focus') {
      sessionStartTimeRef.current = Date.now();
    }
    if (!isRunning) return;
    
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // 计时结束
          setIsRunning(false);
          if (phase === 'focus') {
            saveRecord(Math.round(PHASE_DURATIONS.focus / 60));
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, phase]);

  const ensureAudioContext = () => {
    if (typeof window === 'undefined') return;
    if (!audioContextRef.current) {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;
      audioContextRef.current = new AudioContextCtor();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playTickSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1200, now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.08);
  };

  useEffect(() => {
    if (!isRunning) {
      previousRemainingRef.current = remaining;
      return;
    }
    if (remaining > 0 && remaining < previousRemainingRef.current) {
      playTickSound();
    }
    previousRemainingRef.current = remaining;
  }, [isRunning, remaining]);

  useEffect(() => {
    return () => {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  const handleNextPhase = () => {
    const nextIndex = (phaseIndex + 1) % cycleOrder.length;
    setPhaseIndex(nextIndex);
    setRemaining(PHASE_DURATIONS[cycleOrder[nextIndex]]);
    setIsRunning(false);
    sessionStartTimeRef.current = null;
  };

  useEffect(() => {
    if (remaining === 0 && !isRunning) {
      // 倒计时结束后的自动跳转逻辑已经在 interval 里处理了一部分（状态置为 false）
      // 这里可以处理阶段切换，给用户一个手动确认的过程会更好，但这里先自动切
      const timer = setTimeout(() => {
        handleNextPhase();
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [remaining, isRunning]);

  const resetTimer = () => {
    setIsRunning(false);
    setRemaining(PHASE_DURATIONS[phase]);
    sessionStartTimeRef.current = null;
  };

  const deleteRecord = (id: string) => {
    if (!confirm('确认删除这条专注记录吗？')) return;
    pomodoroStore.remove(id);
    setRecords(pomodoroStore.getAll().sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
  };

  const totalRounds = cycleOrder.length;
  const currentRound = phaseIndex + 1;

  // 统计数据
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.startTime.startsWith(today));
  const todayCount = todayRecords.length;
  const todayDuration = todayRecords.reduce((acc, cur) => acc + cur.durationMinutes, 0);
  const totalCount = records.length;
  const totalDuration = records.reduce((acc, cur) => acc + cur.durationMinutes, 0);

  // 按日期分组记录
  const recordsByDate = useMemo(() => {
    const groups: Record<string, PomodoroRecord[]> = {};
    records.forEach(r => {
      const date = r.startTime.split('T')[0];
      const displayDate = new Date(r.startTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      if (!groups[displayDate]) groups[displayDate] = [];
      groups[displayDate].push(r);
    });
    return groups;
  }, [records]);

  return (
    <div className="space-y-6">
      {/* 概览统计 */}
      <div>
        <h3 className="text-base font-bold text-[#EEEEEE] mb-3">概览</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#202020] border border-[#2C2C2C] rounded-xl p-4">
            <div className="text-xs text-[#888888] mb-1">今日番茄</div>
            <div className="text-2xl font-semibold text-[#EEEEEE]">{todayCount}</div>
          </div>
          <div className="bg-[#202020] border border-[#2C2C2C] rounded-xl p-4">
            <div className="text-xs text-[#888888] mb-1">今日专注时长</div>
            <div className="text-2xl font-semibold text-[#EEEEEE]">
              {todayDuration} <span className="text-sm font-normal text-[#666666]">m</span>
            </div>
          </div>
          <div className="bg-[#202020] border border-[#2C2C2C] rounded-xl p-4">
            <div className="text-xs text-[#888888] mb-1">总番茄</div>
            <div className="text-2xl font-semibold text-[#EEEEEE]">{totalCount}</div>
          </div>
          <div className="bg-[#202020] border border-[#2C2C2C] rounded-xl p-4">
            <div className="text-xs text-[#888888] mb-1">总专注时长</div>
            <div className="text-2xl font-semibold text-[#EEEEEE]">
              {totalDuration} <span className="text-sm font-normal text-[#666666]">m</span>
            </div>
          </div>
        </div>
      </div>

      {/* 计时器主体 */}
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
              onClick={() => {
                ensureAudioContext();
                setIsRunning((prev) => !prev);
              }}
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
              跳过
            </button>
          </div>
        </div>
      </div>

      {/* 专注记录列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-[#EEEEEE]">专注记录</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                const mins = prompt('输入专注时长（分钟）', '25');
                if (mins && !isNaN(Number(mins))) {
                  saveRecord(Number(mins));
                }
              }}
              className="p-1 rounded hover:bg-[#333333] text-[#888888]" title="手动添加记录"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button className="p-1 rounded hover:bg-[#333333] text-[#888888]"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        </div>
        
        <div className="space-y-4">
          {Object.entries(recordsByDate).map(([date, dateRecords]) => (
            <div key={date}>
              <div className="text-xs text-[#666666] mb-2">{date}</div>
              <div className="space-y-2">
                {dateRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <TimerIcon className="w-4 h-4" />
                      </div>
                      <div className="text-sm text-[#CCCCCC]">
                        {new Date(record.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} - {new Date(record.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#666666]">{record.durationMinutes}m</span>
                      <button 
                        onClick={() => deleteRecord(record.id)}
                        className="text-[#444444] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <RotateCcw className="w-3 h-3 rotate-45" /> {/* Use rotate as delete icon */}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {records.length === 0 && (
            <div className="text-center py-8 text-xs text-[#555555]">暂无专注记录，开始一个番茄钟吧！</div>
          )}
        </div>
      </div>
    </div>
  );
}
