import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import PgSettings from '@/app/components/PgSettings';
import RedisSettings from '@/app/components/RedisSettings';

type CountdownDisplayMode = 'days' | 'date';
type ThemePreference = 'system' | 'light' | 'dark';
type AccentTheme = 'blue' | 'violet' | 'emerald' | 'rose';
type GradientTheme = 'aurora' | 'sunset' | 'ocean' | 'mono';
type SettingsFocusTarget = 'sync' | null;

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
  const firstAutoSaveRef = useRef(true);
  const autoSavedNoticeTimerRef = useRef<number | null>(null);
  const lastAutoFetchedModelKeyRef = useRef<string | null>(null);
  const serverSettingsRef = useRef<HTMLDetailsElement>(null);
  const hasApiKey = Boolean(apiKey.trim());

  const availableModels = useMemo(() => {
    const models = parseModelList(modelListText);
    return models.length > 0 ? models : DEFAULT_MODEL_LIST;
  }, [DEFAULT_MODEL_LIST, modelListText, parseModelList]);

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
      if (autoSavedNoticeTimerRef.current) {
        window.clearTimeout(autoSavedNoticeTimerRef.current);
        autoSavedNoticeTimerRef.current = null;
      }
    }
  }, [showSettings]);

  useEffect(() => {
    if (!showSettings || settingsFocusTarget !== 'sync') return;
    setIsServerSettingsOpen(true);

    window.setTimeout(() => {
      serverSettingsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 80);
  }, [settingsFocusTarget, showSettings]);

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-3 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 motion-modal-overlay">
      <div className="absolute inset-0" onClick={() => setShowSettings(false)} />
      <div
        className="theme-native-surface ui-modal-surface mobile-modal mobile-modal-body motion-modal-surface relative max-h-[90vh] w-full max-w-2xl overflow-y-auto p-4 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="ui-modal-title">设置</h2>
            <p className="ui-modal-subtitle">
              把 AI、同步、通知、存储和外观放在这里。
            </p>
          </div>
        </div>

        <div className="space-y-3.5 sm:space-y-4 text-sm">
          <details
            open={isApiSettingsOpen}
            onToggle={(event) =>
              setIsApiSettingsOpen((event.currentTarget as HTMLDetailsElement).open)
            }
            className="group settings-section rounded-[22px] p-3 sm:p-3.5"
          >
            <summary className="ui-section-label cursor-pointer list-none flex items-center justify-between gap-2 rounded-2xl px-2 py-1.5 ui-state-hover">
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
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="ui-field-label mb-0 text-[11px] sm:text-xs">
                      对话模型
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleFetchModelList('manual')}
                      disabled={!hasApiKey || isFetchingModels}
                      className="btn btn-sm btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      title="拉取模型列表"
                    >
                      {isFetchingModels ? '拉取中...' : hasApiKey ? '拉取模型列表' : '填写密钥后可拉取'}
                    </button>
                  </div>
                  <select
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
                    默认模型已调整为 deepseek-v4-flash；此处获得焦点时会尝试自动刷新，也可点击右上角手动拉取。
                  </p>
                  {modelFetchError && (
                    <p className="text-[11px] sm:text-xs text-red-300 mt-2">{modelFetchError}</p>
                  )}
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
                          限制每次发送给 AI 的任务摘要、长期记忆和短期对话数量；越小越快，越大越完整。
                        </p>
                      </div>
                    </div>
                  </div>
                </details>

                <div className="rounded-[18px] border border-[var(--ui-border-soft)] bg-transparent p-3 space-y-3">
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

          <details className="group settings-section rounded-[22px] p-3 sm:p-3.5">
            <summary className="ui-section-label cursor-pointer list-none flex items-center justify-between gap-2 rounded-2xl px-2 py-1.5 ui-state-hover">
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
            className={`group settings-section rounded-[22px] p-3 sm:p-3.5 ${
              settingsFocusTarget === 'sync' ? 'ring-1 ring-amber-300/35' : ''
            }`}
          >
            <summary className="ui-section-label cursor-pointer list-none flex items-center justify-between gap-2 rounded-2xl px-2 py-1.5 ui-state-hover">
              <span>API 专用设置组</span>
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

          <details className="group settings-section rounded-[22px] p-3 sm:p-3.5">
            <summary className="ui-section-label cursor-pointer list-none flex items-center justify-between gap-2 rounded-2xl px-2 py-1.5 ui-state-hover">
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

        {showAutoSavedNotice && (
          <div className="pointer-events-none sticky bottom-3 ml-auto mt-4 w-fit rounded-2xl border border-[rgba(var(--theme-accent),0.24)] bg-[rgba(var(--theme-accent),0.12)] px-3 py-2 text-[12px] text-[color:var(--ui-text-strong)] opacity-100 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-200">
            已自动保存
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
