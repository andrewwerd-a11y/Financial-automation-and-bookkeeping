import { describe, expect, it } from 'vitest';
import { deriveEvidenceStatus } from '../../src/modules/evidence/evidence.service.js';

describe('deriveEvidenceStatus', () => {
  it('returns missing when no links', () => {
    expect(deriveEvidenceStatus(0, false)).toBe('missing');
  });

  it('returns linked when links exist without weak links', () => {
    expect(deriveEvidenceStatus(2, false)).toBe('linked');
  });

  it('returns weak when weak links exist', () => {
    expect(deriveEvidenceStatus(1, true)).toBe('weak');
  });
});
