import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'phase4-report-unit-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'unit.db');

const { bootstrapDb, db } = await import('../../src/db/client.js');
const { getOverallSummary } = await import('../../src/modules/reports/report.service.js');

bootstrapDb();
db.prepare("INSERT INTO transactions (id, date, vendor, amount, source_type, review_status) VALUES ('t1','2026-04-01','Vendor',10,'manual','approved')").run();

describe('report.service', () => {
  it('returns overall summary with totals', () => {
    const summary = getOverallSummary();
    expect((summary.totalTransactions as { count: number }).count).toBeGreaterThan(0);
    expect((summary.totalTransactionAmount as { total: number }).total).toBeGreaterThan(0);
  });
});
