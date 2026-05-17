import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Bot, ChevronDown, Cloud, Database, Palette, Sparkles, X } from 'lucide-react';
import ModelSelect from '@/app/components/models/ModelSelect';
import PgSettings from '@/app/components/PgSettings';
import RedisSettings from '@/app/components/RedisSettings';

type CountdownDisplayMode = 'days' | 'date';
type ThemePreference = 'system' | 'light' | 'dark';
type AccentTheme = 'blue' | 'violet' | 'emerald' | 'rose';
type GradientTheme = 'aurora' | 'sunset' | 'ocean' | 'mono';
type SettingsFocusTarget = 'sync' | null;
type SettingsSectionKey = 'ai' | 'appearance' | 'notifications' | 'sync' | 'data';
type AppearanceTab = 'theme' | 'display';

type SettingsModalProps = {
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  settingsFocusTarget?: SettingsFocusTarget;
  apiBaseUrl: string;
  setApiBaseUrl: React.Dispatch<React.SetStateAction<string>>;
  apiKey: string;
  setApiKey: React.Dispatch<React.SetStateAction<string>>;
  modelListText: string;
  setModelListText: React.Dispatch<React.SetStateAction<string>>;
  DEFAULT_BASE_URL: string;
  DEFAULT_MODEL_LIST: string[];
  parseModelList: (text: string) => string[];
  fetchModelList: () => void;
  isFetchingModels: boolean;
  modelFetchError: string | null;
  chatModel: string;
  setChatModel: React.Dispatch<React.SetStateAction<string>>;
  embeddingModel: string;
  setEmbeddingModel: React.Dispatch<React.SetStateAction<string>>;
  rerankModel: string;
  setRerankModel: React.Dispatch<React.SetStateAction<string>>;
  fallbackTimeoutSec: number;
  setFallbackTimeoutSec: React.Dispatch<React.SetStateAction<number>>;
  DEFAULT_FALLBACK_TIMEOUT_SEC: number;
  aiContextLimit: number;
  setAiContextLimit: React.Dispatch<React.SetStateAction<number>>;
  aiContextLimitOptions: readonly number[];
  countdownDisplayMode: CountdownDisplayMode;
  setCountdownDisplayMode: React.Dispatch<React.SetStateAction<CountdownDisplayMode>>;
  themePreference: ThemePreference;
  setThemePreference: (mode: ThemePreference) => void;
  accentTheme: AccentTheme;
  setAccentTheme: React.Dispatch<React.SetStateAction<AccentTheme>>;
  gradientTheme: GradientTheme;
  setGradientTheme: React.Dispatch<React.SetStateAction<GradientTheme>>;
  notificationSupported: boolean;
  isSecureContext: boolean;
  notificationPermission: NotificationPermission;
  serviceWorkerSupported: boolean;
  requestNotificationPermission: () => void;
  sendTestNotification: () => void;
  isApiSettingsOpen: boolean;
  setIsApiSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pgHost: string;
  pgPort: string;
  pgDatabase: string;
  pgUsername: string;
  pgPassword: string;
  setPgHost: React.Dispatch<React.SetStateAction<string>>;
  setPgPort: React.Dispatch<React.SetStateAction<string>>;
  setPgDatabase: React.Dispatch<React.SetStateAction<string>>;
  setPgUsername: React.Dispatch<React.SetStateAction<string>>;
  setPgPassword: React.Dispatch<React.SetStateAction<string>>;
  redisHost: string;
  redisPort: string;
  redisDb: string;
  redisPassword: string;
  setRedisHost: React.Dispatch<React.SetStateAction<string>>;
  setRedisPort: React.Dispatch<React.SetStateAction<string>>;
  setRedisDb: React.Dispatch<React.SetStateAction<string>>;
  setRedisPassword: React.Dispatch<React.SetStateAction<string>>;
  syncNamespace: string;
  setSyncNamespace: React.Dispatch<React.SetStateAction<string>>;
  DEFAULT_SYNC_NAMESPACE: string;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  autoSyncInterval: number;
  setAutoSyncInterval: React.Dispatch<React.SetStateAction<number>>;
  AUTO_SYNC_INTERVAL_OPTIONS: number[];
  calendarSubscription: string;
  setCalendarSubscription: React.Dispatch<React.SetStateAction<string>>;
  webdavUrl: string;
  setWebdavUrl: React.Dispatch<React.SetStateAction<string>>;
  webdavUsername: string;
  setWebdavUsername: React.Dispatch<React.SetStateAction<string>>;
  webdavPassword: string;
  setWebdavPassword: React.Dispatch<React.SetStateAction<string>>;
  DEFAULT_WEBDAV_URL: string;
  handleExportData: () => void;
  openImportPicker: () => void;
  importMode: 'merge' | 'overwrite';
  setImportMode: React.Dispatch<React.SetStateAction<'merge' | 'overwrite'>>;
  importInputRef: React.RefObject<HTMLInputElement>;
  handleImportData: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  normalizeTimeoutSec: (value: number) => number;
  persistSettings: (next: {
    apiKey: string;
    apiBaseUrl: string;
    modelListText: string;
    chatModel: string;
    embeddingModel: string;
    rerankModel: string;
    fallbackTimeoutSec: number;
    webdavUrl: string;
    webdavPath: string;
    webdavUsername: string;
    webdavPassword: string;
    autoSyncEnabled: boolean;
    autoSyncInterval: number;
    countdownDisplayMode: CountdownDisplayMode;
    aiRetentionDays: number;
    aiContextLimit: number;
    pgHost: string;
    pgPort: string;
    pgDatabase: string;
    pgUsername: string;
    pgPassword: string;
    redisHost: string;
    redisPort: string;
    redisDb: string;
    redisPassword: string;
    syncNamespace: string;
    calendarSubscription: string;
    themePreference: ThemePreference;
    accentTheme: AccentTheme;
    gradientTheme: GradientTheme;
  }) => void;
  webdavPath: string;
  aiRetentionDays: number;
};

