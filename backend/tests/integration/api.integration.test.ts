import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'phase0-int-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'integration.db');

const { createApp } = await import('../../src/server.js');
const { db } = await import('../../src/db/client.js');

const app = createApp();

let createdTransactionId = '';
let uploadedDocumentId = '';

beforeAll(() => {
  // app creation initializes db and seed.
});

describe('Phase 0 integration APIs', () => {
  it('creates manual transaction', async () => {
    const res = await request(app).post('/api/transactions').send({
      date: '2026-02-01',
      vendor: 'Manual Entry Vendor',
      amount: 88,
      direction: 'expense',
      sourceAccount: 'Manual Account',
      sourceType: 'manual',
      category: 'office_supplies'
    });

    expect(res.status).toBe(201);
    createdTransactionId = res.body.id;
    expect(createdTransactionId).toBeTruthy();
  });

  it('processes CSV import and preserves raw rows', async () => {
    const csvPath = path.join(dbDir, 'sample.csv');
    writeFileSync(csvPath, 'Date,Amount,Vendor,Description,Account\n2026-02-10,45.50,USPS,Shipping label,Card\n');

    const res = await request(app)
      .post('/api/imports/csv/process')
      .field('mapping', JSON.stringify({ date: 'Date', amount: 'Amount', vendor: 'Vendor', description: 'Description', sourceAccount: 'Account' }))
      .field('mapperPresetName', 'test-mapper')
      .attach('file', csvPath);

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);

    const rawRows = db.prepare('SELECT COUNT(*) as count FROM import_job_raw_rows WHERE import_job_id = ?').get(res.body.importId) as { count: number };
    expect(rawRows.count).toBe(1);
  });

  it('persists document metadata and links evidence', async () => {
    const docPath = path.join(dbDir, 'receipt.png');
    writeFileSync(docPath, 'fake-image-data');

    const upload = await request(app).post('/api/documents/upload').attach('file', docPath);
    expect(upload.status).toBe(201);
    uploadedDocumentId = upload.body.id;

    const link = await request(app).post('/api/documents/link').send({
      transactionId: createdTransactionId,
      documentId: uploadedDocumentId,
      notes: 'receipt link'
    });
    expect(link.status).toBe(201);

    const linked = db.prepare('SELECT * FROM evidence_links WHERE transaction_id = ? AND document_id = ?').get(createdTransactionId, uploadedDocumentId);
    expect(linked).toBeTruthy();
  });

  it('persists review decision and updates transaction', async () => {
    const res = await request(app).post('/api/review/decision').send({
      transactionId: createdTransactionId,
      newCategory: 'office_supplies',
      newTreatment: 'likely_current_year_business_expense',
      reviewerNote: 'looks good',
      decisionType: 'approve'
    });

    expect(res.status).toBe(201);

    const decision = db.prepare('SELECT * FROM review_decisions WHERE transaction_id = ? ORDER BY created_at DESC LIMIT 1').get(createdTransactionId) as { decision_type: string };
    expect(decision.decision_type).toBe('approve');
  });

  it('generates report summary and export job', async () => {
    const summary = await request(app).get('/api/reports/summary');
    expect(summary.status).toBe(200);
    expect(summary.body.unresolvedCount).toBeTruthy();

    const exp = await request(app).post('/api/exports/summary-category');
    expect(exp.status).toBe(200);

    const job = db.prepare('SELECT * FROM export_jobs WHERE id = ?').get(exp.body.jobId);
    expect(job).toBeTruthy();
  });
});
