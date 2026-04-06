import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'phase1-e2e-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'e2e.db');

const { createApp } = await import('../../src/server.js');
const app = createApp();

describe('phase 1 smoke flows', () => {
  it('manual transaction flow works', async () => {
    const create = await request(app).post('/api/transactions').send({
      date: '2026-04-03', vendor: 'Smoke Vendor', amount: 22.45, description_raw: 'smoke'
    });
    expect(create.status).toBe(201);

    const list = await request(app).get('/api/transactions');
    expect(list.status).toBe(200);
  });

  it('csv import flow works', async () => {
    const csvPath = path.join(dbDir, 'smoke.csv');
    writeFileSync(csvPath, 'Date,Vendor,Amount\n2026-04-03,Hardware,44.10\n');
    const upload = await request(app).post('/api/imports/csv').attach('file', csvPath);
    expect(upload.status).toBe(201);
    expect(upload.body.importedCount).toBe(1);
  });

  it('document upload flow works', async () => {
    const docPath = path.join(dbDir, 'smoke.png');
    writeFileSync(docPath, 'fake');
    const upload = await request(app).post('/api/documents/upload').attach('file', docPath);
    expect(upload.status).toBe(201);

    const list = await request(app).get('/api/documents');
    expect(list.status).toBe(200);
  });

  it('system status endpoint works', async () => {
    const status = await request(app).get('/api/system/status');
    expect(status.status).toBe(200);
    expect(status.body.phase).toBe('phase_1_core_intake_backbone');
  });
});
