import { normalizeAiContextLimit } from '@/app/services/aiContextLimit';
import {
  DEFAULT_WEB_SEARCH_MAX_RESULTS,
  DEFAULT_WEB_SEARCH_PROVIDER,
  normalizeWebSearchMaxResults,
  normalizeWebSearchProvider,
  type WebSearchProvider,
} from '@/app/services/webSearchConfig';

export type ResolveSyncedSettingsParams = {
  payload: any;
  current: {
    apiBaseUrl: string;
    modelListText: string;
    chatModel: string;
    embeddingModel: string;
    rerankModel: string;
    webSearchEnabled: boolean;
    webSearchProvider: WebSearchProvider;
    webSearchMaxResults: number;
    fallbackTimeoutSec: number;
    autoSyncEnabled: boolean;
    autoSyncInterval: number;
    countdownDisplayMode: 'date' | 'days';
    aiRetentionDays: number;
    aiContextLimit: number;

    apiKey: string;
    tavilyApiKey: string;
    calendarSubscription: string;
    syncNamespace: string;
  };
  defaults: {
    defaultApiBaseUrl: string;
    defaultModelListText: string;
    defaultChatModel: string;
    defaultEmbeddingModel: string;
    defaultRerankModel: string;
    defaultFallbackTimeoutSec: number;
    defaultAiContextLimit: number;
    defaultAutoSyncIntervalMin: number;
  };
};

export function resolveSyncedSettings(params: ResolveSyncedSettingsParams) {
  const { payload, current, defaults } = params;
  const settings = payload?.settings ?? {};
  const secrets = payload?.secrets ?? {};

  const nextApiBaseUrl = settings.apiBaseUrl || defaults.defaultApiBaseUrl;
  const nextModelListText = settings.modelListText || defaults.defaultModelListText;
  const nextChatModel = settings.chatModel || defaults.defaultChatModel;
  const nextEmbeddingModel = typeof settings.embeddingModel === 'string' && settings.embeddingModel.trim().length > 0
    ? settings.embeddingModel
    : (current.embeddingModel || defaults.defaultEmbeddingModel);
  const nextRerankModel = typeof settings.rerankModel === 'string' && settings.rerankModel.trim().length > 0
    ? settings.rerankModel
    : (current.rerankModel || defaults.defaultRerankModel);
  const nextWebSearchEnabled = typeof settings.webSearchEnabled === 'boolean'
    ? settings.webSearchEnabled
    : current.webSearchEnabled;
  const nextWebSearchProvider = typeof settings.webSearchProvider === 'string'
    ? normalizeWebSearchProvider(settings.webSearchProvider)
    : (current.webSearchProvider || DEFAULT_WEB_SEARCH_PROVIDER);
  const nextWebSearchMaxResults = normalizeWebSearchMaxResults(
    typeof settings.webSearchMaxResults === 'undefined'
      ? (current.webSearchMaxResults || DEFAULT_WEB_SEARCH_MAX_RESULTS)
      : settings.webSearchMaxResults,
  );
  const nextFallback = Number.isFinite(Number(settings.fallbackTimeoutSec))
    ? Number(settings.fallbackTimeoutSec)
    : defaults.defaultFallbackTimeoutSec;
  const nextAutoSyncEnabled = settings.autoSyncEnabled === true;
  const nextAutoSyncInterval = Number(settings.autoSyncInterval) || defaults.defaultAutoSyncIntervalMin;
  const nextCountdownDisplayMode = settings.countdownDisplayMode === 'date' ? 'date' : 'days';
  const nextAiRetentionDays = Math.max(1, Math.min(3, Number(settings.aiRetentionDays) || 1));
  const nextAiContextLimit = normalizeAiContextLimit(
    typeof settings.aiContextLimit === 'undefined' ? defaults.defaultAiContextLimit : settings.aiContextLimit,
  );

  const nextApiKey = typeof secrets.apiKey === 'string' ? secrets.apiKey : current.apiKey;
  const nextTavilyApiKey = typeof secrets.tavilyApiKey === 'string' ? secrets.tavilyApiKey : current.tavilyApiKey;
  const nextCalendarSubscription = typeof settings.calendarSubscription === 'string'
    ? settings.calendarSubscription
    : current.calendarSubscription;
  const nextSyncNamespace = typeof settings.syncNamespace === 'string' && settings.syncNamespace.trim().length > 0
    ? settings.syncNamespace
    : current.syncNamespace;

  return {
    nextApiBaseUrl,
    nextModelListText,
    nextChatModel,
    nextEmbeddingModel,
    nextRerankModel,
    nextWebSearchEnabled,
    nextWebSearchProvider,
    nextWebSearchMaxResults,
    nextTavilyApiKey,
    nextFallback,
    nextAutoSyncEnabled,
    nextAutoSyncInterval,
    nextCountdownDisplayMode,
    nextAiRetentionDays,
    nextAiContextLimit,
    nextApiKey,
    nextCalendarSubscription,
    nextSyncNamespace,
  };
}
