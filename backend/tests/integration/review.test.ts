import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'review-int-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'review.db');

const { createApp } = await import('../../src/server.js');
const app = createApp();

describe('review history routes', () => {
  it('GET /api/review/history/:transactionId returns empty array for new transaction', async () => {
    const transaction = await request(app).post('/api/transactions').send({
      date: '2026-05-25',
      vendor: 'Review History Empty',
      amount: 33
    });
    expect(transaction.status).toBe(201);

    const res = await request(app).get(`/api/review/history/${transaction.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('GET /api/review/history/:transactionId returns decisions after review actions', async () => {
    const transaction = await request(app).post('/api/transactions').send({
      date: '2026-05-26',
      vendor: 'Review History Filled',
      amount: 90
    });
    expect(transaction.status).toBe(201);

    const firstAction = await request(app).post(`/api/review/actions/${transaction.body.id}`).send({
      actionType: 'hold',
      note: 'needs documentation'
    });
    expect(firstAction.status).toBe(201);

    const secondAction = await request(app).post(`/api/review/actions/${transaction.body.id}`).send({
      actionType: 'approve_suggestion',
      note: 'approved after follow-up'
    });
    expect(secondAction.status).toBe(201);

    const res = await request(app).get(`/api/review/history/${transaction.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].action_type).toBe('approve_suggestion');
    expect(res.body[1].action_type).toBe('hold');
  });

  it('GET /api/review/history/:transactionId returns 404 for missing transaction', async () => {
    const res = await request(app).get('/api/review/history/missing-transaction');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TRANSACTION_NOT_FOUND');
  });
});
