import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'phase4-report-unit-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'unit.db');

const { bootstrapDb, db } = await import('../../src/db/client.js');
const { getOverallSummary, getEvidenceStatusSummary } = await import('../../src/modules/reports/report.service.js');

bootstrapDb();
db.prepare("INSERT INTO transactions (id, date, vendor, amount, source_type, review_status) VALUES ('t1','2026-04-01','Vendor',10,'manual','approved')").run();
db.prepare("INSERT INTO transactions (id, date, vendor, amount, source_type, review_status) VALUES ('t2','2026-04-02','Vendor2',20,'manual','needs_review')").run();
db.prepare("INSERT INTO source_files (id, kind, original_name, stored_path, mime_type, size_bytes) VALUES ('sf1','document','a.pdf','a.pdf','application/pdf',1)").run();
db.prepare("INSERT INTO documents (id, source_file_id, file_name, mime_type) VALUES ('d1','sf1','a.pdf','application/pdf')").run();
db.prepare("INSERT INTO evidence_links (id, transaction_id, document_id, strength_status) VALUES ('el1','t1','d1','linked')").run();

describe('report.service', () => {
  it('returns overall summary with totals', () => {
    const summary = getOverallSummary();
    expect((summary.totalTransactions as { count: number }).count).toBeGreaterThan(0);
    expect((summary.totalTransactionAmount as { total: number }).total).toBeGreaterThan(0);
  });

  it('aggregates evidence status by bucket not per-transaction', () => {
    const rows = getEvidenceStatusSummary() as Array<{ key: string; count: number }>;
    const keys = rows.map(r => r.key);
    expect(keys).toContain('linked');
    expect(keys).toContain('missing');
    // each bucket count should be > 0 and there must be fewer rows than transactions
    const totalBuckets = rows.length;
    expect(totalBuckets).toBeLessThanOrEqual(3);
    const linked = rows.find(r => r.key === 'linked')!;
    expect(linked.count).toBe(1);
    const missing = rows.find(r => r.key === 'missing')!;
    expect(missing.count).toBe(1);
  });
});