const ACCENT_THEME_OPTIONS: Array<{
  value: AccentTheme;
  label: string;
  previewClassName: string;
  glowClassName: string;
}> = [
  {
    value: 'blue',
    label: '天空蓝',
    previewClassName: 'bg-[linear-gradient(135deg,#38BDF8_0%,#3B82F6_55%,#1D4ED8_100%)]',
    glowClassName: 'shadow-[0_0_24px_rgba(56,189,248,0.24)]',
  },
  {
    value: 'violet',
    label: '霓虹紫',
    previewClassName: 'bg-[linear-gradient(135deg,#C084FC_0%,#8B5CF6_50%,#6D28D9_100%)]',
    glowClassName: 'shadow-[0_0_24px_rgba(139,92,246,0.24)]',
  },
  {
    value: 'emerald',
    label: '薄荷绿',
    previewClassName: 'bg-[linear-gradient(135deg,#6EE7B7_0%,#10B981_50%,#047857_100%)]',
    glowClassName: 'shadow-[0_0_24px_rgba(16,185,129,0.22)]',
  },
  {
    value: 'rose',
    label: '玫瑰粉',
    previewClassName: 'bg-[linear-gradient(135deg,#FDA4AF_0%,#FB7185_55%,#E11D48_100%)]',
    glowClassName: 'shadow-[0_0_24px_rgba(244,63,94,0.22)]',
  },
];

const GRADIENT_THEME_OPTIONS: Array<{
  value: GradientTheme;
  label: string;
  cityLabel: string;
  subtitle: string;
  previewClassName: string;
  glowClassName: string;
}> = [
  {
    value: 'aurora',
    label: '极光',
    cityLabel: '北京',
    subtitle: '清亮层次',
    previewClassName: 'bg-[linear-gradient(135deg,#22D3EE_0%,#60A5FA_38%,#A78BFA_72%,#34D399_100%)]',
    glowClassName: 'shadow-[0_0_24px_rgba(34,211,238,0.20)]',
  },
  {
    value: 'sunset',
    label: '日落',
    cityLabel: '杭州',
    subtitle: '暖调余晖',
    previewClassName: 'bg-[linear-gradient(135deg,#FB7185_0%,#F97316_45%,#F59E0B_100%)]',
    glowClassName: 'shadow-[0_0_24px_rgba(249,115,22,0.20)]',
  },
  {
    value: 'ocean',
    label: '海洋',
    cityLabel: '广州',
    subtitle: '清透蓝绿',
    previewClassName: 'bg-[linear-gradient(135deg,#38BDF8_0%,#2563EB_45%,#0F172A_100%)]',
    glowClassName: 'shadow-[0_0_24px_rgba(37,99,235,0.20)]',
  },
  {
    value: 'mono',
    label: '极简',
    cityLabel: '伦敦',
    subtitle: '克制夜景',
    previewClassName: 'bg-[linear-gradient(135deg,#E5E7EB_0%,#9CA3AF_42%,#111827_100%)]',
    glowClassName: 'shadow-[0_0_24px_rgba(156,163,175,0.18)]',
  },
];

const baseInputClassName =
  'ui-input rounded-2xl px-3 py-2.5 text-[13px] sm:text-sm';

const buttonGroupClassName =
  'btn btn-sm ui-chip text-[12px] sm:text-xs';

const SETTINGS_SECTIONS: Array<{
  key: SettingsSectionKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: 'ai',
    label: 'AI 与模型',
    icon: Bot,
  },
  {
    key: 'appearance',
    label: '外观主题',
    icon: Palette,
  },
  {
    key: 'sync',
    label: '同步与附件',
    icon: Cloud,
  },
  {
    key: 'notifications',
    label: '通知',
    icon: Bell,
  },
  {
    key: 'data',
    label: '数据',
    icon: Database,
  },
];

