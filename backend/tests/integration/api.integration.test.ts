import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'phase3-int-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'integration.db');

const { createApp } = await import('../../src/server.js');
const app = createApp();

let transactionId = '';
let documentId = '';
let evidenceLinkId = '';

describe('phase 3 integration', () => {
  it('creates transaction and document records', async () => {
    const tx = await request(app).post('/api/transactions').send({
      date: '2026-04-10',
      vendor: 'Office Depot',
      amount: 55,
      description_raw: 'supplies'
    });
    expect(tx.status).toBe(201);
    transactionId = tx.body.id;

    const docPath = path.join(dbDir, 'receipt.pdf');
    writeFileSync(docPath, 'fake');
    const doc = await request(app).post('/api/documents/upload').attach('file', docPath);
    expect(doc.status).toBe(201);
    documentId = doc.body.documentId;
  });

  it('links and unlinks evidence between transaction and document', async () => {
    const link = await request(app).post('/api/evidence/links').send({
      transactionId,
      documentId,
      strengthStatus: 'linked',
      businessPurposeNote: 'office supplies proof'
    });
    expect(link.status).toBe(201);
    evidenceLinkId = link.body.id;

    const txDetail = await request(app).get(`/api/transactions/${transactionId}`);
    expect(txDetail.status).toBe(200);
    expect(txDetail.body.evidence_status).toBe('linked');
    expect(txDetail.body.linked_evidence.length).toBe(1);

    const docDetail = await request(app).get(`/api/documents/${documentId}`);
    expect(docDetail.status).toBe(200);
    expect(docDetail.body.matched_status).toBe('matched');
    expect(docDetail.body.linked_transactions.length).toBe(1);

    const del = await request(app).delete(`/api/evidence/links/${evidenceLinkId}`);
    expect(del.status).toBe(200);

    const txAfter = await request(app).get(`/api/transactions/${transactionId}`);
    expect(txAfter.body.evidence_status).toBe('missing');
  });

  it('supports missing evidence and unmatched documents queues', async () => {
    const missing = await request(app).get('/api/evidence/queues/missing-transactions');
    expect(missing.status).toBe(200);
    expect(missing.body.some((tx: { id: string }) => tx.id === transactionId)).toBe(true);

    const unmatched = await request(app).get('/api/evidence/queues/unmatched-documents');
    expect(unmatched.status).toBe(200);
    expect(unmatched.body.some((doc: { id: string }) => doc.id === documentId)).toBe(true);
  });

  it('supports business purpose note updates on transaction', async () => {
    const patch = await request(app).patch(`/api/transactions/${transactionId}/business-purpose-note`).send({
      businessPurposeNote: 'Used for business procurement'
    });
    expect(patch.status).toBe(200);
    expect(patch.body.business_purpose_note).toBe('Used for business procurement');
  });


  it('provides report summaries and supports export creation/list/download', async () => {
    const summary = await request(app).get('/api/reports/summary');
    expect(summary.status).toBe(200);
    expect(summary.body.overall).toBeTruthy();
    expect(Array.isArray(summary.body.byCategory)).toBe(true);

    const createExport = await request(app).post('/api/exports').send({ exportType: 'transactions' });
    expect(createExport.status).toBe(201);
    expect(createExport.body.status).toBe('completed');

    const listExports = await request(app).get('/api/exports');
    expect(listExports.status).toBe(200);
    expect(listExports.body.length).toBeGreaterThan(0);

    const download = await request(app).get(`/api/exports/${createExport.body.id}/download`);
    expect(download.status).toBe(200);
  });

});
