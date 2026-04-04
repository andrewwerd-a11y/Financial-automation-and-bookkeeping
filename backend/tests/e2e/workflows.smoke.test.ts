import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'phase0-e2e-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'e2e.db');

const { createApp } = await import('../../src/server.js');
const app = createApp();

describe('critical Phase 0 smoke flows', () => {
  it('CSV upload -> map columns -> import rows', async () => {
    const csvPath = path.join(dbDir, 'flow.csv');
    writeFileSync(csvPath, 'Date,Amount,Vendor,Description,Account\n2026-03-01,33.10,eBay Fees,Marketplace fee,eBay\n');

    const preview = await request(app).post('/api/imports/csv/preview').attach('file', csvPath);
    expect(preview.status).toBe(200);
    expect(preview.body.columns).toContain('Date');

    const process = await request(app)
      .post('/api/imports/csv/process')
      .field('mapping', JSON.stringify({ date: 'Date', amount: 'Amount', vendor: 'Vendor', description: 'Description', sourceAccount: 'Account' }))
      .attach('file', csvPath);

    expect(process.status).toBe(200);
    expect(process.body.imported).toBe(1);
  });

  it('document upload -> evidence link creation', async () => {
    const transaction = await request(app).post('/api/transactions').send({
      date: '2026-03-02',
      vendor: 'Workflow Vendor',
      amount: 12,
      direction: 'expense',
      sourceType: 'manual'
    });

    const docPath = path.join(dbDir, 'doc.pdf');
    writeFileSync(docPath, 'fake-pdf');
    const document = await request(app).post('/api/documents/upload').attach('file', docPath);

    const link = await request(app).post('/api/documents/link').send({
      transactionId: transaction.body.id,
      documentId: document.body.id
    });

    expect(document.status).toBe(201);
    expect(link.status).toBe(201);
  });

  it('review queue action updates transaction', async () => {
    const queue = await request(app).get('/api/review/queue');
    const target = queue.body[0];
    expect(target).toBeTruthy();

    const decision = await request(app).post('/api/review/decision').send({
      transactionId: target.id,
      newCategory: target.category ?? 'unclear',
      newTreatment: target.tax_treatment_suggestion ?? 'needs_review',
      decisionType: 'approve'
    });

    expect(decision.status).toBe(201);
  });

  it('export summary generation works', async () => {
    const response = await request(app).post('/api/exports/unresolved');
    expect(response.status).toBe(200);
    expect(response.body.filePath).toContain('unresolved');
  });
});