const SettingsModal = ({
  showSettings,
  setShowSettings,
  settingsFocusTarget,
  apiBaseUrl,
  setApiBaseUrl,
  apiKey,
  setApiKey,
  modelListText,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL_LIST,
  parseModelList,
  fetchModelList,
  isFetchingModels,
  modelFetchError,
  chatModel,
  setChatModel,
  embeddingModel,
  setEmbeddingModel,
  rerankModel,
  setRerankModel,
  fallbackTimeoutSec,
  setFallbackTimeoutSec,
  DEFAULT_FALLBACK_TIMEOUT_SEC,
  aiContextLimit,
  setAiContextLimit,
  aiContextLimitOptions,
  countdownDisplayMode,
  setCountdownDisplayMode,
  themePreference,
  setThemePreference,
  accentTheme,
  setAccentTheme,
  gradientTheme,
  setGradientTheme,
  notificationSupported,
  isSecureContext,
  notificationPermission,
  serviceWorkerSupported,
  requestNotificationPermission,
  sendTestNotification,
  isApiSettingsOpen,
  setIsApiSettingsOpen,
  pgHost,
  pgPort,
  pgDatabase,
  pgUsername,
  pgPassword,
  setPgHost,
  setPgPort,
  setPgDatabase,
  setPgUsername,
  setPgPassword,
  redisHost,
  redisPort,
  redisDb,
  redisPassword,
  setRedisHost,
  setRedisPort,
  setRedisDb,
  setRedisPassword,
  syncNamespace,
  setSyncNamespace,
  DEFAULT_SYNC_NAMESPACE,
  autoSyncEnabled,
  setAutoSyncEnabled,
  autoSyncInterval,
  setAutoSyncInterval,
  AUTO_SYNC_INTERVAL_OPTIONS,
  calendarSubscription,
  setCalendarSubscription,
  webdavUrl,
  setWebdavUrl,
  webdavUsername,
  setWebdavUsername,
  webdavPassword,
  setWebdavPassword,
  DEFAULT_WEBDAV_URL,
  handleExportData,
  openImportPicker,
  importMode,
  setImportMode,
  importInputRef,
  handleImportData,
  normalizeTimeoutSec,
  persistSettings,
  webdavPath,
  aiRetentionDays,
}: SettingsModalProps) => {
  const [showAutoSavedNotice, setShowAutoSavedNotice] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>(settingsFocusTarget === 'sync' ? 'sync' : 'ai');
  const [appearanceTab, setAppearanceTab] = useState<AppearanceTab>('theme');
  const firstAutoSaveRef = useRef(true);
  const autoSavedNoticeTimerRef = useRef<number | null>(null);
  const lastAutoFetchedModelKeyRef = useRef<string | null>(null);
  const aiSectionRef = useRef<HTMLDetailsElement>(null);
  const appearanceSectionRef = useRef<HTMLDivElement>(null);
  const notificationsSectionRef = useRef<HTMLDetailsElement>(null);
  const serverSettingsRef = useRef<HTMLDetailsElement>(null);
  const dataSectionRef = useRef<HTMLDetailsElement>(null);
  const hasApiKey = Boolean(apiKey.trim());

  const availableModels = useMemo(() => {
    const models = parseModelList(modelListText);
    return models.length > 0 ? models : DEFAULT_MODEL_LIST;
  }, [DEFAULT_MODEL_LIST, modelListText, parseModelList]);

  const themeModeLabel = useMemo(() => {
    if (themePreference === 'system') return '跟随系统';
    if (themePreference === 'light') return '浅色模式';
    return '深色模式';
  }, [themePreference]);

  const selectedAccentTheme = useMemo(
    () => ACCENT_THEME_OPTIONS.find((option) => option.value === accentTheme) ?? ACCENT_THEME_OPTIONS[0],
    [accentTheme],
  );

  const selectedGradientTheme = useMemo(
    () => GRADIENT_THEME_OPTIONS.find((option) => option.value === gradientTheme) ?? GRADIENT_THEME_OPTIONS[0],
    [gradientTheme],
  );

  const notificationStatusLabel = useMemo(() => {
    if (!notificationSupported) return '当前浏览器不支持';
    if (notificationPermission === 'granted') return '已授权';
    if (notificationPermission === 'denied') return '已拒绝';
    return '待授权';
  }, [notificationPermission, notificationSupported]);

  const activeSectionMeta = useMemo(
    () => SETTINGS_SECTIONS.find((section) => section.key === activeSection) ?? SETTINGS_SECTIONS[0],
    [activeSection],
  );

  const getSectionTarget = (section: SettingsSectionKey) => {
    if (section === 'ai') return aiSectionRef.current;
    if (section === 'appearance') return appearanceSectionRef.current;
    if (section === 'notifications') return notificationsSectionRef.current;
    if (section === 'sync') return serverSettingsRef.current;
    return dataSectionRef.current;
  };

  const scrollToSection = (section: SettingsSectionKey) => {
    setActiveSection(section);
    if (section === 'ai') {
      setIsApiSettingsOpen(true);
    }
    if (section === 'sync') {
      setIsServerSettingsOpen(true);
    }

    window.setTimeout(() => {
      const target = getSectionTarget(section);
      if (target instanceof HTMLDetailsElement) {
        target.open = true;
      }
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleFetchModelList = async (mode: 'auto' | 'manual' = 'manual') => {
    if (!hasApiKey || isFetchingModels) return;
    const fetchKey = `${(apiBaseUrl || DEFAULT_BASE_URL).trim()}::${apiKey.trim()}`;
    if (mode === 'auto' && lastAutoFetchedModelKeyRef.current === fetchKey) return;
    await fetchModelList();
    lastAutoFetchedModelKeyRef.current = fetchKey;
  };

  const handleModelSelectFocus = () => {
    if (!hasApiKey) return;
    void handleFetchModelList('auto');
  };

  useEffect(() => {
    if (!showSettings) return;
    if (firstAutoSaveRef.current) {
      firstAutoSaveRef.current = false;
      return;
    }

    const normalizedTimeout = normalizeTimeoutSec(fallbackTimeoutSec);
    if (normalizedTimeout !== fallbackTimeoutSec) {
      setFallbackTimeoutSec(normalizedTimeout);
    }

    const timer = window.setTimeout(() => {
      persistSettings({
        apiKey,
        apiBaseUrl: apiBaseUrl || DEFAULT_BASE_URL,
        modelListText,
        chatModel,
        embeddingModel,
        rerankModel,
        fallbackTimeoutSec: normalizedTimeout,
        webdavUrl,
        webdavPath,
        webdavUsername,
        webdavPassword,
        autoSyncEnabled,
        autoSyncInterval,
        countdownDisplayMode,
        aiRetentionDays,
        aiContextLimit,
        pgHost,
        pgPort,
        pgDatabase,
        pgUsername,
        pgPassword,
        redisHost,
        redisPort,
        redisDb,
        redisPassword,
        syncNamespace,
        calendarSubscription,
        themePreference,
        accentTheme,
        gradientTheme,
      });
      setShowAutoSavedNotice(true);
      if (autoSavedNoticeTimerRef.current) {
        window.clearTimeout(autoSavedNoticeTimerRef.current);
      }
      autoSavedNoticeTimerRef.current = window.setTimeout(() => {
        setShowAutoSavedNotice(false);
        autoSavedNoticeTimerRef.current = null;
      }, 1600);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [
    showSettings,
    apiKey,
    apiBaseUrl,
    modelListText,
    chatModel,
    embeddingModel,
    rerankModel,
    fallbackTimeoutSec,
    webdavUrl,
    webdavPath,
    webdavUsername,
    webdavPassword,
    autoSyncEnabled,
    autoSyncInterval,
    countdownDisplayMode,
    aiRetentionDays,
    aiContextLimit,
    pgHost,
    pgPort,
    pgDatabase,
    pgUsername,
    pgPassword,
    redisHost,
    redisPort,
    redisDb,
    redisPassword,
    syncNamespace,
    calendarSubscription,
    themePreference,
    accentTheme,
    gradientTheme,
    DEFAULT_BASE_URL,
    normalizeTimeoutSec,
    persistSettings,
    setFallbackTimeoutSec,
  ]);

  useEffect(() => {
    if (!showSettings) {
      firstAutoSaveRef.current = true;
      setShowAutoSavedNotice(false);
      setActiveSection(settingsFocusTarget === 'sync' ? 'sync' : 'ai');
      setAppearanceTab('theme');
      if (autoSavedNoticeTimerRef.current) {
        window.clearTimeout(autoSavedNoticeTimerRef.current);
        autoSavedNoticeTimerRef.current = null;
      }
    }
  }, [settingsFocusTarget, showSettings]);

  useEffect(() => {
    if (!showSettings) return;
    if (settingsFocusTarget === 'sync') {
      scrollToSection('sync');
      return;
    }
    setActiveSection('ai');
    setIsApiSettingsOpen(true);
  }, [settingsFocusTarget, showSettings]);

  if (!showSettings) return null;

  return (
    <div className="settings-modal-root fixed inset-0 z-50 motion-modal-overlay">
      <div
        className="settings-modal-backdrop absolute inset-0 bg-[color:var(--ui-overlay-bg)] backdrop-blur-md"
        onClick={() => setShowSettings(false)}
      />
      <div
        className="relative flex h-full items-center justify-center p-3 sm:p-5 lg:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-modal-surface theme-native-surface relative flex h-[min(88dvh,760px)] w-full max-w-[1080px] flex-col overflow-hidden rounded-[28px] border border-[color:var(--ui-border-strong)] bg-[color:var(--ui-modal-bg)] shadow-[0_24px_64px_rgba(0,0,0,0.24)] lg:flex-row">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(var(--theme-accent),0.15),transparent_70%)] opacity-80" />
          <aside className="settings-modal-nav relative z-10 flex w-full shrink-0 flex-col border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] lg:w-[216px] lg:border-b-0 lg:border-r">
            <div className="border-b border-[color:var(--ui-border-soft)] px-4 py-3 sm:px-4.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(var(--theme-accent),0.2)] bg-[rgba(var(--theme-accent),0.1)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--ui-text-muted)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    设置
                  </span>
                  <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-[color:var(--ui-text-strong)]">设置</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] text-[color:var(--ui-text-secondary)] transition-all hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)] lg:hidden"
                  aria-label="关闭设置"
                  title="关闭设置"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto px-2.5 py-2.5 lg:flex-1 lg:overflow-y-auto lg:px-3 lg:py-3">
              <div className="flex gap-2 lg:flex-col">
                {SETTINGS_SECTIONS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => scrollToSection(key)}
                    className={`group flex min-w-[132px] items-center gap-2.5 rounded-[14px] border px-2.5 py-2 text-left transition-all lg:min-w-0 ${
                      activeSection === key
                        ? 'border-[rgba(var(--theme-accent),0.2)] bg-[rgba(var(--theme-accent),0.1)]'
                        : 'border-transparent bg-transparent hover:border-[color:var(--ui-border-soft)] hover:bg-[color:var(--ui-hover-bg)]'
                    }`}
                  >
                    <span className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[12px] border transition-all ${
                      activeSection === key
                        ? 'border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.14)] text-[color:rgb(var(--theme-accent))]'
                        : 'border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] text-[color:var(--ui-text-secondary)] group-hover:text-[color:var(--ui-text-strong)]'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 truncate text-[13px] font-semibold text-[color:var(--ui-text-strong)]">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--ui-border-soft)] px-4 py-3 sm:px-5 lg:px-6">
              <div className="min-w-0">
                <h3 className="text-[17px] font-semibold text-[color:var(--ui-text-strong)] sm:text-[18px]">
                  {activeSectionMeta.label}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {showAutoSavedNotice ? (
                  <span className="rounded-full border border-[rgba(var(--theme-accent),0.24)] bg-[rgba(var(--theme-accent),0.12)] px-2.5 py-1 text-[10px] font-medium text-[color:var(--ui-text-strong)]">
                    已自动保存
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="hidden h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-card-bg)] text-[color:var(--ui-text-secondary)] transition-all hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-card-hover-bg)] hover:text-[color:var(--ui-text-strong)] lg:inline-flex"
                  aria-label="关闭设置"
                  title="关闭设置"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4 lg:px-6">
              <div className="space-y-3 text-sm">
          <details
            ref={aiSectionRef}
            open={isApiSettingsOpen}
            onToggle={(event) =>
              setIsApiSettingsOpen((event.currentTarget as HTMLDetailsElement).open)
            }
            className="group settings-section scroll-mt-6 rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] p-3.5"
          >
            <summary className="ui-section-label ui-state-hover flex cursor-pointer list-none items-center justify-between gap-2 rounded-[22px] px-2.5 py-2">
              <span>AI 基础设置</span>
              <ChevronDown className="w-3.5 h-3.5 text-[color:var(--ui-icon-muted)] transition-transform duration-[var(--motion-base)] group-open:rotate-180" />
            </summary>
            <div className="grid grid-rows-[0fr] opacity-85 transition-[grid-template-rows,opacity] duration-[var(--motion-slow)] ease-out group-open:grid-rows-[1fr] group-open:opacity-100">
              <div className="mt-3 space-y-3 overflow-hidden">
                <div>
                  <label className="ui-field-label mb-2 text-[11px] sm:text-xs">
                    OpenAI 接口地址
                  </label>
                  <input
                    type="text"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    placeholder={DEFAULT_BASE_URL}
                    className={baseInputClassName}
                  />
                </div>

                <div>
                  <label className="ui-field-label mb-2 text-[11px] sm:text-xs">
                    OpenAI API 密钥
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className={baseInputClassName}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="ui-field-label mb-0 text-[11px] sm:text-xs">
                      对话模型
                    </label>
                    <span className="rounded-full border border-[color:var(--ui-border-soft)] px-2 py-0.5 text-[10px] text-[color:var(--ui-text-muted)]">
                      {isFetchingModels ? '同步模型中' : hasApiKey ? `${availableModels.length} 个可选` : '等待密钥'}
                    </span>
                  </div>
                  <ModelSelect
                    models={availableModels}
                    value={chatModel}
                    onChange={setChatModel}
                    onOpen={handleModelSelectFocus}
                    ariaLabel="Chat model"
                    title="Chat model"
                    buttonClassName={baseInputClassName}
                  />
                  <select hidden
                    value={chatModel}
                    onChange={(e) => setChatModel(e.target.value)}
                    onFocus={handleModelSelectFocus}
                    onClick={handleModelSelectFocus}
                    aria-label="对话模型"
                    title="对话模型"
                    className={baseInputClassName}
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  {modelFetchError && (
                    <p className="text-[11px] sm:text-xs text-red-300 mt-2">{modelFetchError}</p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="ui-field-label mb-2 text-[11px] sm:text-xs">
                      知识库嵌入模型
                    </label>
                    <input
                      type="text"
                      value={embeddingModel}
                      onChange={(e) => setEmbeddingModel(e.target.value)}
                      placeholder="jina-embeddings-v3"
                      className={baseInputClassName}
                    />
                  </div>
                  <div>
                    <label className="ui-field-label mb-2 text-[11px] sm:text-xs">
                      知识库重排序模型
                    </label>
                    <input
                      type="text"
                      value={rerankModel}
                      onChange={(e) => setRerankModel(e.target.value)}
                      placeholder="jina-reranker-v3"
                      className={baseInputClassName}
                    />
                  </div>
                </div>

                <details className="group rounded-[18px] border border-[var(--ui-border-soft)] bg-transparent p-3">
                  <summary className="ui-section-label cursor-pointer list-none flex items-center justify-between gap-2 rounded-2xl px-2 py-1.5 ui-state-hover">
                    <span>高级设置</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[color:var(--ui-icon-muted)] transition-transform duration-[var(--motion-base)] group-open:rotate-180" />
                  </summary>
                  <div className="grid grid-rows-[0fr] opacity-85 transition-[grid-template-rows,opacity] duration-[var(--motion-slow)] ease-out group-open:grid-rows-[1fr] group-open:opacity-100">
                    <div className="mt-3 space-y-3 overflow-hidden">
                      <label className="ui-field-label mb-2 text-[11px] sm:text-xs">
                        创建超时转本地（秒）
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={fallbackTimeoutSec}
                        onChange={(e) => setFallbackTimeoutSec(Number(e.target.value))}
                        placeholder={String(DEFAULT_FALLBACK_TIMEOUT_SEC)}
                        className={baseInputClassName}
                      />
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <label className="ui-field-label mb-0 text-[11px] sm:text-xs">
                            上下文限制
                          </label>
                          <span className="rounded-full border border-[var(--ui-border-soft)] px-2 py-0.5 text-[10px] text-[color:var(--ui-text-muted)]">
                            {aiContextLimit} 条
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[12px] sm:text-xs">
                          {aiContextLimitOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setAiContextLimit(option)}
                              className={`btn btn-sm ${
                                aiContextLimit === option
                                  ? 'bg-blue-500/18 border-blue-400/70 text-white shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                                  : buttonGroupClassName
                              }`}
                            >
                              {option} 条
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </details>

                <div
                  ref={appearanceSectionRef}
                  className="scroll-mt-6 overflow-hidden rounded-[24px] border border-[rgba(var(--theme-accent),0.1)] bg-[rgba(255,255,255,0.035)] shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
                >
                  <div className="border-b border-[color:var(--ui-border-soft)] px-3.5 py-3.5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="ui-section-label text-[11px] sm:text-xs">外观设置</div>
                      </div>
                      <div className="inline-flex w-fit rounded-full border border-white/8 bg-black/20 p-1">
                        {([
                          ['theme', '主题'],
                          ['display', '显示'],
                        ] as const).map(([tab, label]) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setAppearanceTab(tab)}
                            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                              appearanceTab === tab
                                ? 'bg-white text-slate-900 shadow-[0_10px_24px_rgba(255,255,255,0.16)]'
                                : 'text-[color:var(--ui-text-muted)] hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 px-3.5 py-4">
                    {appearanceTab === 'theme' ? (
                      <>
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
                          <div className="space-y-3">
                            <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.028)] p-3.5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-white">界面样式</p>
                                  <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
                                    当前使用 {selectedGradientTheme.label} 氛围和 {selectedAccentTheme.label} 主色。
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.12)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-strong)]">
                                  {themeModeLabel}
                                </span>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {([
                                  ['system', '跟随系统'],
                                  ['light', '浅色'],
                                  ['dark', '深色'],
                                ] as const).map(([mode, label]) => (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setThemePreference(mode)}
                                    className={`rounded-full border px-3 py-1.5 text-[12px] transition-all ${
                                      themePreference === mode
                                        ? 'border-[rgba(var(--theme-accent),0.32)] bg-[rgba(var(--theme-accent),0.18)] text-white shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                                        : 'border-[color:var(--ui-border-soft)] bg-white/[0.03] text-[color:var(--ui-text-secondary)] hover:text-white'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setThemePreference(themePreference === 'system' ? 'dark' : 'system')}
                              className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.028)] px-3.5 py-3 text-left transition-all hover:border-[rgba(var(--theme-accent),0.24)] hover:bg-[rgba(255,255,255,0.04)]"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white">跟随系统切换暗色主题</p>
                                <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
                                  根据设备明暗模式自动切换主题。
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] ${
                                themePreference === 'system'
                                  ? 'border border-emerald-400/35 bg-emerald-400/14 text-emerald-100'
                                  : 'border border-[color:var(--ui-border-soft)] bg-white/[0.04] text-[color:var(--ui-text-muted)]'
                              }`}>
                                {themePreference === 'system' ? '开启' : '关闭'}
                              </span>
                            </button>
                          </div>

                          <div className="relative overflow-hidden rounded-[26px] border border-[rgba(var(--theme-accent),0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4">
                            <div className="pointer-events-none absolute -right-10 top-0 h-28 w-28 rounded-full bg-[rgba(var(--theme-accent),0.14)] blur-3xl" />
                            <div className="relative">
                              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--ui-text-faint)]">当前组合</p>
                              <div className={`mt-3 h-24 rounded-[22px] ${selectedGradientTheme.previewClassName}`} />
                              <div className="mt-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-white">{selectedGradientTheme.cityLabel}</p>
                                  <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">{selectedGradientTheme.subtitle}</p>
                                </div>
                                <div className={`h-11 w-11 rounded-2xl border border-white/10 ${selectedAccentTheme.previewClassName}`} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">颜色系列</p>
                              <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">先决定主色，再决定整页情绪。</p>
                            </div>
                            <span className="rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-muted)]">
                              当前：{selectedAccentTheme.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 min-[520px]:grid-cols-4">
                            {ACCENT_THEME_OPTIONS.map(({ value, label, previewClassName, glowClassName }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setAccentTheme(value)}
                                className={`group rounded-[22px] border p-3 text-center transition-all ${
                                  accentTheme === value
                                    ? `border-[rgba(var(--theme-accent),0.34)] bg-[rgba(var(--theme-accent),0.12)] ${glowClassName}`
                                    : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(var(--theme-accent),0.18)] hover:bg-[rgba(255,255,255,0.05)]'
                                }`}
                              >
                                <span className={`mx-auto block h-14 w-14 rounded-[18px] ${previewClassName}`} />
                                <span className="mt-3 block text-xs font-medium text-[color:var(--ui-text-primary)]">{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">城市系列</p>
                              <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">用大一点的预览挑氛围，而不是靠抽象名字想象。</p>
                            </div>
                            <span className="rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-muted)]">
                              当前：{selectedGradientTheme.cityLabel}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
                            {GRADIENT_THEME_OPTIONS.map(({ value, label, cityLabel, subtitle, previewClassName, glowClassName }, index) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setGradientTheme(value)}
                                className={`group overflow-hidden rounded-[22px] border text-left transition-all ${
                                  gradientTheme === value
                                    ? `border-[rgba(var(--theme-accent),0.34)] bg-[rgba(var(--theme-accent),0.12)] ${glowClassName}`
                                    : 'border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(var(--theme-accent),0.18)] hover:bg-[rgba(255,255,255,0.05)]'
                                }`}
                              >
                                <div className={`relative h-24 overflow-hidden ${previewClassName}`}>
                                  <span className="absolute left-3 top-3 h-5 w-10 rounded-full bg-amber-200/80 blur-[1px]" />
                                  <span className="absolute right-4 top-4 h-3 w-3 rounded-full bg-white/50" />
                                  <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
                                  <span
                                    className="absolute bottom-0 left-0 right-0 h-10 opacity-90"
                                    style={{
                                      background: index % 2 === 0
                                        ? 'linear-gradient(90deg, rgba(255,255,255,0.18) 8%, transparent 8%, transparent 14%, rgba(255,255,255,0.14) 14%, rgba(255,255,255,0.14) 19%, transparent 19%, transparent 26%, rgba(255,255,255,0.16) 26%, rgba(255,255,255,0.16) 33%, transparent 33%, transparent 42%, rgba(255,255,255,0.13) 42%, rgba(255,255,255,0.13) 46%, transparent 46%, transparent 58%, rgba(255,255,255,0.18) 58%, rgba(255,255,255,0.18) 66%, transparent 66%, transparent 74%, rgba(255,255,255,0.15) 74%, rgba(255,255,255,0.15) 82%, transparent 82%)'
                                        : 'linear-gradient(90deg, transparent 6%, rgba(255,255,255,0.18) 6%, rgba(255,255,255,0.18) 12%, transparent 12%, transparent 22%, rgba(255,255,255,0.12) 22%, rgba(255,255,255,0.12) 28%, transparent 28%, transparent 38%, rgba(255,255,255,0.17) 38%, rgba(255,255,255,0.17) 48%, transparent 48%, transparent 60%, rgba(255,255,255,0.12) 60%, rgba(255,255,255,0.12) 67%, transparent 67%, transparent 78%, rgba(255,255,255,0.18) 78%, rgba(255,255,255,0.18) 86%, transparent 86%)',
                                    }}
                                  />
                                  {gradientTheme === value ? (
                                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-900">
                                      当前
                                    </span>
                                  ) : null}
                                </div>
                                <div className="px-3 py-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-sm font-semibold text-white">{cityLabel}</span>
                                    <span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] text-[color:var(--ui-text-muted)]">
                                      {label}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">{subtitle}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.028)] p-3.5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white">当前主题模式</p>
                                <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
                                  决定界面整体的明暗感和对比度。
                                </p>
                              </div>
                              <span className="rounded-full border border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.12)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-strong)]">
                                {themeModeLabel}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {([
                                ['system', '跟随系统'],
                                ['light', '浅色'],
                                ['dark', '深色'],
                              ] as const).map(([mode, label]) => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => setThemePreference(mode)}
                                  className={`rounded-full border px-3 py-1.5 text-[12px] transition-all ${
                                    themePreference === mode
                                      ? 'border-[rgba(var(--theme-accent),0.32)] bg-[rgba(var(--theme-accent),0.18)] text-white shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                                      : 'border-[color:var(--ui-border-soft)] bg-white/[0.03] text-[color:var(--ui-text-secondary)] hover:text-white'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setThemePreference(themePreference === 'system' ? 'dark' : 'system')}
                            className="flex items-center justify-between gap-3 rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.028)] px-3.5 py-3.5 text-left transition-all hover:border-[rgba(var(--theme-accent),0.24)] hover:bg-[rgba(255,255,255,0.04)]"
                          >
                            <div>
                              <p className="text-sm font-semibold text-white">跟随系统切换暗色主题</p>
                              <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
                                适合在白天和夜间自动适配。
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] ${
                              themePreference === 'system'
                                ? 'border border-emerald-400/35 bg-emerald-400/14 text-emerald-100'
                                : 'border border-[color:var(--ui-border-soft)] bg-white/[0.04] text-[color:var(--ui-text-muted)]'
                            }`}>
                              {themePreference === 'system' ? '开启' : '关闭'}
                            </span>
                          </button>
                        </div>

                        <div className="rounded-[22px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.028)] p-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">倒数日信息显示</p>
                              <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">
                                控制倒数日卡片右侧显示剩余天数还是目标日期。
                              </p>
                            </div>
                            <span className="rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1 text-[11px] text-[color:var(--ui-text-muted)]">
                              {countdownDisplayMode === 'days' ? '剩余天数' : '目标日期'}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setCountdownDisplayMode('days')}
                              className={`rounded-full border px-3 py-1.5 text-[12px] transition-all ${
                                countdownDisplayMode === 'days'
                                  ? 'border-[rgba(var(--theme-accent),0.32)] bg-[rgba(var(--theme-accent),0.18)] text-white shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                                  : 'border-[color:var(--ui-border-soft)] bg-white/[0.03] text-[color:var(--ui-text-secondary)] hover:text-white'
                              }`}
                            >
                              剩余天数
                            </button>
                            <button
                              type="button"
                              onClick={() => setCountdownDisplayMode('date')}
                              className={`rounded-full border px-3 py-1.5 text-[12px] transition-all ${
                                countdownDisplayMode === 'date'
                                  ? 'border-[rgba(var(--theme-accent),0.32)] bg-[rgba(var(--theme-accent),0.18)] text-white shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                                  : 'border-[color:var(--ui-border-soft)] bg-white/[0.03] text-[color:var(--ui-text-secondary)] hover:text-white'
                              }`}
                            >
                              目标日期
                            </button>
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-[rgba(var(--theme-accent),0.18)] bg-[linear-gradient(135deg,rgba(var(--theme-accent),0.14),rgba(var(--theme-grad-end),0.08),rgba(255,255,255,0.02))] p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--ui-text-faint)]">显示预览</p>
                          <div className="mt-3 rounded-[20px] border border-white/8 bg-[rgba(10,14,24,0.52)] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white">春节</p>
                                <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">目标日期：2026-02-17</p>
                              </div>
                              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[color:var(--ui-text-secondary)]">
                                {countdownDisplayMode === 'days' ? '还有 77 天' : '2026-02-17'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </details>

          <details
            ref={notificationsSectionRef}
            className="group settings-section scroll-mt-6 rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] p-3.5"
          >
            <summary className="ui-section-label ui-state-hover flex cursor-pointer list-none items-center justify-between gap-2 rounded-[22px] px-2.5 py-2">
              <span>浏览器通知</span>
              <ChevronDown className="w-3.5 h-3.5 text-[color:var(--ui-icon-muted)] transition-transform duration-[var(--motion-base)] group-open:rotate-180" />
            </summary>
            <div className="grid grid-rows-[0fr] opacity-85 transition-[grid-template-rows,opacity] duration-[var(--motion-slow)] ease-out group-open:grid-rows-[1fr] group-open:opacity-100">
              <div className="space-y-3 overflow-hidden mt-3">
                <div className="flex flex-wrap gap-2 text-[11px] text-[color:var(--ui-text-muted)]">
                  <span className="rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1">
                    支持：{notificationSupported ? '是' : '否'}
                  </span>
                  <span className="rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1">
                    安全上下文：{isSecureContext ? '是' : '否'}
                  </span>
                  <span className="rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1">
                    权限：{notificationPermission === 'granted'
                      ? '已授权'
                      : notificationPermission === 'denied'
                        ? '已拒绝'
                        : '未授权'}
                  </span>
                  <span className="rounded-full border border-[color:var(--ui-border-soft)] px-2.5 py-1">
                    Worker：{serviceWorkerSupported ? '已支持' : '不支持'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={requestNotificationPermission} className="btn btn-md btn-ghost">
                    申请权限
                  </button>
                  <button type="button" onClick={sendTestNotification} className="btn btn-md btn-secondary">
                    发送测试通知
                  </button>
                </div>
              </div>
            </div>
          </details>

          <details
            ref={serverSettingsRef}
            open={isServerSettingsOpen}
            onToggle={(event) =>
              setIsServerSettingsOpen((event.currentTarget as HTMLDetailsElement).open)
            }
            className={`group settings-section scroll-mt-6 rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] p-3.5 ${
              settingsFocusTarget === 'sync' ? 'ring-1 ring-amber-300/35' : ''
            }`}
          >
            <summary className="ui-section-label ui-state-hover flex cursor-pointer list-none items-center justify-between gap-2 rounded-[22px] px-2.5 py-2">
              <span>同步与附件</span>
              <ChevronDown className="w-3.5 h-3.5 text-[color:var(--ui-icon-muted)] transition-transform duration-[var(--motion-base)] group-open:rotate-180" />
            </summary>
            <div className="grid transition-[grid-template-rows,opacity] duration-[var(--motion-slow)] ease-out group-open:grid-rows-[1fr] group-open:opacity-100 grid-rows-[0fr] opacity-85">
              <div className="space-y-4 overflow-hidden mt-3">
                <PgSettings
                  host={pgHost}
                  port={pgPort}
                  database={pgDatabase}
                  username={pgUsername}
                  password={pgPassword}
                  onHostChange={setPgHost}
                  onPortChange={setPgPort}
                  onDatabaseChange={setPgDatabase}
                  onUsernameChange={setPgUsername}
                  onPasswordChange={setPgPassword}
                />

                <RedisSettings
                  host={redisHost}
                  port={redisPort}
                  db={redisDb}
                  password={redisPassword}
                  onHostChange={setRedisHost}
                  onPortChange={setRedisPort}
                  onDbChange={setRedisDb}
                  onPasswordChange={setRedisPassword}
                  focusHost={settingsFocusTarget === 'sync'}
                />

                <div className="space-y-3">
                  <div className="ui-section-label text-[11px] sm:text-xs">同步设置</div>
                  <div>
                    <label className="ui-field-label mb-2 text-[11px] sm:text-xs">
                      同步命名空间（Key Prefix）
                    </label>
                    <input
                      type="text"
                      value={syncNamespace}
                      onChange={(e) => setSyncNamespace(e.target.value)}
                      placeholder={DEFAULT_SYNC_NAMESPACE}
                      className={baseInputClassName}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAutoSyncEnabled((prev) => !prev)}
                      className={`px-3 py-2 text-[13px] sm:text-sm rounded-lg border transition-colors ${
                        autoSyncEnabled
                          ? 'bg-blue-500/18 border-blue-400/70 text-white shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                          : buttonGroupClassName
                      }`}
                    >
                      {autoSyncEnabled ? '自动同步：已开启' : '自动同步：已关闭'}
                    </button>
                    <select
                      value={autoSyncInterval}
                      onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                      aria-label="自动同步间隔"
                      title="自动同步间隔"
                      className={baseInputClassName}
                    >
                      {AUTO_SYNC_INTERVAL_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          每 {option} 分钟
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="ui-field-label mb-2 text-[11px] sm:text-xs">
                    第三方日历订阅
                  </label>
                  <textarea
                    value={calendarSubscription}
                    onChange={(e) => setCalendarSubscription(e.target.value)}
                    placeholder="粘贴 iCal/CalDAV 订阅地址，支持多行"
                    rows={3}
                    className={baseInputClassName}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="ui-section-label text-[11px] sm:text-xs">附件存储（WebDAV）</div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!webdavUrl || !webdavUsername || !webdavPassword) {
                          alert('请先填写完整 WebDAV 信息');
                          return;
                        }
                        try {
                          const res = await fetch('/api/test-connection', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type: 'webdav',
                              config: { url: webdavUrl, username: webdavUsername, password: webdavPassword },
                            }),
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            alert('连接成功');
                          } else {
                            alert(`连接失败: ${data.error || '未知错误'}\n${data.details || ''}`);
                          }
                        } catch (error) {
                          alert(`请求失败: ${String(error)}`);
                        }
                      }}
                      className="rounded-full border border-[rgba(var(--theme-accent),0.28)] bg-[rgba(var(--theme-accent),0.08)] px-2.5 py-1 text-[10px] text-[color:rgb(var(--theme-accent))] transition-all hover:border-[rgba(var(--theme-accent),0.42)] hover:bg-[rgba(var(--theme-accent),0.12)] hover:brightness-110"
                    >
                      测试 WebDAV
                    </button>
                  </div>
                  <div>
                    <label className="ui-field-label mb-2 text-[11px] sm:text-xs">服务地址</label>
                    <input
                      type="text"
                      value={webdavUrl}
                      onChange={(e) => setWebdavUrl(e.target.value)}
                      placeholder={DEFAULT_WEBDAV_URL}
                      className={baseInputClassName}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="ui-field-label mb-2 text-[11px] sm:text-xs">用户名</label>
                      <input
                        type="text"
                        value={webdavUsername}
                        onChange={(e) => setWebdavUsername(e.target.value)}
                        placeholder="用户名"
                        className={baseInputClassName}
                      />
                    </div>
                    <div>
                      <label className="ui-field-label mb-2 text-[11px] sm:text-xs">密码</label>
                      <input
                        type="password"
                        value={webdavPassword}
                        onChange={(e) => setWebdavPassword(e.target.value)}
                        placeholder="密码"
                        className={baseInputClassName}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </details>

          <details
            ref={dataSectionRef}
            className="group settings-section scroll-mt-6 rounded-[24px] border border-[color:var(--ui-border-soft)] bg-[rgba(255,255,255,0.03)] p-3.5"
          >
            <summary className="ui-section-label ui-state-hover flex cursor-pointer list-none items-center justify-between gap-2 rounded-[22px] px-2.5 py-2">
              <span>数据导入导出</span>
              <ChevronDown className="w-3.5 h-3.5 text-[color:var(--ui-icon-muted)] transition-transform duration-[var(--motion-base)] group-open:rotate-180" />
            </summary>
            <div className="grid grid-rows-[0fr] opacity-85 transition-[grid-template-rows,opacity] duration-[var(--motion-slow)] ease-out group-open:grid-rows-[1fr] group-open:opacity-100">
              <div className="overflow-hidden mt-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="btn btn-secondary btn-md rounded-2xl"
                  >
                    导出 JSON
                  </button>
                  <button
                    type="button"
                    onClick={openImportPicker}
                    className="btn btn-secondary btn-md rounded-2xl"
                  >
                    导入 JSON
                  </button>
                </div>

                <div className="mt-3">
                  <label className="ui-field-label mb-2 text-[11px] sm:text-xs">导入方式</label>
                  <div className="flex gap-2 text-[12px] sm:text-xs">
                    <button
                      type="button"
                      onClick={() => setImportMode('merge')}
                      className={`btn btn-sm ${
                        importMode === 'merge'
                          ? 'bg-blue-500/18 border-blue-400/70 text-white shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                          : buttonGroupClassName
                      }`}
                    >
                      合并
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('overwrite')}
                      className={`btn btn-sm ${
                        importMode === 'overwrite'
                          ? 'bg-blue-500/18 border-blue-400/70 text-white shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                          : buttonGroupClassName
                      }`}
                    >
                      覆盖
                    </button>
                  </div>
                  <p className="ui-note mt-2 text-[11px] sm:text-xs">
                    合并会保留现有数据，覆盖将以导入文件为准。
                  </p>
                </div>

                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </div>
            </div>
          </details>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
