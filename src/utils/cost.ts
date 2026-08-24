type TokenPricing = {
  inputPerMillion: number;
  cachedInputPerMillion: number;
  outputPerMillion: number;
};

const MODEL_PRICING: Record<string, TokenPricing> = {
  'gpt-5.6-luna': { inputPerMillion: 1.25, cachedInputPerMillion: 0.125, outputPerMillion: 10 },
};

const FALLBACK_PRICING: TokenPricing = { inputPerMillion: 1.25, cachedInputPerMillion: 0.125, outputPerMillion: 10 };

export const estimateCostUsd = (
  inputTokens: number,
  outputTokens: number,
  model?: string,
  cachedInputTokens = 0
): number => {
  const pricing = (model && MODEL_PRICING[model]) || FALLBACK_PRICING;
  const cached = Math.min(Math.max(cachedInputTokens, 0), Math.max(inputTokens, 0));
  const freshInput = Math.max(inputTokens, 0) - cached;
  return (
    (freshInput / 1_000_000) * pricing.inputPerMillion +
    (cached / 1_000_000) * pricing.cachedInputPerMillion +
    (Math.max(outputTokens, 0) / 1_000_000) * pricing.outputPerMillion
  );
};

const readNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

export const estimateCostFromUsage = (usage: unknown, model?: string): number => {
  if (!usage || typeof usage !== 'object') return 0;
  const record = usage as Record<string, unknown>;
  const details =
    record.input_tokens_details && typeof record.input_tokens_details === 'object'
      ? (record.input_tokens_details as Record<string, unknown>)
      : {};
  return estimateCostUsd(
    readNumber(record.input_tokens),
    readNumber(record.output_tokens),
    model,
    readNumber(details.cached_tokens)
  );
};

export const formatCostLabel = (costUsd: number): string => {
  if (!Number.isFinite(costUsd) || costUsd < 0) return '';
  if (costUsd >= 1) return `$${costUsd.toFixed(2)}`;
  const cents = costUsd * 100;
  if (cents >= 10) return `${Math.round(cents)}¢`;
  return `${cents.toFixed(1)}¢`;
};

export const formatElapsedLabel = (elapsedMs: number): string => {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return '';
  const seconds = elapsedMs / 1000;
  return seconds >= 10 ? `${Math.round(seconds)} seconds` : `${seconds.toFixed(1)} seconds`;
};

export const formatQueryStats = (
  elapsedMs?: number,
  costUsd?: number,
  separator = ' • '
): string => {
  const parts = [
    elapsedMs != null ? formatElapsedLabel(elapsedMs) : '',
    costUsd != null ? formatCostLabel(costUsd) : '',
  ].filter(Boolean);
  return parts.join(separator);
};
