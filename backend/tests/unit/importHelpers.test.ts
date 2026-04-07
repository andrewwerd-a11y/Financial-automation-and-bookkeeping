import { describe, expect, it } from 'vitest';
import { normalizeCsvRow, normalizeCsvRowWithMapping } from '../../src/modules/imports/importHelpers.js';

describe('normalizeCsvRow', () => {
  it('normalizes date/vendor/amount/description from common headers', () => {
    const row = {
      Date: '2026-04-01',
      Vendor: 'Coffee Shop',
      Amount: '$12.50',
      Description: 'Team meetup'
    };

    const normalized = normalizeCsvRow(row);
    expect(normalized).toEqual({
      date: '2026-04-01',
      vendor: 'Coffee Shop',
      amount: 12.5,
      descriptionRaw: 'Team meetup'
    });
  });

  it('returns null when required fields are missing', () => {
    expect(normalizeCsvRow({ Amount: '10.00' })).toBeNull();
    expect(normalizeCsvRow({ Date: '2026-04-01', Vendor: 'No amount', Amount: '0' })).toBeNull();
  });

  it('supports explicit mapping templates', () => {
    const row = {
      txn_date: '2026-04-02',
      merchant_name: 'Warehouse Club',
      debit_value: '42.10',
      memo_text: 'supplies'
    };

    const normalized = normalizeCsvRowWithMapping(row, {
      dateColumn: 'txn_date',
      vendorColumn: 'merchant_name',
      amountColumn: 'debit_value',
      descriptionColumn: 'memo_text'
    });

    expect(normalized).toEqual({
      date: '2026-04-02',
      vendor: 'Warehouse Club',
      amount: 42.1,
      descriptionRaw: 'supplies'
    });
  });
});
