import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'phase0-report-unit-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'test.db');

const { bootstrapDb, clearAllData, db } = await import('../../src/db/client.js');
const { getReportSummary } = await import('../../src/modules/reports/reportService.js');

beforeAll(() => {
  bootstrapDb();
});

beforeEach(() => {
  clearAllData();
  db.prepare(`INSERT INTO transactions (id, date, vendor, amount, direction, source_type, category, activity_or_business, tax_treatment_suggestion, confidence_score, review_status)
    VALUES ('a', '2026-01-01', 'V1', 100, 'expense', 'manual', 'software_subscriptions', 'software_startup', 'likely_current_year_business_expense', 0.9, 'approved')`).run();
  db.prepare(`INSERT INTO transactions (id, date, vendor, amount, direction, source_type, category, activity_or_business, tax_treatment_suggestion, confidence_score, review_status)
    VALUES ('b', '2026-01-02', 'V2', 50, 'expense', 'manual', 'meals', 'unclear_mixed', 'needs_review', 0.5, 'pending')`).run();
  db.prepare("INSERT INTO uploaded_documents (id, original_filename, storage_path, mime_type, source_type) VALUES ('d1', 'r.pdf', '/tmp/r.pdf', 'application/pdf', 'manual_upload')").run();
  db.prepare("INSERT INTO evidence_links (id, transaction_id, document_id, link_type, confidence) VALUES ('e1', 'a', 'd1', 'manual', 1)").run();
});

describe('report service aggregation', () => {
  it('aggregates key summary counts and totals', () => {
    const summary = getReportSummary();
    expect(summary.totalsByCategory.length).toBeGreaterThan(0);
    expect((summary.unresolvedCount as { count: number }).count).toBe(1);
    expect((summary.evidenceLinkedCount as { count: number }).count).toBe(1);
    expect((summary.reviewNeededCount as { count: number }).count).toBe(1);
  });
});
