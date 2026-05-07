export const AI_CONTEXT_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export const DEFAULT_AI_CONTEXT_LIMIT = 50;
export const AI_CONTEXT_LIMIT_STORAGE_KEY = 'recall_ai_context_limit';

export type AiContextLimit = (typeof AI_CONTEXT_LIMIT_OPTIONS)[number];

export function normalizeAiContextLimit(value: unknown): AiContextLimit {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_AI_CONTEXT_LIMIT;

  const rounded = Math.round(numeric);
  return AI_CONTEXT_LIMIT_OPTIONS.reduce<AiContextLimit>((closest, option) => {
    const closestDistance = Math.abs(closest - rounded);
    const optionDistance = Math.abs(option - rounded);
    return optionDistance < closestDistance ? option : closest;
  }, DEFAULT_AI_CONTEXT_LIMIT);
}
