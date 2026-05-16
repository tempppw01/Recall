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
  previewClassName: string;
  glowClassName: string;
}> = [
  {
    value: 'aurora',
    label: '极光',
    previewClassName: 'bg-[linear-gradient(135deg,#22D3EE_0%,#60A5FA_38%,#A78BFA_72%,#34D399_100%)]',
    glowClassName: 'shadow-[0_0_24px_rgba(34,211,238,0.20)]',
  },
  {
    value: 'sunset',
    label: '日落',
    previewClassName: 'bg-[linear-gradient(135deg,#FB7185_0%,#F97316_45%,#F59E0B_100%)]',
    glowClassName: 'shadow-[0_0_24px_rgba(249,115,22,0.20)]',
  },
  {
    value: 'ocean',
    label: '海洋',
    previewClassName: 'bg-[linear-gradient(135deg,#38BDF8_0%,#2563EB_45%,#0F172A_100%)]',
    glowClassName: 'shadow-[0_0_24px_rgba(37,99,235,0.20)]',
  },
  {
    value: 'mono',
    label: '极简',
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
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: 'ai',
    label: 'AI 与模型',
    description: '模型、上下文和创建策略',
    icon: Bot,
  },
  {
    key: 'appearance',
    label: '外观主题',
    description: '日夜间、主色和渐变风格',
    icon: Palette,
  },
  {
    key: 'sync',
    label: '同步与附件',
    description: 'Redis、日历订阅和 WebDAV',
    icon: Cloud,
  },
  {
    key: 'notifications',
    label: '通知',
    description: '浏览器权限和测试通知',
    icon: Bell,
  },
  {
    key: 'data',
    label: '数据',
    description: '导入、导出和恢复',
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
      getSectionTarget(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  }, [settingsFocusTarget, showSettings]);

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 z-50 motion-modal-overlay">
      <div
        className="absolute inset-0 bg-[rgba(6,11,23,0.72)] backdrop-blur-xl"
        onClick={() => setShowSettings(false)}
      />
      <div
        className="relative flex h-full items-stretch justify-center p-0 sm:p-4 lg:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="theme-native-surface relative flex h-full w-full max-w-[1180px] overflow-hidden border border-[color:var(--ui-border-strong)] bg-[linear-gradient(180deg,rgba(10,15,28,0.98),rgba(15,23,42,0.94))] shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:h-[min(90vh,880px)] sm:rounded-[34px]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,rgba(var(--theme-accent),0.18),transparent_70%)] opacity-90" />
          <aside className="relative z-10 flex w-full shrink-0 flex-col border-b border-[color:var(--ui-border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] lg:w-[290px] lg:border-b-0 lg:border-r">
            <div className="border-b border-[color:var(--ui-border-soft)] px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(var(--theme-accent),0.22)] bg-[rgba(var(--theme-accent),0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ui-text-muted)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    设置工作台
                  </span>
                  <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.04em] text-white">设置</h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--ui-text-muted)]">
                    把 AI、同步、通知、存储和外观收进一个更聚焦的弹出工作台。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--ui-border-soft)] bg-white/5 text-[color:var(--ui-text-secondary)] transition-all hover:border-[color:var(--ui-border-strong)] hover:bg-white/10 hover:text-white lg:hidden"
                  aria-label="关闭设置"
                  title="关闭设置"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.05] px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--ui-text-faint)]">模型</p>
                  <p className="mt-2 text-lg font-semibold text-white">{availableModels.length}</p>
                  <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">{hasApiKey ? '已接入模型' : '待配置密钥'}</p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.05] px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--ui-text-faint)]">同步</p>
                  <p className="mt-2 text-lg font-semibold text-white">{autoSyncEnabled ? 'ON' : 'OFF'}</p>
                  <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">{autoSyncEnabled ? `每 ${autoSyncInterval} 分钟` : '手动同步'}</p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.05] px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--ui-text-faint)]">主题</p>
                  <p className="mt-2 text-sm font-semibold text-white">{themeModeLabel}</p>
                  <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">当前风格已实时预览</p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.05] px-3 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--ui-text-faint)]">通知</p>
                  <p className="mt-2 text-sm font-semibold text-white">{notificationStatusLabel}</p>
                  <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">浏览器权限状态</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto px-3 py-3 lg:flex-1 lg:overflow-y-auto lg:px-4 lg:py-4">
              <div className="flex gap-2 lg:flex-col">
                {SETTINGS_SECTIONS.map(({ key, label, description, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => scrollToSection(key)}
                    className={`group flex min-w-[170px] items-center gap-3 rounded-[22px] border px-3.5 py-3 text-left transition-all lg:min-w-0 ${
                      activeSection === key
                        ? 'border-[rgba(var(--theme-accent),0.26)] bg-[rgba(var(--theme-accent),0.14)] shadow-[0_18px_32px_rgba(0,0,0,0.18)]'
                        : 'border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border transition-all ${
                      activeSection === key
                        ? 'border-[rgba(var(--theme-accent),0.26)] bg-[rgba(var(--theme-accent),0.16)] text-[color:rgb(var(--theme-accent))]'
                        : 'border-[color:var(--ui-border-soft)] bg-white/[0.04] text-[color:var(--ui-text-secondary)] group-hover:text-white'
                    }`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{label}</span>
                      <span className="mt-1 block truncate text-xs text-[color:var(--ui-text-muted)]">{description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--ui-border-soft)] px-4 py-4 sm:px-6 lg:px-7">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ui-text-faint)]">
                  当前模块
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white sm:text-[22px]">
                  {activeSectionMeta.label}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--ui-text-muted)]">
                  {activeSectionMeta.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {showAutoSavedNotice ? (
                  <span className="rounded-full border border-[rgba(var(--theme-accent),0.24)] bg-[rgba(var(--theme-accent),0.12)] px-3 py-1 text-[11px] font-medium text-[color:var(--ui-text-strong)]">
                    已自动保存
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--ui-border-soft)] bg-white/5 text-[color:var(--ui-text-secondary)] transition-all hover:border-[color:var(--ui-border-strong)] hover:bg-white/10 hover:text-white lg:inline-flex"
                  aria-label="关闭设置"
                  title="关闭设置"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-7">
              <div className="space-y-3.5 text-sm sm:space-y-4">
          <details
            ref={aiSectionRef}
            open={isApiSettingsOpen}
            onToggle={(event) =>
              setIsApiSettingsOpen((event.currentTarget as HTMLDetailsElement).open)
            }
            className="group settings-section scroll-mt-6 rounded-[28px] border border-[color:var(--ui-border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.16)]"
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
                  <p className="ui-note mt-2 text-[11px] sm:text-xs">
                    点击模型选择器时会自动尝试刷新模型列表，避免额外的手动拉取步骤。
                  </p>
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
                    <p className="ui-note mt-1 text-[11px] sm:text-xs">
                      用于后续向量化知识库内容，当前会随设置同步保存。
                    </p>
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
                    <p className="ui-note mt-1 text-[11px] sm:text-xs">
                      用于从候选资料中挑更相关的内容，未配置时使用本地相关度。
                    </p>
                  </div>
                </div>

                <div>
                  <label className="ui-field-label mb-2 text-[11px] sm:text-xs">
                    倒数日显示模式
                  </label>
                  <div className="flex gap-2 text-[12px] sm:text-xs">
                    <button
                      type="button"
                      onClick={() => setCountdownDisplayMode('days')}
                      className={`btn btn-sm ${
                        countdownDisplayMode === 'days'
                          ? 'bg-blue-500/18 border-blue-400/70 text-white shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                          : buttonGroupClassName
                      }`}
                    >
                      剩余天数
                    </button>
                    <button
                      type="button"
                      onClick={() => setCountdownDisplayMode('date')}
                      className={`btn btn-sm ${
                        countdownDisplayMode === 'date'
                          ? 'bg-blue-500/18 border-blue-400/70 text-white shadow-[0_0_0_4px_rgba(var(--theme-accent),0.10)]'
                          : buttonGroupClassName
                      }`}
                    >
                      目标日期
                    </button>
                  </div>
                  <p className="ui-note mt-1 text-[11px] sm:text-xs">倒数日卡片右侧显示方式</p>
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
                      <p className="ui-note mt-1 text-[11px] sm:text-xs">
                        超时将直接本地创建，避免无法新增。作为高级兜底设置，默认不放在常用区域。
                      </p>
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
                        <p className="ui-note mt-1 text-[11px] sm:text-xs">
                          限制每次发送给 AI 的任务摘要、知识库候选和最近对话数量；越小越快，越大越完整。
                        </p>
                      </div>
                    </div>
                  </div>
                </details>

                <div
                  ref={appearanceSectionRef}
                  className="scroll-mt-6 space-y-3 rounded-[22px] border border-[var(--ui-border-soft)] bg-[rgba(255,255,255,0.02)] p-3.5"
                >
                  <div className="ui-section-label text-[11px] sm:text-xs">外观主题</div>

                  <div>
                    <label className="ui-field-label mb-2 text-[11px] sm:text-xs">
                      主题模式
                    </label>
                    <div className="flex flex-wrap gap-2 text-[12px] sm:text-xs">
                      {([
                        ['system', '跟随系统'],
                        ['light', '浅色'],
                        ['dark', '深色'],
                      ] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setThemePreference(mode)}
                          className={`btn btn-sm ${
                            themePreference === mode
                              ? 'btn btn-sm ui-chip ui-chip-active text-[12px] sm:text-xs'
                              : buttonGroupClassName
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="ui-field-label mb-2 text-[11px] sm:text-xs">
                      主色
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ACCENT_THEME_OPTIONS.map(({ value, label, previewClassName, glowClassName }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAccentTheme(value)}
                          className={`rounded-2xl border p-2.5 text-left transition-all ${
                            accentTheme === value
                              ? `ui-chip ui-chip-active ${glowClassName}`
                              : 'ui-chip'
                          }`}
                        >
                          <span className={`block h-11 rounded-xl ${previewClassName}`} />
                          <span className="mt-2 block text-xs font-medium text-center">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="ui-field-label mb-2 text-[11px] sm:text-xs">
                      渐变风格
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {GRADIENT_THEME_OPTIONS.map(({ value, label, previewClassName, glowClassName }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setGradientTheme(value)}
                          className={`rounded-2xl border p-2.5 text-left transition-all ${
                            gradientTheme === value
                              ? `ui-chip ui-chip-active ${glowClassName}`
                              : 'ui-chip'
                          }`}
                        >
                          <span className={`block h-11 rounded-xl ${previewClassName}`} />
                          <span className="mt-2 block text-xs font-medium text-center">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="ui-note text-[11px] sm:text-xs">
                    现在颜色卡片会直接预览主题颜色和渐变氛围，方便选中前就看到效果。
                  </p>
                </div>
              </div>
            </div>
          </details>

          <details
            ref={notificationsSectionRef}
            className="group settings-section scroll-mt-6 rounded-[28px] border border-[color:var(--ui-border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.16)]"
          >
            <summary className="ui-section-label ui-state-hover flex cursor-pointer list-none items-center justify-between gap-2 rounded-[22px] px-2.5 py-2">
              <span>浏览器通知</span>
              <ChevronDown className="w-3.5 h-3.5 text-[color:var(--ui-icon-muted)] transition-transform duration-[var(--motion-base)] group-open:rotate-180" />
            </summary>
            <div className="grid grid-rows-[0fr] opacity-85 transition-[grid-template-rows,opacity] duration-[var(--motion-slow)] ease-out group-open:grid-rows-[1fr] group-open:opacity-100">
              <div className="space-y-3 overflow-hidden mt-3">
                <div className="ui-hint-panel rounded-2xl px-3 py-2.5 text-[12px] sm:text-xs space-y-1">
                  <p>支持情况：{notificationSupported ? '已支持' : '不支持'}（目前以 Safari/现代浏览器为主）</p>
                  <p>安全上下文：{isSecureContext ? '是' : '否（需要 https 或 localhost）'}</p>
                  <p>
                    权限状态：
                    {notificationPermission === 'granted'
                      ? '已授权'
                      : notificationPermission === 'denied'
                      ? '已拒绝'
                      : '未授权'}
                  </p>
                  <p>Service Worker：{serviceWorkerSupported ? '已支持' : '不支持'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={requestNotificationPermission} className="btn btn-md btn-ghost">
                    申请权限
                  </button>
                  <button type="button" onClick={sendTestNotification} className="btn btn-md btn-secondary">
                    发送测试通知
                  </button>
                </div>
                <p className="ui-note text-[11px] sm:text-xs">
                  提示：浏览器会拦截非用户触发的通知，请尽量在手动点击按钮时申请或测试。
                </p>
              </div>
            </div>
          </details>

          <details
            ref={serverSettingsRef}
            open={isServerSettingsOpen}
            onToggle={(event) =>
              setIsServerSettingsOpen((event.currentTarget as HTMLDetailsElement).open)
            }
            className={`group settings-section scroll-mt-6 rounded-[28px] border border-[color:var(--ui-border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.16)] ${
              settingsFocusTarget === 'sync' ? 'ring-1 ring-amber-300/35' : ''
            }`}
          >
            <summary className="ui-section-label ui-state-hover flex cursor-pointer list-none items-center justify-between gap-2 rounded-[22px] px-2.5 py-2">
              <span>同步与附件</span>
              <ChevronDown className="w-3.5 h-3.5 text-[color:var(--ui-icon-muted)] transition-transform duration-[var(--motion-base)] group-open:rotate-180" />
            </summary>
            <div className="grid transition-[grid-template-rows,opacity] duration-[var(--motion-slow)] ease-out group-open:grid-rows-[1fr] group-open:opacity-100 grid-rows-[0fr] opacity-85">
              <div className="space-y-4 overflow-hidden mt-3">
                <div className="ui-hint-panel rounded-2xl px-3 py-2.5 text-[12px] sm:text-xs">
                  用于连接远程服务，当前仍保存在浏览器本地。
                </div>

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
                    <p className="ui-note mt-1 text-[11px] sm:text-xs">
                      类似“房间号”，多端填写一致即可同步同一份数据。
                    </p>
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
                  <p className="ui-note mt-1 text-[11px] sm:text-xs">
                    目前先保存配置，后续可用于自动抓取日历。
                  </p>
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
                  <div className="ui-hint-panel rounded-2xl px-3 py-2.5 text-[12px] sm:text-xs">
                    配置 WebDAV 后可上传图片和文件附件。
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
            className="group settings-section scroll-mt-6 rounded-[28px] border border-[color:var(--ui-border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.16)]"
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
