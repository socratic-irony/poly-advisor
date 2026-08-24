type TokenPricing = { inputPerMillion: number; outputPerMillion: number };

const MODEL_PRICING: Record<string, TokenPricing> = {
  'gpt-5.6-luna': { inputPerMillion: 1.25, outputPerMillion: 10 },
};

const FALLBACK_PRICING: TokenPricing = { inputPerMillion: 1.25, outputPerMillion: 10 };

export const estimateCostUsd = (
  inputTokens: number,
  outputTokens: number,
  model?: string
): number => {
  const pricing = (model && MODEL_PRICING[model]) || FALLBACK_PRICING;
  return (inputTokens / 1_000_000) * pricing.inputPerMillion + (outputTokens / 1_000_000) * pricing.outputPerMillion;
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
