import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PgSettings from '@/app/components/PgSettings';
import RedisSettings from '@/app/components/RedisSettings';

/**
 * 设置弹窗组件
 *
 * 职责：
 * - 管理 AI 接口、模型、通知、同步、数据库连接等设置项展示
 * - 接收页面层状态与 setter（受控组件）
 * - 调用 `persistSettings` 将变更统一持久化
 */
type CountdownDisplayMode = 'days' | 'date';

type SettingsModalProps = {
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
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
  countdownDisplayMode: CountdownDisplayMode;
  setCountdownDisplayMode: React.Dispatch<React.SetStateAction<CountdownDisplayMode>>;
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
  }) => void;
  webdavPath: string;
  aiRetentionDays: number;
};

const SettingsModal = ({
  showSettings,
  setShowSettings,
  apiBaseUrl,
  setApiBaseUrl,
  apiKey,
  setApiKey,
  modelListText,
  setModelListText,
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
  countdownDisplayMode,
  setCountdownDisplayMode,
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
  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-3 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6">
      <div className="absolute inset-0" onClick={() => setShowSettings(false)} />
      <div
        className="mobile-modal mobile-modal-body bg-[#262626] w-full max-w-md rounded-xl border border-[#333333] shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto relative"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base sm:text-lg font-semibold mb-3">设置（别怕，我很温柔）</h2>
        <div className="space-y-3 sm:space-y-4 text-sm">
          <details open className="rounded-lg border border-[#333333] bg-[#1F1F1F] p-3">
            <summary className="cursor-pointer list-none text-[11px] sm:text-xs font-medium text-[#AAAAAA] uppercase flex items-center justify-between gap-2">
              <span>AI 基础设置（点击展开/收起）</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#7A7A7A]" />
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">OpenAI 接口地址</label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    placeholder={DEFAULT_BASE_URL}
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">OpenAI API 密钥</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">模型列表 (逗号或换行分隔)</label>
                <textarea
                  value={modelListText}
                  onChange={(e) => setModelListText(e.target.value)}
                  placeholder={DEFAULT_MODEL_LIST.join('\n')}
                  rows={4}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchModelList}
                    disabled={isFetchingModels}
                    className="px-3 py-1.5 text-[12px] sm:text-xs rounded-lg border border-blue-500 text-blue-200 hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFetchingModels ? '拉取中…' : '拉取模型列表'}
                  </button>
                  <span className="text-[11px] sm:text-xs text-[#666666]">从当前接口同步模型列表</span>
                </div>
                {modelFetchError && (
                  <p className="text-[11px] sm:text-xs text-red-300 mt-2">{modelFetchError}</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">对话模型</label>
                <select
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value)}
                  aria-label="对话模型"
                  title="对话模型"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                >
                  {parseModelList(modelListText).map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">创建超时转本地（秒）</label>
                <input
                  type="number"
                  min={1}
                  value={fallbackTimeoutSec}
                  onChange={(e) => setFallbackTimeoutSec(Number(e.target.value))}
                  placeholder={String(DEFAULT_FALLBACK_TIMEOUT_SEC)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
                <p className="text-[11px] sm:text-xs text-[#555555] mt-1">超时将直接本地创建，避免无法新增（可自由设置）</p>
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase">倒数日显示模式</label>
                <div className="flex gap-2 text-[12px] sm:text-xs">
                  <button
                    type="button"
                    onClick={() => setCountdownDisplayMode('days')}
                    className={`px-3 py-1.5 rounded border transition-colors ${
                      countdownDisplayMode === 'days'
                        ? 'bg-blue-500/20 border-blue-400 text-white'
                        : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                    }`}
                  >
                    剩余天数
                  </button>
                  <button
                    type="button"
                    onClick={() => setCountdownDisplayMode('date')}
                    className={`px-3 py-1.5 rounded border transition-colors ${
                      countdownDisplayMode === 'date'
                        ? 'bg-blue-500/20 border-blue-400 text-white'
                        : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                    }`}
                  >
                    目标日期
                  </button>
                </div>
                <p className="text-[11px] sm:text-xs text-[#555555] mt-1">倒数日卡片右侧显示方式</p>
              </div>
            </div>
          </details>
          <details className="pt-3 border-t border-[#333333]">
            <summary className="cursor-pointer list-none text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase flex items-center justify-between gap-2">
              <span>浏览器通知（点击展开/收起）</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#7A7A7A]" />
            </summary>
            <div className="space-y-3 mt-2">
              <div className="bg-[#1F1F1F] border border-[#333333] rounded-lg px-3 py-2 text-[12px] sm:text-xs text-[#777777] space-y-1">
                <p>支持情况：{notificationSupported ? '已支持' : '不支持'}（目前仅 Safari 表现稳定）</p>
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
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="px-3 py-2 text-[13px] sm:text-sm rounded-lg border border-blue-500 text-blue-200 hover:bg-blue-500/10"
                >
                  申请权限
                </button>
                <button
                  type="button"
                  onClick={sendTestNotification}
                  className="px-3 py-2 text-[13px] sm:text-sm rounded-lg border border-[#333333] text-[#CCCCCC] hover:border-[#555555] hover:text-white"
                >
                  发送测试通知
                </button>
              </div>
              <p className="text-[11px] sm:text-xs text-[#555555]">提示：浏览器会拦截非用户触发的通知，请确保在手动点击按钮时触发。</p>
            </div>
          </details>
          <div className="pt-3 border-t border-[#333333]">
            <button
              type="button"
              onClick={() => setIsApiSettingsOpen(!isApiSettingsOpen)}
              className="w-full flex items-center justify-between text-[11px] sm:text-xs font-medium text-[#888888] mb-3 uppercase hover:text-[#CCCCCC]"
            >
              <span>API 专用设置组</span>
              {isApiSettingsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {isApiSettingsOpen && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-[#1F1F1F] border border-[#333333] rounded-lg px-3 py-2 text-[12px] sm:text-xs text-[#777777]">
                  用于连接远程服务，当前仍保存在浏览器本地。请确保填写后保存。
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
                />
                <div className="space-y-3">
                  <div className="text-[11px] sm:text-xs text-[#999999] uppercase">同步设置</div>
                  <div>
                    <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">同步命名空间 (Key Prefix)</label>
                    <input
                      type="text"
                      value={syncNamespace}
                      onChange={(e) => setSyncNamespace(e.target.value)}
                      placeholder={DEFAULT_SYNC_NAMESPACE}
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                    />
                    <p className="text-[11px] sm:text-xs text-[#555555] mt-1">类似“房间号”，多端填写一致即可同步同一份数据。</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAutoSyncEnabled((prev) => !prev)}
                      className={`px-3 py-2 text-[13px] sm:text-sm rounded-lg border transition-colors ${
                        autoSyncEnabled
                          ? 'bg-blue-600/20 border-blue-400 text-white'
                          : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                      }`}
                    >
                      {autoSyncEnabled ? '自动同步：已开启' : '自动同步：已关闭'}
                    </button>
                    <select
                      value={autoSyncInterval}
                      onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                      aria-label="自动同步间隔"
                      title="自动同步间隔"
                      className="bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm text-[#CCCCCC] focus:outline-none focus:border-blue-500"
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
                  <label className="block text-[11px] sm:text-xs text-[#999999] uppercase mb-2">第三方日历订阅</label>
                  <textarea
                    value={calendarSubscription}
                    onChange={(e) => setCalendarSubscription(e.target.value)}
                    placeholder="粘贴 iCal/CalDAV 订阅地址，支持多行"
                    rows={3}
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  <p className="text-[11px] sm:text-xs text-[#555555] mt-1">目前仅保存配置，后续可用于自动抓取日历。</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] sm:text-xs text-[#999999] uppercase">附件存储 (WebDAV)</div>
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
                            alert('连接成功！');
                          } else {
                            alert(`连接失败: ${data.error || '未知错误'} \n${data.details || ''}`);
                          }
                        } catch (error) {
                          alert(`请求失败: ${String(error)}`);
                        }
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300"
                    >
                      测试连接
                    </button>
                  </div>
                  <div className="bg-[#1F1F1F] border border-[#333333] rounded-lg px-3 py-2 text-[12px] sm:text-xs text-[#777777]">
                    配置 WebDAV 后可上传图片/文件附件。
                  </div>
                  <div>
                    <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">服务地址</label>
                    <input
                      type="text"
                      value={webdavUrl}
                      onChange={(e) => setWebdavUrl(e.target.value)}
                      placeholder={DEFAULT_WEBDAV_URL}
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">用户名</label>
                      <input
                        type="text"
                        value={webdavUsername}
                        onChange={(e) => setWebdavUsername(e.target.value)}
                        placeholder="用户名"
                        className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">密码</label>
                      <input
                        type="password"
                        value={webdavPassword}
                        onChange={(e) => setWebdavPassword(e.target.value)}
                        placeholder="密码"
                        className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[13px] sm:text-sm focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <details className="pt-3 border-t border-[#333333]">
            <summary className="cursor-pointer list-none text-[11px] sm:text-xs font-medium text-[#888888] mb-2 uppercase flex items-center justify-between gap-2">
              <span>数据导入导出（搬家专用，点击展开/收起）</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#7A7A7A]" />
            </summary>
            <div className="mt-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="px-3 py-2 text-[13px] sm:text-sm bg-[#1F1F1F] border border-[#333333] rounded-lg text-[#CCCCCC] hover:border-[#555555] hover:text-white"
                >
                  导出 JSON
                </button>
                <button
                  type="button"
                  onClick={openImportPicker}
                  className="px-3 py-2 text-[13px] sm:text-sm bg-[#1F1F1F] border border-[#333333] rounded-lg text-[#CCCCCC] hover:border-[#555555] hover:text-white"
                >
                  导入 JSON
                </button>
              </div>
              <div className="mt-3">
                <label className="block text-[11px] sm:text-xs text-[#666666] mb-2">导入方式</label>
                <div className="flex gap-2 text-[12px] sm:text-xs">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`px-3 py-1.5 rounded border transition-colors ${
                      importMode === 'merge'
                        ? 'bg-blue-500/20 border-blue-400 text-white'
                        : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                    }`}
                  >
                    合并
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('overwrite')}
                    className={`px-3 py-1.5 rounded border transition-colors ${
                      importMode === 'overwrite'
                        ? 'bg-blue-500/20 border-blue-400 text-white'
                        : 'border-[#333333] text-[#888888] hover:text-white hover:border-[#555555]'
                    }`}
                  >
                    覆盖
                  </button>
                </div>
                <p className="text-[11px] sm:text-xs text-[#555555] mt-2">合并会保留现有数据，覆盖将以导入文件为准。</p>
              </div>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportData}
                className="hidden"
              />
            </div>
          </details>

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={() => setShowSettings(false)}
              className="px-3 py-2 text-[13px] sm:text-sm text-[#AAAAAA] hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                const normalizedTimeout = normalizeTimeoutSec(fallbackTimeoutSec);
                setFallbackTimeoutSec(normalizedTimeout);
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
                });
                setShowSettings(false);
              }}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-[13px] sm:text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
