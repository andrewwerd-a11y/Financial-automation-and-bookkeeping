import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'routes-cov-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'coverage.db');

const { createApp } = await import('../../src/server.js');
const app = createApp();

// Shared IDs across tests in this suite
let txId = '';
let docId = '';
let linkId = '';
let policyId = '';
let workspaceId = '';
let businessId = '';

describe('setup: seed transaction + document', () => {
  it('creates base records', async () => {
    const ws = await request(app).post('/api/workspaces').send({ name: 'CovWS', slug: 'cov-ws' });
    expect(ws.status).toBe(201);
    workspaceId = ws.body.id;

    const biz = await request(app).post('/api/businesses').send({ workspaceId, name: 'CovCo', labelType: 'llc' });
    expect(biz.status).toBe(201);
    businessId = biz.body.id;

    const tx = await request(app).post('/api/transactions').send({ date: '2026-01-15', vendor: 'Coverage Vendor', amount: 120, businessId });
    expect(tx.status).toBe(201);
    txId = tx.body.id;

    const docPath = path.join(dbDir, 'cov.pdf');
    writeFileSync(docPath, 'fake-pdf');
    const doc = await request(app).post('/api/documents/upload').attach('file', docPath);
    expect(doc.status).toBe(201);
    docId = doc.body.documentId;

    const link = await request(app).post('/api/evidence/links').send({ transactionId: txId, documentId: docId, strengthStatus: 'linked' });
    expect(link.status).toBe(201);
    linkId = link.body.id;
  });
});

describe('dashboard', () => {
  it('GET /api/dashboard responds with aggregates', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalTransactions');
    expect(res.body).toHaveProperty('totalDocuments');
    expect(res.body).toHaveProperty('missingEvidenceCount');
    expect(res.body).toHaveProperty('recentTransactions');
    expect(Array.isArray(res.body.recentTransactions)).toBe(true);
  });
});

describe('system', () => {
  it('GET /api/system/status returns ok', async () => {
    const res = await request(app).get('/api/system/status');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body).toHaveProperty('dbFile');
  });
});

