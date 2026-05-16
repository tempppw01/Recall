"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, SlidersHorizontal, Volume2, Wind } from 'lucide-react';

export const POMODORO_AMBIENT_REQUEST_EVENT = 'recall:pomodoro-ambient-request';

const SOUNDBOX_SOURCE_URL = 'https://soundbox.fun/sounds/wind10-birds60-crickets50-bowl50/';
const AMBIENT_CONFIG_KEY = 'recall_pomodoro_ambient_config';

const SOUND_LIBRARY = [
  { id: 'wind', label: '风', defaultLevel: 10, src: 'https://soundbox.fun/sounds/wind.mp3' },
  { id: 'birds', label: '鸟鸣', defaultLevel: 60, src: 'https://soundbox.fun/sounds/birds.mp3' },
  { id: 'crickets', label: '蟋蟀', defaultLevel: 50, src: 'https://soundbox.fun/sounds/crickets.mp3' },
  { id: 'bowl', label: '颂钵', defaultLevel: 50, src: 'https://soundbox.fun/sounds/bowl.mp3' },
] as const;

type SoundId = (typeof SOUND_LIBRARY)[number]['id'];

type AmbientConfig = {
  masterVolume: number;
  levels: Record<SoundId, number>;
};

type PomodoroAmbientSoundProps = {
  isRunning: boolean;
};

const defaultLevels = SOUND_LIBRARY.reduce((acc, sound) => {
  acc[sound.id] = sound.defaultLevel;
  return acc;
}, {} as Record<SoundId, number>);

const defaultConfig: AmbientConfig = {
  masterVolume: 0.45,
  levels: defaultLevels,
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));
const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

const normalizeConfig = (source?: Partial<AmbientConfig> | null): AmbientConfig => {
  const nextLevels = { ...defaultConfig.levels };
  Object.entries(source?.levels ?? {}).forEach(([key, value]) => {
    if (!SOUND_LIBRARY.some((sound) => sound.id === key)) return;
    nextLevels[key as SoundId] = Number.isFinite(value) ? clampPercent(Number(value)) : 0;
  });

  return {
    masterVolume: Number.isFinite(source?.masterVolume)
      ? clampVolume(Number(source?.masterVolume))
      : defaultConfig.masterVolume,
    levels: nextLevels,
  };
};

