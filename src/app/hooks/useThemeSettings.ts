import { useEffect, useMemo, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type AccentTheme = 'blue' | 'violet' | 'emerald' | 'rose';
export type GradientTheme = 'aurora' | 'sunset' | 'ocean' | 'mono';

type UseThemeSettingsOptions = {
  themeStorageKey?: string;
  accentStorageKey?: string;
  gradientStorageKey?: string;
};

const isAccentTheme = (value: string | null): value is AccentTheme =>
  value === 'blue' || value === 'violet' || value === 'emerald' || value === 'rose';

const isGradientTheme = (value: string | null): value is GradientTheme =>
  value === 'aurora' || value === 'sunset' || value === 'ocean' || value === 'mono';

export function useThemeSettings(options: UseThemeSettingsOptions = {}) {
  const {
    themeStorageKey = 'recall_theme',
    accentStorageKey = 'recall_theme_accent',
    gradientStorageKey = 'recall_theme_gradient',
  } = options;

  const getSystemTheme = () => {
    if (typeof window === 'undefined') return 'dark' as const;
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  };

  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [isSystemTheme, setIsSystemTheme] = useState(true);
  const [accentTheme, setAccentTheme] = useState<AccentTheme>('blue');
  const [gradientTheme, setGradientTheme] = useState<GradientTheme>('aurora');

  const themePreference = useMemo<ThemePreference>(
    () => (isSystemTheme ? 'system' : themeMode),
    [isSystemTheme, themeMode],
  );

  const setThemePreference = (mode: ThemePreference) => {
    if (mode === 'system') {
      setIsSystemTheme(true);
      setThemeMode(getSystemTheme());
      return;
    }
    setIsSystemTheme(false);
    setThemeMode(mode);
  };

  const handleThemeToggle = () => {
    const nextMode =
      themePreference === 'system'
        ? 'light'
        : themePreference === 'light'
          ? 'dark'
          : 'system';
    setThemePreference(nextMode);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedTheme = localStorage.getItem(themeStorageKey);
    if (storedTheme === 'light') {
      setThemeMode('light');
      setIsSystemTheme(false);
    } else if (storedTheme === 'dark') {
      setThemeMode('dark');
      setIsSystemTheme(false);
    } else {
      setThemeMode(getSystemTheme());
      setIsSystemTheme(true);
    }

    const storedAccentTheme = localStorage.getItem(accentStorageKey);
    if (isAccentTheme(storedAccentTheme)) {
      setAccentTheme(storedAccentTheme);
    }

    const storedGradientTheme = localStorage.getItem(gradientStorageKey);
    if (isGradientTheme(storedGradientTheme)) {
      setGradientTheme(storedGradientTheme);
    }
  }, [themeStorageKey, accentStorageKey, gradientStorageKey]);

  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;

    if (themeMode === 'light') {
      body.classList.add('theme-light');
    } else {
      body.classList.remove('theme-light');
    }

    root.dataset.accentTheme = accentTheme;
    root.dataset.gradientTheme = gradientTheme;

    if (typeof window !== 'undefined') {
      if (isSystemTheme) {
        localStorage.removeItem(themeStorageKey);
      } else {
        localStorage.setItem(themeStorageKey, themeMode);
      }
      localStorage.setItem(accentStorageKey, accentTheme);
      localStorage.setItem(gradientStorageKey, gradientTheme);
    }
  }, [themeMode, isSystemTheme, accentTheme, gradientTheme, themeStorageKey, accentStorageKey, gradientStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isSystemTheme) return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = (isDark: boolean) => {
      setThemeMode(isDark ? 'dark' : 'light');
    };

    applySystemTheme(media.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      applySystemTheme(event.matches);
    };

    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [isSystemTheme]);

  return {
    themeMode,
    isSystemTheme,
    themePreference,
    accentTheme,
    gradientTheme,
    setThemePreference,
    setAccentTheme,
    setGradientTheme,
    handleThemeToggle,
  };
}