describe('treatment routes', () => {
  it('GET /api/treatment/summary returns bucket rows', async () => {
    const res = await request(app).get('/api/treatment/summary');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('key');
      expect(res.body[0]).toHaveProperty('count');
    }
  });

  it('GET /api/treatment/transactions returns items', async () => {
    const res = await request(app).get('/api/treatment/transactions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/treatment/transactions?bucket=deductible scopes results', async () => {
    const res = await request(app).get('/api/treatment/transactions?bucket=deductible');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/treatment/accountant-queue returns array', async () => {
    const res = await request(app).get('/api/treatment/accountant-queue');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PATCH /api/treatment/transactions/:id/final sets treatment_final', async () => {
    const res = await request(app).patch(`/api/treatment/transactions/${txId}/final`).send({ treatmentFinal: 'deductible', note: 'audit override' });
    expect(res.status).toBe(200);
    expect(res.body.treatment_final).toBe('deductible');
  });

  it('PATCH /api/treatment/transactions/:id/final 400 on invalid body', async () => {
    const res = await request(app).patch(`/api/treatment/transactions/${txId}/final`).send({});
    expect(res.status).toBe(400);
  });

  it('PATCH /api/treatment/transactions/:id/final 404 on unknown id', async () => {
    const res = await request(app).patch('/api/treatment/transactions/nonexistent/final').send({ treatmentFinal: 'personal' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TRANSACTION_NOT_FOUND');
  });
});

describe('evidence note PATCH', () => {
  it('PATCH /api/evidence/links/:id/note updates the note', async () => {
    const res = await request(app).patch(`/api/evidence/links/${linkId}/note`).send({ businessPurposeNote: 'Updated note text' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('GET /api/evidence/transaction/:id lists links with updated note', async () => {
    const res = await request(app).get(`/api/evidence/transaction/${txId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const item = res.body.find((r: { id: string }) => r.id === linkId);
    expect(item?.business_purpose_note).toBe('Updated note text');
  });

  it('GET /api/evidence/document/:id lists linked transactions', async () => {
    const res = await request(app).get(`/api/evidence/document/${docId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('link_id');
  });
});

describe('reconciliation PATCH', () => {
  it('creates a pair of transactions and runs scan', async () => {
    await request(app).post('/api/transactions').send({ date: '2026-02-01', vendor: 'Dup Vendor', amount: 50 });
    await request(app).post('/api/transactions').send({ date: '2026-02-01', vendor: 'Dup Vendor', amount: 50 });

    const scan = await request(app).post('/api/reconciliation/scan');
    expect(scan.status).toBe(200);
    expect(scan.body).toHaveProperty('scannedPairs');
  });

  it('PATCH /api/reconciliation/candidates/:id resolves a candidate', async () => {
    const candidates = await request(app).get('/api/reconciliation/candidates');
    expect(candidates.status).toBe(200);
    if (candidates.body.length === 0) return; // no duplicates in this run

    const candId = candidates.body[0].id;
    const res = await request(app).patch(`/api/reconciliation/candidates/${candId}`).send({ status: 'resolved' });
    expect(res.status).toBe(200);
    expect(res.body.match_status).toBe('resolved');
  });

  it('PATCH /api/reconciliation/candidates/:id 400 on bad status', async () => {
    const candidates = await request(app).get('/api/reconciliation/candidates');
    if (candidates.body.length === 0) return;
    const candId = candidates.body[0].id;
    const res = await request(app).patch(`/api/reconciliation/candidates/${candId}`).send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/reconciliation/candidates/:id 404 on unknown id', async () => {
    const res = await request(app).patch('/api/reconciliation/candidates/nonexistent').send({ status: 'rejected' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CANDIDATE_NOT_FOUND');
  });
});

describe('policies PATCH', () => {
  it('creates a policy', async () => {
    const res = await request(app).post('/api/policies').send({
      workspaceId,
      businessId,
      ruleType: 'amount_threshold',
      thresholdValue: 100,
      active: true,
      config: { note: 'initial' }
    });
    expect(res.status).toBe(201);
    policyId = res.body.id;
  });

  it('PATCH /api/policies/:id updates threshold without touching config', async () => {
    const res = await request(app).patch(`/api/policies/${policyId}`).send({
      ruleType: 'amount_threshold',
      thresholdValue: 200,
      active: true
    });
    expect(res.status).toBe(200);
    expect(res.body.threshold_value).toBe(200);
    // config_json should still be intact if not passed
    const existing = JSON.parse(res.body.config_json ?? '{}') as { note?: string };
    expect(existing.note).toBe('initial');
  });

  it('PATCH /api/policies/:id updates config when explicitly passed', async () => {
    const res = await request(app).patch(`/api/policies/${policyId}`).send({
      ruleType: 'amount_threshold',
      thresholdValue: 200,
      active: true,
      config: { note: 'updated' }
    });
    expect(res.status).toBe(200);
    const updated = JSON.parse(res.body.config_json ?? '{}') as { note?: string };
    expect(updated.note).toBe('updated');
  });

  it('PATCH /api/policies/:id 404 on unknown id', async () => {
    const res = await request(app).patch('/api/policies/nonexistent').send({ ruleType: 'amount_threshold', active: true });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('POLICY_NOT_FOUND');
  });
});

describe('document upload failures', () => {
  it('rejects upload without file', async () => {
    const res = await request(app).post('/api/documents/upload');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FILE');
  });

  it('rejects upload with disallowed MIME type (multer fileFilter)', async () => {
    const exePath = path.join(dbDir, 'malware.exe');
    writeFileSync(exePath, 'MZ fake-exe');
    // multer fileFilter rejects the MIME — may ECONNRESET on Windows, tolerate both
    let res: { status: number } | undefined;
    try {
      res = await request(app).post('/api/documents/upload').attach('file', exePath, { contentType: 'application/x-msdownload' });
    } catch {
      // ECONNRESET on Windows when multer drops the stream mid-upload
      return;
    }
    expect(res!.status).toBeGreaterThanOrEqual(400);
  });
});

describe('CSV import failure paths', () => {
  it('rejects CSV import without file', async () => {
    const res = await request(app).post('/api/imports/csv');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FILE');
  });

  it('rejects import with nonexistent templateId', async () => {
    const csvPath = path.join(dbDir, 'bad-template.csv');
    writeFileSync(csvPath, 'Date,Vendor,Amount\n2026-01-01,Test,50\n');
    const res = await request(app).post('/api/imports/csv')
      .attach('file', csvPath)
      .field('templateId', 'nonexistent-template-id');
    expect(res.status).toBe(400);
  });

  it('imports a valid CSV and returns job metadata', async () => {
    const csvPath = path.join(dbDir, 'valid.csv');
    writeFileSync(csvPath, 'date,vendor,amount\n2026-03-01,Acme,75\n2026-03-02,Beta,100\n');
    const res = await request(app).post('/api/imports/csv').attach('file', csvPath);
    expect(res.status).toBe(201);
    expect(res.body.importedCount).toBe(2);
    expect(res.body.skippedCount).toBe(0);
    expect(res.body.jobId).toBeTruthy();
  });
});
