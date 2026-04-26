import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'system-int-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'system.db');

const { createApp } = await import('../../src/server.js');
const app = createApp();

describe('system status', () => {
  it('GET /api/system/status includes dbOk and transactionCount', async () => {
    const create = await request(app).post('/api/transactions').send({
      date: '2026-05-27',
      vendor: 'System Status',
      amount: 51
    });
    expect(create.status).toBe(201);

    const res = await request(app).get('/api/system/status');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.dbOk).toBe(true);
    expect(res.body.transactionCount).toBe(1);
  });
});
