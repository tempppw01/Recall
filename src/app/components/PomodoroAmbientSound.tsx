"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, SlidersHorizontal, Volume2, Wind } from 'lucide-react';
import { usePomodoroState } from '@/lib/pomodoro';

export const POMODORO_AMBIENT_REQUEST_EVENT = 'recall:pomodoro-ambient-request';
export const POMODORO_AMBIENT_CONFIG_EVENT = 'recall:pomodoro-ambient-config';

const SOUNDBOX_HOME_URL = 'https://soundbox.fun/sounds/';
const AMBIENT_CONFIG_KEY = 'recall_pomodoro_ambient_config';

const SOUND_LIBRARY = [
  { id: 'rain', label: '雨声', src: 'https://soundbox.fun/sounds/rain.mp3' },
  { id: 'thunder', label: '雷声', src: 'https://soundbox.fun/sounds/thunder.mp3' },
  { id: 'waves', label: '海浪', src: 'https://soundbox.fun/sounds/waves.mp3' },
  { id: 'wind', label: '风', src: 'https://soundbox.fun/sounds/wind.mp3' },
  { id: 'fire', label: '篝火', src: 'https://soundbox.fun/sounds/fire.mp3' },
  { id: 'birds', label: '鸟鸣', src: 'https://soundbox.fun/sounds/birds.mp3' },
  { id: 'crickets', label: '蟋蟀', src: 'https://soundbox.fun/sounds/crickets.mp3' },
  { id: 'coffee', label: '咖啡馆', src: 'https://soundbox.fun/sounds/coffee.mp3' },
  { id: 'bowl', label: '颂钵', src: 'https://soundbox.fun/sounds/bowl.mp3' },
  { id: 'white', label: '白噪音', src: 'https://soundbox.fun/sounds/white.mp3' },
] as const;

type SoundId = (typeof SOUND_LIBRARY)[number]['id'];

type AmbientConfig = {
  masterVolume: number;
  levels: Record<SoundId, number>;
  presetId?: string;
};

type SoundPreset = {
  id: string;
  label: string;
  description: string;
  levels: Record<SoundId, number>;
};

type PomodoroAmbientSoundProps = {
  isRunning: boolean;
  showControls?: boolean;
  enablePlayback?: boolean;
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));
const clampVolume = (value: number) => Math.min(1, Math.max(0, value));

const createLevels = (levels: Partial<Record<SoundId, number>> = {}) => {
  const nextLevels = {} as Record<SoundId, number>;
  SOUND_LIBRARY.forEach((sound) => {
    nextLevels[sound.id] = clampPercent(Number(levels[sound.id] ?? 0));
  });
  return nextLevels;
};

const defaultLevels = createLevels({
  wind: 10,
  birds: 60,
  crickets: 50,
  bowl: 50,
});

const SOUND_PRESETS: SoundPreset[] = [
  {
    id: 'focus-mix',
    label: '默认专注',
    description: '风、鸟鸣、蟋蟀和颂钵的轻组合',
    levels: defaultLevels,
  },
  {
    id: 'morning-meditation',
    label: '晨间冥想',
    description: '鸟鸣、微风、蟋蟀和颂钵',
    levels: createLevels({ birds: 100, crickets: 75, wind: 10, bowl: 50 }),
  },
  {
    id: 'rainy-coffee',
    label: '雨天咖啡',
    description: '轻雨、雷声和咖啡馆底噪',
    levels: createLevels({ rain: 10, coffee: 50, thunder: 50 }),
  },
  {
    id: 'beach-dusk',
    label: '海边黄昏',
    description: '海浪、海风和篝火',
    levels: createLevels({ waves: 20, wind: 50, fire: 60 }),
  },
  {
    id: 'forest-walk',
    label: '森林散步',
    description: '鸟鸣、微风和虫鸣',
    levels: createLevels({ birds: 75, wind: 25, crickets: 75 }),
  },
  {
    id: 'city-office',
    label: '城市办公室',
    description: '咖啡馆和轻雨背景',
    levels: createLevels({ coffee: 30, rain: 5 }),
  },
  {
    id: 'deep-sleep',
    label: '深度睡眠',
    description: '低音量海浪、篝火和自然声',
    levels: createLevels({ waves: 5, fire: 25, birds: 25, crickets: 25 }),
  },
  {
    id: 'plain-white',
    label: '纯白噪音',
    description: '平稳底噪，适合压住环境杂音',
    levels: createLevels({ white: 45 }),
  },
];

const defaultConfig: AmbientConfig = {
  masterVolume: 0.45,
  levels: defaultLevels,
  presetId: 'focus-mix',
};

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
    presetId: typeof source?.presetId === 'string' ? source.presetId : defaultConfig.presetId,
  };
};

