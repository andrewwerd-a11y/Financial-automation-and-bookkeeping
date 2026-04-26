import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'reconciliation-int-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'reconciliation.db');

const { createApp } = await import('../../src/server.js');
const { db } = await import('../../src/db/client.js');
const app = createApp();

describe('reconciliation scan', () => {
  it('GET /api/reconciliation/candidates returns empty array initially', async () => {
    const res = await request(app).get('/api/reconciliation/candidates');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/reconciliation/scan returns {scannedPairs, created}', async () => {
    const first = await request(app).post('/api/transactions').send({
      date: '2026-05-19',
      vendor: 'Scan Shape',
      amount: 11
    });
    const second = await request(app).post('/api/transactions').send({
      date: '2026-05-19',
      vendor: 'Scan Shape',
      amount: 11
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const res = await request(app).post('/api/reconciliation/scan');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      scannedPairs: expect.any(Number),
      created: expect.any(Number)
    });
  });

  it('scan creates candidates for external-source duplicate pairs', async () => {
    const first = await request(app).post('/api/transactions').send({
      date: '2026-05-20',
      vendor: 'External Source Pair',
      amount: 45
    });
    const second = await request(app).post('/api/transactions').send({
      date: '2026-05-20',
      vendor: 'External Source Pair',
      amount: 45
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    db.prepare('UPDATE transactions SET external_source_id = ? WHERE id = ?').run('ext-123', first.body.id);

    const scan = await request(app).post('/api/reconciliation/scan');
    expect(scan.status).toBe(200);

    const candidates = await request(app).get('/api/reconciliation/candidates');
    const match = candidates.body.find((row: { left_transaction_id: string; right_transaction_id: string; confidence: number }) =>
      [row.left_transaction_id, row.right_transaction_id].includes(first.body.id)
      && [row.left_transaction_id, row.right_transaction_id].includes(second.body.id));

    expect(match).toBeTruthy();
    expect(match.confidence).toBe(0.82);
  });

  it('scan creates candidates for suspected_duplicate pairs without external_source_id', async () => {
    const first = await request(app).post('/api/transactions').send({
      date: '2026-05-21',
      vendor: 'Manual Duplicate Pair',
      amount: 57
    });
    const second = await request(app).post('/api/transactions').send({
      date: '2026-05-21',
      vendor: 'Manual Duplicate Pair',
      amount: 57
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.duplicate_status).toBe('suspected_duplicate');

    const scan = await request(app).post('/api/reconciliation/scan');
    expect(scan.status).toBe(200);

    const candidates = await request(app).get('/api/reconciliation/candidates');
    const match = candidates.body.find((row: { left_transaction_id: string; right_transaction_id: string; confidence: number; reason: string }) =>
      [row.left_transaction_id, row.right_transaction_id].includes(first.body.id)
      && [row.left_transaction_id, row.right_transaction_id].includes(second.body.id));

    expect(match).toBeTruthy();
    expect(match.confidence).toBe(0.70);
    expect(match.reason).toBe('Same date/amount; at least one flagged as suspected duplicate');
  });

  it('scan does not create duplicate candidates on repeated runs', async () => {
    const first = await request(app).post('/api/transactions').send({
      date: '2026-05-22',
      vendor: 'Repeated Scan Pair',
      amount: 88
    });
    const second = await request(app).post('/api/transactions').send({
      date: '2026-05-22',
      vendor: 'Repeated Scan Pair',
      amount: 88
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    db.prepare('UPDATE transactions SET external_source_id = ? WHERE id = ?').run('ext-repeat', first.body.id);

    const firstScan = await request(app).post('/api/reconciliation/scan');
    const secondScan = await request(app).post('/api/reconciliation/scan');

    expect(firstScan.status).toBe(200);
    expect(secondScan.status).toBe(200);
    expect(secondScan.body.created).toBe(0);
  });

  it('PATCH /api/reconciliation/candidates/:id with status=resolved updates match_status', async () => {
    const first = await request(app).post('/api/transactions').send({
      date: '2026-05-23',
      vendor: 'Resolve Pair',
      amount: 64
    });
    const second = await request(app).post('/api/transactions').send({
      date: '2026-05-23',
      vendor: 'Resolve Pair',
      amount: 64
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    db.prepare('UPDATE transactions SET external_source_id = ? WHERE id = ?').run('ext-resolve', first.body.id);

    await request(app).post('/api/reconciliation/scan');
    const candidates = await request(app).get('/api/reconciliation/candidates');
    const id = candidates.body.find((row: { left_transaction_id: string; right_transaction_id: string }) =>
      [row.left_transaction_id, row.right_transaction_id].includes(first.body.id)
      && [row.left_transaction_id, row.right_transaction_id].includes(second.body.id)).id;

    const res = await request(app).patch(`/api/reconciliation/candidates/${id}`).send({ status: 'resolved' });
    expect(res.status).toBe(200);
    expect(res.body.match_status).toBe('resolved');
  });

  it('PATCH /api/reconciliation/candidates/:id with status=rejected updates match_status', async () => {
    const first = await request(app).post('/api/transactions').send({
      date: '2026-05-24',
      vendor: 'Reject Pair',
      amount: 77
    });
    const second = await request(app).post('/api/transactions').send({
      date: '2026-05-24',
      vendor: 'Reject Pair',
      amount: 77
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    db.prepare('UPDATE transactions SET external_source_id = ? WHERE id = ?').run('ext-reject', first.body.id);

    await request(app).post('/api/reconciliation/scan');
    const candidates = await request(app).get('/api/reconciliation/candidates');
    const id = candidates.body.find((row: { left_transaction_id: string; right_transaction_id: string }) =>
      [row.left_transaction_id, row.right_transaction_id].includes(first.body.id)
      && [row.left_transaction_id, row.right_transaction_id].includes(second.body.id)).id;

    const res = await request(app).patch(`/api/reconciliation/candidates/${id}`).send({ status: 'rejected' });
    expect(res.status).toBe(200);
    expect(res.body.match_status).toBe('rejected');
  });

  it('PATCH /api/reconciliation/candidates/:id returns 404 for unknown id', async () => {
    const res = await request(app).patch('/api/reconciliation/candidates/missing-id').send({ status: 'resolved' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CANDIDATE_NOT_FOUND');
  });

  it('PATCH /api/reconciliation/candidates/:id returns 400 for invalid status value', async () => {
    const res = await request(app).patch('/api/reconciliation/candidates/missing-id').send({ status: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
