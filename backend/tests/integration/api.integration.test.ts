import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'phase2-int-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'integration.db');

const { createApp } = await import('../../src/server.js');
const { db } = await import('../../src/db/client.js');
const app = createApp();

let reviewTxId = '';

describe('phase 2 integration', () => {
  it('creates manual transaction with suggestions and review status', async () => {
    const create = await request(app).post('/api/transactions').send({
      date: '2026-04-06',
      vendor: 'GitHub',
      amount: 19,
      description_raw: 'subscription'
    });

    expect(create.status).toBe(201);
    expect(create.body.category_suggested).toBe('software_tools');
    expect(create.body.review_status).toBeDefined();
    reviewTxId = create.body.id;
  });

  it('creates suspected duplicate status on duplicate transaction', async () => {
    const dup = await request(app).post('/api/transactions').send({
      date: '2026-04-06',
      vendor: 'GitHub',
      amount: 19,
      description_raw: 'duplicate test'
    });

    expect(dup.status).toBe(201);
    expect(dup.body.duplicate_status).toBe('suspected_duplicate');
  });

  it('csv import creates suggested fields and raw archive', async () => {
    const csvPath = path.join(dbDir, 'input.csv');
    writeFileSync(csvPath, 'Date,Vendor,Amount,Description\n2026-04-07,eBay Fee,12.50,marketplace fee\n');

    const res = await request(app).post('/api/imports/csv').attach('file', csvPath);
    expect(res.status).toBe(201);

    const tx = db.prepare("SELECT * FROM transactions WHERE source_file_id = ?").get(res.body.sourceFileId) as { category_suggested: string };
    expect(tx.category_suggested).toBe('fees');

    const raw = db.prepare('SELECT COUNT(*) as count FROM import_rows_raw WHERE source_file_id = ?').get(res.body.sourceFileId) as { count: number };
    expect(raw.count).toBe(1);
  });

  it('review queue returns review-needed items and action persists decision', async () => {
    const queue = await request(app).get('/api/review/queue');
    expect(queue.status).toBe(200);
    expect(queue.body.length).toBeGreaterThan(0);

    const action = await request(app).post(`/api/review/actions/${reviewTxId}`).send({
      actionType: 'reclassify',
      categoryFinal: 'office_equipment',
      note: 'operator override'
    });
    expect(action.status).toBe(201);
    expect(action.body.category_final).toBe('office_equipment');

    const decision = db.prepare('SELECT * FROM review_decisions WHERE transaction_id = ? ORDER BY created_at DESC LIMIT 1').get(reviewTxId) as { action_type: string };
    expect(decision.action_type).toBe('reclassify');
  });
});