export default function PomodoroAmbientSound({ isRunning }: PomodoroAmbientSoundProps) {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [config, setConfig] = useState<AmbientConfig>(defaultConfig);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(AMBIENT_CONFIG_KEY);
    if (!raw) return;
    try {
      setConfig(normalizeConfig(JSON.parse(raw) as Partial<AmbientConfig>));
    } catch {
      setConfig(defaultConfig);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AMBIENT_CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  const selectedSounds = useMemo(
    () => SOUND_LIBRARY.filter((sound) => config.levels[sound.id] > 0),
    [config.levels],
  );

  useEffect(() => {
    SOUND_LIBRARY.forEach((sound) => {
      const audio = audioRefs.current[sound.id];
      if (!audio) return;
      const level = config.levels[sound.id] ?? 0;
      audio.loop = true;
      audio.volume = clampVolume((level / 100) * config.masterVolume);
      if (level <= 0) audio.pause();
    });
  }, [config]);

  const stopAmbientSound = useCallback(() => {
    Object.values(audioRefs.current).forEach((audio) => audio?.pause());
    setIsPlaying(false);
  }, []);

  const playAmbientSound = useCallback(async () => {
    setError(null);
    const audioElements = SOUND_LIBRARY
      .map((sound) => {
        const audio = audioRefs.current[sound.id];
        return audio && config.levels[sound.id] > 0 ? audio : null;
      })
      .filter((audio): audio is HTMLAudioElement => Boolean(audio));

    if (audioElements.length === 0) {
      stopAmbientSound();
      return;
    }

    try {
      await Promise.all(audioElements.map((audio) => audio.play()));
      setIsPlaying(true);
    } catch {
      audioElements.forEach((audio) => audio.pause());
      setIsPlaying(false);
      setError('浏览器拦截了自动播放，请点击番茄“开始”后重试。');
    }
  }, [config.levels, stopAmbientSound]);

  useEffect(() => {
    if (isRunning) {
      void playAmbientSound();
      return;
    }
    stopAmbientSound();
  }, [isRunning, playAmbientSound, stopAmbientSound]);

  useEffect(() => {
    const handleAmbientRequest = (event: Event) => {
      const shouldPlay = Boolean((event as CustomEvent<{ isRunning?: boolean }>).detail?.isRunning);
      if (shouldPlay) {
        void playAmbientSound();
        return;
      }
      stopAmbientSound();
    };

    window.addEventListener(POMODORO_AMBIENT_REQUEST_EVENT, handleAmbientRequest);
    return () => {
      window.removeEventListener(POMODORO_AMBIENT_REQUEST_EVENT, handleAmbientRequest);
    };
  }, [playAmbientSound, stopAmbientSound]);

  useEffect(() => {
    const audioMap = audioRefs.current;
    return () => {
      Object.values(audioMap).forEach((audio) => audio?.pause());
    };
  }, []);

  const updateLevel = (soundId: SoundId, level: number) => {
    setConfig((previous) => normalizeConfig({
      ...previous,
      levels: {
        ...previous.levels,
        [soundId]: level,
      },
    }));
  };

  const updateMasterVolume = (volumePercent: number) => {
    setConfig((previous) => normalizeConfig({
      ...previous,
      masterVolume: volumePercent / 100,
    }));
  };

  const resetToSoundBoxMix = () => {
    setConfig(defaultConfig);
    setError(null);
  };

  const selectedSummary = selectedSounds.length > 0
    ? selectedSounds.map((sound) => `${sound.label} ${config.levels[sound.id]}`).join(' · ')
    : '已静音';
  const masterVolumePercent = Math.round(config.masterVolume * 100);

  return (
    <div className="mt-5 rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[linear-gradient(135deg,rgba(14,165,233,0.10),rgba(34,197,94,0.06))] p-3.5">
      {SOUND_LIBRARY.map((sound) => (
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[color:var(--ui-text-strong)]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
              <Wind className="h-4 w-4" />
            </span>
            <span>番茄背景音</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${
              isRunning && isPlaying
                ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
                : 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-muted)]'
            }`}>
              {isRunning && isPlaying ? '随番茄播放中' : '开始番茄后播放'}
            </span>
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
          <div className="mt-1 truncate text-[11px] text-[color:var(--ui-text-muted)]">{selectedSummary}</div>
          {error && <div className="mt-1 text-[11px] text-amber-300">{error}</div>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-[170px] items-center gap-2 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] px-3 py-2">
            <Volume2 className="h-3.5 w-3.5 shrink-0 text-[color:var(--ui-text-muted)]" />
            <input
              type="range"
              min="0"
              max="100"
              value={masterVolumePercent}
              onChange={(event) => updateMasterVolume(Number(event.target.value))}
              className="h-1.5 min-w-0 flex-1 accent-sky-400"
              aria-label="背景音总音量"
            />
            <span className="w-8 text-right text-[10px] text-[color:var(--ui-text-muted)]">{masterVolumePercent}%</span>
          </label>
          <button
            type="button"
            onClick={resetToSoundBoxMix}
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] px-3 text-[11px] text-[color:var(--ui-text-secondary)] transition-colors hover:border-sky-300/35 hover:text-[color:var(--ui-text-strong)]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            恢复组合
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {SOUND_LIBRARY.map((sound) => {
          const level = config.levels[sound.id];
          return (
            <label
              key={sound.id}
              className="rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] px-3 py-2.5"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[color:var(--ui-text-primary)]">{sound.label}</span>
                <span className="text-[10px] text-[color:var(--ui-text-muted)]">{level}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={level}
                onChange={(event) => updateLevel(sound.id, Number(event.target.value))}
                className="h-1.5 w-full accent-sky-400"
                aria-label={`${sound.label}音量`}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
