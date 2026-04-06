import { describe, expect, it } from 'vitest';
import { classifyTransaction } from '../../src/modules/classification/classifier.js';

describe('classifyTransaction', () => {
  it('suggests software category and activity for software vendors', () => {
    const result = classifyTransaction('GitHub', 'monthly subscription');
    expect(result.categorySuggested).toBe('software_tools');
    expect(result.businessActivitySuggested).toBe('software_business');
    expect(result.confidenceScore).toBeGreaterThan(0.8);
  });

  it('forces review for suspected duplicates', () => {
    const result = classifyTransaction('GitHub', 'monthly subscription', 'suspected_duplicate');
    expect(result.reviewStatus).toBe('needs_review');
    expect(result.confidenceScore).toBeLessThanOrEqual(0.4);
  });
});
