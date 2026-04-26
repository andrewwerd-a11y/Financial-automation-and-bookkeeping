import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'treatment-int-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'treatment.db');

const { createApp } = await import('../../src/server.js');
const app = createApp();

describe('treatment routes', () => {
  it('GET /api/treatment/summary returns array with key/count/total_amount shape', async () => {
    const create = await request(app).post('/api/transactions').send({
      date: '2026-05-01',
      vendor: 'Mystery Vendor',
      amount: 40
    });
    expect(create.status).toBe(201);

    const res = await request(app).get('/api/treatment/summary');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        key: expect.any(String),
        count: expect.any(Number),
        total_amount: expect.any(Number)
      })
    );
  });

  it('GET /api/treatment/transactions returns all transactions when no bucket param', async () => {
    const first = await request(app).post('/api/transactions').send({
      date: '2026-05-02',
      vendor: 'OpenAI',
      amount: 20
    });
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/transactions').send({
      date: '2026-05-03',
      vendor: 'Best Buy',
      amount: 300
    });
    expect(second.status).toBe(201);

    const res = await request(app).get('/api/treatment/transactions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body.some((row: { id: string }) => row.id === first.body.id)).toBe(true);
    expect(res.body.some((row: { id: string }) => row.id === second.body.id)).toBe(true);
  });

  it('GET /api/treatment/transactions?bucket=unknown returns only unknown-bucket transactions', async () => {
    const create = await request(app).post('/api/transactions').send({
      date: '2026-05-04',
      vendor: 'Unknown Bucket Vendor',
      amount: 61
    });
    expect(create.status).toBe(201);

    const patch = await request(app)
      .patch(`/api/treatment/transactions/${create.body.id}/final`)
      .send({ treatmentFinal: 'unknown' });
    expect(patch.status).toBe(200);

    const res = await request(app).get('/api/treatment/transactions?bucket=unknown');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((row: { treatment_final?: string | null; treatment_suggested?: string | null }) =>
      (row.treatment_final ?? row.treatment_suggested ?? 'unknown') === 'unknown')).toBe(true);
    expect(res.body.some((row: { id: string }) => row.id === create.body.id)).toBe(true);
  });

  it('GET /api/treatment/accountant-queue returns only flagged transactions', async () => {
    const flagged = await request(app).post('/api/transactions').send({
      date: '2026-05-05',
      vendor: 'Coffee Shop',
      amount: 18,
      description_raw: 'meal with client'
    });
    expect(flagged.status).toBe(201);

    const okTx = await request(app).post('/api/transactions').send({
      date: '2026-05-06',
      vendor: 'OpenAI',
      amount: 29
    });
    expect(okTx.status).toBe(201);

    const docPath = path.join(dbDir, 'treatment-proof.pdf');
    writeFileSync(docPath, 'fake');
    const document = await request(app).post('/api/documents/upload').attach('file', docPath);
    expect(document.status).toBe(201);

    const link = await request(app).post('/api/evidence/links').send({
      transactionId: okTx.body.id,
      documentId: document.body.documentId,
      strengthStatus: 'linked'
    });
    expect(link.status).toBe(201);

    const res = await request(app).get('/api/treatment/accountant-queue');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((row: { id: string }) => row.id === flagged.body.id)).toBe(true);
    expect(res.body.every((row: { accountant_review_flag?: number; mixed_use_flag?: number; excluded_flag?: number; treatment_suggested?: string | null }) =>
      row.accountant_review_flag === 1
      || row.mixed_use_flag === 1
      || row.excluded_flag === 1
      || row.treatment_suggested === 'needs_accountant_review')).toBe(true);
    expect(res.body.some((row: { id: string }) => row.id === okTx.body.id)).toBe(false);
  });

  it('PATCH /api/treatment/transactions/:id/final sets treatment_final and note', async () => {
    const create = await request(app).post('/api/transactions').send({
      date: '2026-05-07',
      vendor: 'Best Buy',
      amount: 250
    });
    expect(create.status).toBe(201);

    const res = await request(app)
      .patch(`/api/treatment/transactions/${create.body.id}/final`)
      .send({ treatmentFinal: 'asset_candidate', note: 'manual accountant override' });

    expect(res.status).toBe(200);
    expect(res.body.treatment_final).toBe('asset_candidate');
    expect(res.body.notes_internal).toBe('manual accountant override');
  });

  it('PATCH /api/treatment/transactions/:id/final returns 404 for missing transaction', async () => {
    const res = await request(app)
      .patch('/api/treatment/transactions/missing-id/final')
      .send({ treatmentFinal: 'current_expense' });

    expect(res.status).toBe(404);
  });

  it('PATCH /api/treatment/transactions/:id/final returns 400 for missing treatmentFinal field', async () => {
    const create = await request(app).post('/api/transactions').send({
      date: '2026-05-08',
      vendor: 'OpenAI',
      amount: 35
    });
    expect(create.status).toBe(201);

    const res = await request(app)
      .patch(`/api/treatment/transactions/${create.body.id}/final`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('after setTreatmentFinal, GET /api/treatment/summary reflects updated bucket assignment', async () => {
    const create = await request(app).post('/api/transactions').send({
      date: '2026-05-09',
      vendor: 'Mystery Summary Vendor',
      amount: 92
    });
    expect(create.status).toBe(201);

    const before = await request(app).get('/api/treatment/summary');
    expect(before.status).toBe(200);
    const beforeAsset = before.body.find((row: { key: string }) => row.key === 'asset_candidate');
    const beforeUnknown = before.body.find((row: { key: string }) => row.key === 'needs_accountant_review');

    const patch = await request(app)
      .patch(`/api/treatment/transactions/${create.body.id}/final`)
      .send({ treatmentFinal: 'asset_candidate' });
    expect(patch.status).toBe(200);

    const after = await request(app).get('/api/treatment/summary');
    expect(after.status).toBe(200);
    const afterAsset = after.body.find((row: { key: string }) => row.key === 'asset_candidate');
    const afterUnknown = after.body.find((row: { key: string }) => row.key === 'needs_accountant_review');

    expect((afterAsset?.count ?? 0) - (beforeAsset?.count ?? 0)).toBe(1);
    expect((beforeUnknown?.count ?? 0) - (afterUnknown?.count ?? 0)).toBe(1);
  });
});
