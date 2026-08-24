import { describe, it, expect } from 'vitest';
import {
  estimateCostFromUsage,
  estimateCostUsd,
  formatCostLabel,
  formatElapsedLabel,
  formatQueryStats,
} from './cost';

describe('estimateCostUsd', () => {
  it('prices input and output tokens for a known model', () => {
    expect(estimateCostUsd(80_000, 10_000, 'gpt-5.6-luna')).toBeCloseTo(0.2, 6);
  });

  it('bills cached input tokens at the discounted cached rate', () => {
    expect(estimateCostUsd(80_000, 10_000, 'gpt-5.6-luna', 40_000)).toBeCloseTo(0.155, 6);
  });

  it('falls back to default pricing for unknown models', () => {
    expect(estimateCostUsd(80_000, 10_000, 'mystery-model')).toBeCloseTo(0.2, 6);
  });

  it('returns zero when no tokens were used', () => {
    expect(estimateCostUsd(0, 0)).toBe(0);
  });
});

describe('estimateCostFromUsage', () => {
  it('prices a real Responses API usage object including cached tokens', () => {
    const usage = {
      input_tokens: 80_000,
      input_tokens_details: { cached_tokens: 40_000 },
      output_tokens: 10_000,
      output_tokens_details: { reasoning_tokens: 2_000 },
      total_tokens: 90_000,
    };
    expect(estimateCostFromUsage(usage, 'gpt-5.6-luna')).toBeCloseTo(0.155, 6);
  });

  it('treats missing token details as zero cached tokens', () => {
    const usage = { input_tokens: 80_000, output_tokens: 10_000 };
    expect(estimateCostFromUsage(usage, 'gpt-5.6-luna')).toBeCloseTo(0.2, 6);
  });

  it('returns zero for missing or malformed usage objects', () => {
    expect(estimateCostFromUsage(undefined)).toBe(0);
    expect(estimateCostFromUsage('nope')).toBe(0);
    expect(estimateCostFromUsage({})).toBe(0);
  });
});

describe('formatCostLabel', () => {
  it('formats sub-cent costs with one decimal place in cents', () => {
    expect(formatCostLabel(0.002)).toBe('0.2¢');
  });

  it('formats multi-cent costs as whole cents', () => {
    expect(formatCostLabel(0.15)).toBe('15¢');
  });

  it('formats dollar-and-up costs in dollars', () => {
    expect(formatCostLabel(1.5)).toBe('$1.50');
  });

  it('returns an empty string for invalid values', () => {
    expect(formatCostLabel(NaN)).toBe('');
    expect(formatCostLabel(-1)).toBe('');
  });
});

describe('formatElapsedLabel', () => {
  it('reports whole seconds at or above ten seconds', () => {
    expect(formatElapsedLabel(23_000)).toBe('23 seconds');
  });

  it('reports fractional seconds below ten seconds', () => {
    expect(formatElapsedLabel(9_400)).toBe('9.4 seconds');
  });

  it('returns an empty string for invalid values', () => {
    expect(formatElapsedLabel(NaN)).toBe('');
    expect(formatElapsedLabel(-5)).toBe('');
  });
});

describe('formatQueryStats', () => {
  it('joins elapsed time and cost with a separator dot', () => {
    expect(formatQueryStats(23_000, 0.002)).toBe('23 seconds • 0.2¢');
  });

  it('renders only the parts that are available', () => {
    expect(formatQueryStats(23_000, undefined)).toBe('23 seconds');
    expect(formatQueryStats(undefined, 0.002)).toBe('0.2¢');
  });

  it('returns an empty string when nothing is available', () => {
    expect(formatQueryStats(undefined, undefined)).toBe('');
  });
});
