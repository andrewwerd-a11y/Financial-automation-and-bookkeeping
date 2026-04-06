import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'phase2-e2e-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'e2e.db');

const { createApp } = await import('../../src/server.js');
const app = createApp();

describe('phase 2 smoke workflow', () => {
  it('manual -> review queue -> approve action updates status', async () => {
    const tx = await request(app).post('/api/transactions').send({
      date: '2026-04-08',
      vendor: 'Unknown Merchant',
      amount: 11,
      description_raw: 'unknown'
    });
    expect(tx.status).toBe(201);

    const queue = await request(app).get('/api/review/queue');
    expect(queue.status).toBe(200);

    const action = await request(app).post(`/api/review/actions/${tx.body.id}`).send({ actionType: 'approve_suggestion' });
    expect(action.status).toBe(201);
    expect(action.body.review_status).toBe('approved');
  });

  it('csv upload still works and transactions are listed with suggestion fields', async () => {
    const csvPath = path.join(dbDir, 'smoke.csv');
    writeFileSync(csvPath, 'Date,Vendor,Amount\n2026-04-08,USPS,20.00\n');
    const upload = await request(app).post('/api/imports/csv').attach('file', csvPath);
    expect(upload.status).toBe(201);

    const list = await request(app).get('/api/transactions');
    expect(list.status).toBe(200);
    expect(list.body[0]).toHaveProperty('category_suggested');
  });
});
