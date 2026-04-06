import { describe, expect, it } from 'vitest';

const { toCsv } = await import('../../src/modules/exports/export.service.js');

describe('export.service', () => {
  it('creates deterministic CSV output with sorted columns', () => {
    const csv = toCsv([
      { b: '2', a: '1' },
      { a: '3', b: '4' }
    ]);

    expect(csv).toBe('a,b\n1,2\n3,4');
  });

  it('escapes commas and quotes', () => {
    const csv = toCsv([{ a: 'plain', b: 'quoted, "value"' }]);
    expect(csv).toBe('a,b\nplain,"quoted, ""value"""');
  });
});