const isSameLevels = (left: Record<SoundId, number>, right: Record<SoundId, number>) =>
  SOUND_LIBRARY.every((sound) => left[sound.id] === right[sound.id]);

const getSoundBoxUrl = (levels: Record<SoundId, number>) => {
  const slug = SOUND_LIBRARY
    .map((sound) => [sound.id, levels[sound.id]] as const)
    .filter(([, level]) => level > 0)
    .map(([soundId, level]) => `${soundId}${level}`)
    .join('-');
  return slug ? `${SOUNDBOX_HOME_URL}${slug}/` : SOUNDBOX_HOME_URL;
};

export default function PomodoroAmbientSound({
  isRunning,
  showControls = true,
  enablePlayback = true,
}: PomodoroAmbientSoundProps) {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const configSignatureRef = useRef('');
  const [config, setConfig] = useState<AmbientConfig>(defaultConfig);
  const [isConfigReady, setIsConfigReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(AMBIENT_CONFIG_KEY);
    if (!raw) {
      configSignatureRef.current = JSON.stringify(defaultConfig);
      setIsConfigReady(true);
      return;
    }
    try {
      const storedConfig = normalizeConfig(JSON.parse(raw) as Partial<AmbientConfig>);
      configSignatureRef.current = JSON.stringify(storedConfig);
      setConfig(storedConfig);
    } catch {
      configSignatureRef.current = JSON.stringify(defaultConfig);
      setConfig(defaultConfig);
    }
    setIsConfigReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isConfigReady) return;
    window.localStorage.setItem(AMBIENT_CONFIG_KEY, JSON.stringify(config));
    configSignatureRef.current = JSON.stringify(config);
    window.dispatchEvent(new CustomEvent(POMODORO_AMBIENT_CONFIG_EVENT, { detail: config }));
  }, [config, isConfigReady]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncConfig = (source: Partial<AmbientConfig> | null | undefined) => {
      const nextConfig = normalizeConfig(source);
      const nextSignature = JSON.stringify(nextConfig);
      if (nextSignature === configSignatureRef.current) return;
      configSignatureRef.current = nextSignature;
      setConfig(nextConfig);
    };

    const handleConfigEvent = (event: Event) => {
      syncConfig((event as CustomEvent<Partial<AmbientConfig>>).detail);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AMBIENT_CONFIG_KEY || !event.newValue) return;
      try {
        syncConfig(JSON.parse(event.newValue) as Partial<AmbientConfig>);
      } catch {
        syncConfig(defaultConfig);
      }
    };

    window.addEventListener(POMODORO_AMBIENT_CONFIG_EVENT, handleConfigEvent);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(POMODORO_AMBIENT_CONFIG_EVENT, handleConfigEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const selectedSounds = useMemo(
    () => SOUND_LIBRARY.filter((sound) => config.levels[sound.id] > 0),
    [config.levels],
  );

  const activePreset = useMemo(() => {
    const storedPreset = SOUND_PRESETS.find((preset) => preset.id === config.presetId);
    if (storedPreset && isSameLevels(storedPreset.levels, config.levels)) return storedPreset;
    return SOUND_PRESETS.find((preset) => isSameLevels(preset.levels, config.levels)) ?? null;
  }, [config.levels, config.presetId]);

  useEffect(() => {
    if (!enablePlayback) return;
    SOUND_LIBRARY.forEach((sound) => {
      const audio = audioRefs.current[sound.id];
      if (!audio) return;
      const level = config.levels[sound.id] ?? 0;
      audio.loop = true;
      audio.volume = clampVolume((level / 100) * config.masterVolume);
      if (level <= 0) audio.pause();
    });
  }, [config, enablePlayback]);

  const stopAmbientSound = useCallback(() => {
    if (!enablePlayback) {
      setIsPlaying(false);
      return;
    }
    Object.values(audioRefs.current).forEach((audio) => audio?.pause());
    setIsPlaying(false);
  }, [enablePlayback]);

  const playAmbientSound = useCallback(async () => {
    if (!enablePlayback) return;
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
  }, [config.levels, enablePlayback, stopAmbientSound]);

  useEffect(() => {
    if (!enablePlayback) return;
    if (isRunning) {
      void playAmbientSound();
      return;
    }
    stopAmbientSound();
  }, [enablePlayback, isRunning, playAmbientSound, stopAmbientSound]);

  useEffect(() => {
    if (!enablePlayback) return;
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
  }, [enablePlayback, playAmbientSound, stopAmbientSound]);

  useEffect(() => {
    if (!enablePlayback) return;
    const audioMap = audioRefs.current;
    return () => {
      Object.values(audioMap).forEach((audio) => audio?.pause());
    };
  }, [enablePlayback]);

  const updateLevel = (soundId: SoundId, level: number) => {
    setConfig((previous) => normalizeConfig({
      ...previous,
      presetId: 'custom',
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

  const applyPreset = (preset: SoundPreset) => {
    setConfig((previous) => normalizeConfig({
      ...previous,
      presetId: preset.id,
      levels: preset.levels,
    }));
    setError(null);
  };

  const resetToSoundBoxMix = () => {
    applyPreset(SOUND_PRESETS[0]);
  };

  const selectedSummary = selectedSounds.length > 0
    ? selectedSounds.map((sound) => `${sound.label} ${config.levels[sound.id]}%`).join(' · ')
    : '已静音';
  const masterVolumePercent = Math.round(config.masterVolume * 100);
  const activeSoundBoxUrl = getSoundBoxUrl(config.levels);
  const playbackLabel = enablePlayback
    ? (isRunning && isPlaying ? '播放中' : '开始后播放')
    : (isRunning ? '跟随专注' : '开始后播放');
  const audioNodes = enablePlayback ? SOUND_LIBRARY.map((sound) => (
    <audio
      key={sound.id}
      ref={(node) => {
        audioRefs.current[sound.id] = node;
      }}
      src={sound.src}
      preload="none"
      loop
    />
  )) : null;

  if (!showControls) {
    return <div className="hidden" aria-hidden="true">{audioNodes}</div>;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-[20px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)]/70">
      {audioNodes}

      <button
        type="button"
        onClick={() => setIsExpanded((previous) => !previous)}
        className="group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[color:var(--ui-card-hover-bg)]"
        aria-expanded={isExpanded}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
            <Wind className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-sm font-semibold text-[color:var(--ui-text-strong)]">番茄背景音</span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                isRunning && isPlaying
                  ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-300'
                  : 'border-[color:var(--ui-border-soft)] text-[color:var(--ui-text-muted)]'
              }`}>
                {playbackLabel}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-[color:var(--ui-text-muted)]">
              {activePreset?.label ?? '自定义组合'} · {selectedSummary}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[11px] text-[color:var(--ui-text-muted)]">
          <Volume2 className="h-3.5 w-3.5" />
          {masterVolumePercent}%
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {error && (
        <div className="border-t border-[color:var(--ui-border-soft)] px-3.5 py-2 text-[11px] text-amber-300">
          {error}
        </div>
      )}

      {isExpanded && (
        <div className="border-t border-[color:var(--ui-border-soft)] px-3.5 pb-3.5 pt-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {SOUND_PRESETS.map((preset) => {
              const isActive = activePreset?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`rounded-2xl border px-3 py-2.5 text-left transition-all ${
                    isActive
                      ? 'border-sky-300/40 bg-sky-400/10 text-[color:var(--ui-text-strong)] shadow-[0_10px_24px_rgba(14,165,233,0.10)]'
                      : 'border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-0)]/60 text-[color:var(--ui-text-secondary)] hover:border-sky-300/30 hover:text-[color:var(--ui-text-strong)]'
                  }`}
                >
                  <span className="block text-xs font-semibold">{preset.label}</span>
                  <span className="mt-1 block truncate text-[10px] text-[color:var(--ui-text-muted)]">{preset.description}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-0)]/60 px-3 py-2">
              <Volume2 className="h-3.5 w-3.5 shrink-0 text-[color:var(--ui-text-muted)]" />
              <span className="shrink-0 text-[11px] text-[color:var(--ui-text-secondary)]">总音量</span>
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

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={activeSoundBoxUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-0)]/60 px-3 text-[11px] text-[color:var(--ui-text-secondary)] transition-colors hover:border-sky-300/35 hover:text-[color:var(--ui-text-strong)]"
                title="在 SoundBox 打开当前组合"
              >
                SoundBox
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={resetToSoundBoxMix}
                className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-0)]/60 px-3 text-[11px] text-[color:var(--ui-text-secondary)] transition-colors hover:border-sky-300/35 hover:text-[color:var(--ui-text-strong)]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                恢复默认
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {SOUND_LIBRARY.map((sound) => {
              const level = config.levels[sound.id];
              return (
                <label
                  key={sound.id}
                  className="rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-0)]/60 px-3 py-2.5"
                >
                  <span className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[color:var(--ui-text-primary)]">{sound.label}</span>
                    <span className="text-[10px] text-[color:var(--ui-text-muted)]">{level}%</span>
                  </span>
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
      )}
    </div>
  );
}

export function PomodoroAmbientController() {
  const { isReady, state } = usePomodoroState();

  return (
    <PomodoroAmbientSound
      isRunning={Boolean(isReady && state?.isRunning)}
      showControls={false}
    />
  );
}
