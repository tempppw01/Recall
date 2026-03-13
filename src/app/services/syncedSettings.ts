export type ResolveSyncedSettingsParams = {
  payload: any;
  current: {
    apiBaseUrl: string;
    modelListText: string;
    chatModel: string;
    fallbackTimeoutSec: number;
    autoSyncEnabled: boolean;
    autoSyncInterval: number;
    countdownDisplayMode: 'date' | 'days';
    aiRetentionDays: number;

    apiKey: string;
    pgHost: string;
    pgPort: string;
    pgDatabase: string;
    pgUsername: string;
    pgPassword: string;
    redisHost: string;
    redisPort: string;
    redisDb: string;
    redisPassword: string;
    calendarSubscription: string;
    syncNamespace: string;
  };
  defaults: {
    defaultApiBaseUrl: string;
    defaultModelListText: string;
    defaultChatModel: string;
    defaultFallbackTimeoutSec: number;
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
  const nextFallback = Number.isFinite(Number(settings.fallbackTimeoutSec))
    ? Number(settings.fallbackTimeoutSec)
    : defaults.defaultFallbackTimeoutSec;
  const nextAutoSyncEnabled = settings.autoSyncEnabled === true;
  const nextAutoSyncInterval = Number(settings.autoSyncInterval) || defaults.defaultAutoSyncIntervalMin;
  const nextCountdownDisplayMode = settings.countdownDisplayMode === 'date' ? 'date' : 'days';
  const nextAiRetentionDays = Math.max(1, Math.min(3, Number(settings.aiRetentionDays) || 1));

  const nextApiKey = typeof secrets.apiKey === 'string' ? secrets.apiKey : current.apiKey;
  const nextPgHost = typeof settings.pgHost === 'string' ? settings.pgHost : current.pgHost;
  const nextPgPort = typeof settings.pgPort === 'string' ? settings.pgPort : current.pgPort;
  const nextPgDatabase = typeof settings.pgDatabase === 'string' ? settings.pgDatabase : current.pgDatabase;
  const nextPgUsername = typeof settings.pgUsername === 'string' ? settings.pgUsername : current.pgUsername;
  const nextPgPassword = typeof secrets.pgPassword === 'string' ? secrets.pgPassword : current.pgPassword;
  const nextRedisHost = typeof settings.redisHost === 'string' ? settings.redisHost : current.redisHost;
  const nextRedisPort = typeof settings.redisPort === 'string' ? settings.redisPort : current.redisPort;
  const nextRedisDb = typeof settings.redisDb === 'string' ? settings.redisDb : current.redisDb;
  const nextRedisPassword = typeof secrets.redisPassword === 'string' ? secrets.redisPassword : current.redisPassword;
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
    nextFallback,
    nextAutoSyncEnabled,
    nextAutoSyncInterval,
    nextCountdownDisplayMode,
    nextAiRetentionDays,
    nextApiKey,
    nextPgHost,
    nextPgPort,
    nextPgDatabase,
    nextPgUsername,
    nextPgPassword,
    nextRedisHost,
    nextRedisPort,
    nextRedisDb,
    nextRedisPassword,
    nextCalendarSubscription,
    nextSyncNamespace,
  };
}
