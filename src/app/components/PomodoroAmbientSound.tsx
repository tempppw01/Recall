"use client";

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Pause, Play, Volume2, Wind } from 'lucide-react';

const SOUNDBOX_SOURCE_URL = 'https://soundbox.fun/sounds/wind10-birds60-crickets50-bowl50/';
const AMBIENT_VOLUME_KEY = 'recall_pomodoro_ambient_volume';

const AMBIENT_MIX = [
  { id: 'wind', label: '风', volume: 10, src: 'https://soundbox.fun/sounds/wind.mp3' },
  { id: 'birds', label: '鸟鸣', volume: 60, src: 'https://soundbox.fun/sounds/birds.mp3' },
  { id: 'crickets', label: '蟋蟀', volume: 50, src: 'https://soundbox.fun/sounds/crickets.mp3' },
  { id: 'bowl', label: '颂钵', volume: 50, src: 'https://soundbox.fun/sounds/bowl.mp3' },
] as const;

const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

export default function PomodoroAmbientSound() {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.45);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedVolume = window.localStorage.getItem(AMBIENT_VOLUME_KEY);
    if (!storedVolume) return;
    const parsed = Number(storedVolume);
    if (Number.isFinite(parsed)) {
      setMasterVolume(clampVolume(parsed));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AMBIENT_VOLUME_KEY, String(masterVolume));
  }, [masterVolume]);

  useEffect(() => {
    AMBIENT_MIX.forEach((sound) => {
      const audio = audioRefs.current[sound.id];
      if (!audio) return;
      audio.volume = clampVolume((sound.volume / 100) * masterVolume);
      audio.loop = true;
    });
  }, [masterVolume]);

  useEffect(() => {
    const audioMap = audioRefs.current;
    return () => {
      Object.values(audioMap).forEach((audio) => audio?.pause());
    };
  }, []);

  const stopAmbientSound = () => {
    Object.values(audioRefs.current).forEach((audio) => audio?.pause());
    setIsPlaying(false);
  };

  const playAmbientSound = async () => {
    setError(null);
    const audioElements = AMBIENT_MIX
      .map((sound) => audioRefs.current[sound.id])
      .filter((audio): audio is HTMLAudioElement => Boolean(audio));

    try {
      await Promise.all(audioElements.map((audio) => {
        audio.loop = true;
        audio.load();
        return audio.play();
      }));
      setIsPlaying(true);
    } catch {
      audioElements.forEach((audio) => audio.pause());
      setIsPlaying(false);
      setError('浏览器暂时没有允许播放声音，请再点一次播放。');
    }
  };

  const toggleAmbientSound = () => {
    if (isPlaying) {
      stopAmbientSound();
      return;
    }
    void playAmbientSound();
  };

  const mixLabel = AMBIENT_MIX.map((sound) => `${sound.label} ${sound.volume}`).join(' · ');
  const volumePercent = Math.round(masterVolume * 100);

  return (
    <div className="mt-5 rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[linear-gradient(135deg,rgba(14,165,233,0.10),rgba(34,197,94,0.06))] p-3.5">
      {AMBIENT_MIX.map((sound) => (
        <audio
          key={sound.id}
          ref={(node) => {
            audioRefs.current[sound.id] = node;
          }}
          src={sound.src}
          preload="none"
          loop
        />
      ))}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--ui-text-strong)]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
              <Wind className="h-4 w-4" />
            </span>
            <span>专注白噪音</span>
            <a
              href={SOUNDBOX_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-[color:var(--ui-border-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--ui-text-muted)] transition-colors hover:border-sky-300/35 hover:text-sky-300"
              title="打开 SoundBox 原始组合"
            >
              SoundBox
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="mt-1 truncate text-[11px] text-[color:var(--ui-text-muted)]">{mixLabel}</div>
          {error && <div className="mt-1 text-[11px] text-amber-300">{error}</div>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-[160px] items-center gap-2 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] px-3 py-2">
            <Volume2 className="h-3.5 w-3.5 shrink-0 text-[color:var(--ui-text-muted)]" />
            <input
              type="range"
              min="0"
              max="100"
              value={volumePercent}
              onChange={(event) => setMasterVolume(Number(event.target.value) / 100)}
              className="h-1.5 min-w-0 flex-1 accent-sky-400"
              aria-label="白噪音音量"
            />
            <span className="w-8 text-right text-[10px] text-[color:var(--ui-text-muted)]">{volumePercent}%</span>
          </label>
          <button
            type="button"
            onClick={toggleAmbientSound}
            className={`inline-flex h-10 items-center gap-2 rounded-2xl px-3.5 text-sm font-medium text-white transition-colors ${
              isPlaying
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400'
                : 'bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400'
            }`}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? '停止白噪音' : '播放白噪音'}
          </button>
        </div>
      </div>
    </div>
  );
}
