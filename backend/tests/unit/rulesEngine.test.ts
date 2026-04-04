import { describe, expect, it } from 'vitest';
import { confidenceFromSignals, evaluateRules } from '../../src/modules/rules/rulesEngine.js';

describe('rules engine', () => {
  it('suggests software subscriptions for known vendors', () => {
    const result = evaluateRules({ vendor: 'Adobe', amount: 20, direction: 'expense' });
    expect(result.categorySuggestion).toBe('software_subscriptions');
    expect(result.suggestion).toBe('likely_current_year_business_expense');
    expect(result.reviewFlag).toBe(false);
  });

  it('flags meals for review with mixed-use treatment', () => {
    const result = evaluateRules({ vendor: 'Local Diner', amount: 30, direction: 'expense', category: 'meals' });
    expect(result.reviewFlag).toBe(true);
    expect(result.suggestion).toBe('likely_mixed_use_partial');
    expect(result.confidence).toBeLessThan(0.7);
  });

  it('routes unknown patterns to needs review fallback', () => {
    const result = evaluateRules({ vendor: 'Unknown 999', amount: 15, direction: 'expense' });
    expect(result.suggestion).toBe('needs_review');
    expect(result.matchedReason).toBe('fallback');
  });

  it('confidence scoring helper adjusts for review flags', () => {
    expect(confidenceFromSignals(0.9, false)).toBe(0.9);
    expect(confidenceFromSignals(0.9, true)).toBe(0.75);
    expect(confidenceFromSignals(0.02, true)).toBe(0.1);
  });
});
