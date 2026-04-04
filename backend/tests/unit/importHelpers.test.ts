import { describe, expect, it } from 'vitest';
import { buildDuplicateKey, normalizeCsvRow } from '../../src/modules/imports/importHelpers.js';

describe('CSV normalization and duplicate helpers', () => {
  it('builds deterministic duplicate key', () => {
    expect(buildDuplicateKey('2026-01-01', 'Vendor', 10)).toBe('2026-01-01|Vendor|10');
  });

  it('normalizes mapped CSV rows', () => {
    const row = { Date: '2026-01-01', Amount: '-35.50', Merchant: 'Spark', Memo: 'gig payout', Account: 'Checking', Direction: 'income' };
    const normalized = normalizeCsvRow(row, {
      date: 'Date',
      amount: 'Amount',
      vendor: 'Merchant',
      description: 'Memo',
      sourceAccount: 'Account',
      direction: 'Direction'
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.amount).toBe(35.5);
    expect(normalized?.direction).toBe('income');
    expect(normalized?.duplicateKey).toBe('2026-01-01|Spark|35.5');
  });

  it('returns null for invalid rows', () => {
    const normalized = normalizeCsvRow({ Amount: '0' }, { date: 'Date', amount: 'Amount' });
    expect(normalized).toBeNull();
  });
});
