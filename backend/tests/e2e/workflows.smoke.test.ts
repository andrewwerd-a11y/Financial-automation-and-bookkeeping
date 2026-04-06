import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'phase3-e2e-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'e2e.db');

const { createApp } = await import('../../src/server.js');
const app = createApp();

describe('phase 3 evidence smoke workflow', () => {
  it('manual link/unlink workflow persists and queue endpoints respond', async () => {
    const tx = await request(app).post('/api/transactions').send({ date: '2026-04-11', vendor: 'Staples', amount: 40 });
    expect(tx.status).toBe(201);

    const docPath = path.join(dbDir, 'receipt.png');
    writeFileSync(docPath, 'fake');
    const doc = await request(app).post('/api/documents/upload').attach('file', docPath);
    expect(doc.status).toBe(201);

    const link = await request(app).post('/api/evidence/links').send({ transactionId: tx.body.id, documentId: doc.body.documentId, strengthStatus: 'weak' });
    expect(link.status).toBe(201);

    const txDetail = await request(app).get(`/api/transactions/${tx.body.id}`);
    expect(txDetail.body.evidence_status).toBe('weak');

    const missingQueue = await request(app).get('/api/evidence/queues/missing-transactions');
    expect(missingQueue.status).toBe(200);

    const unmatchedQueue = await request(app).get('/api/evidence/queues/unmatched-documents');
    expect(unmatchedQueue.status).toBe(200);

    const unlink = await request(app).delete(`/api/evidence/links/${link.body.id}`);
    expect(unlink.status).toBe(200);
  });
});
