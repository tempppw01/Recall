export const WEB_SEARCH_ENABLED_KEY = 'recall_web_search_enabled';
export const WEB_SEARCH_PROVIDER_KEY = 'recall_web_search_provider';
export const WEB_SEARCH_TAVILY_API_KEY = 'recall_web_search_tavily_api_key';
export const WEB_SEARCH_MAX_RESULTS_KEY = 'recall_web_search_max_results';

export const WEB_SEARCH_PROVIDERS = ['tavily', 'google', 'bing', 'baidu'] as const;
export type WebSearchProvider = (typeof WEB_SEARCH_PROVIDERS)[number];

export const DEFAULT_WEB_SEARCH_PROVIDER: WebSearchProvider = 'tavily';
export const DEFAULT_WEB_SEARCH_MAX_RESULTS = 5;
export const WEB_SEARCH_MAX_RESULT_OPTIONS = [3, 5, 8] as const;

export const WEB_SEARCH_PROVIDER_LABELS: Record<WebSearchProvider, string> = {
  tavily: 'Tavily',
  google: 'Google',
  bing: 'Bing',
  baidu: 'Baidu',
};

export function normalizeWebSearchProvider(value: unknown): WebSearchProvider {
  return WEB_SEARCH_PROVIDERS.includes(value as WebSearchProvider)
    ? (value as WebSearchProvider)
    : DEFAULT_WEB_SEARCH_PROVIDER;
}

export function normalizeWebSearchMaxResults(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_WEB_SEARCH_MAX_RESULTS;
  return Math.max(1, Math.min(8, Math.round(parsed)));
}
