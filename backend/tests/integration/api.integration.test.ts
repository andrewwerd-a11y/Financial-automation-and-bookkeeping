import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'phase1-int-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'integration.db');

const { createApp } = await import('../../src/server.js');
const { db } = await import('../../src/db/client.js');
const app = createApp();

let txId = '';
let csvSourceFileId = '';
let docId = '';

beforeAll(() => {
  // app initialization handled by createApp
});

describe('phase 1 api integration', () => {
  it('creates and lists manual transactions', async () => {
    const create = await request(app).post('/api/transactions').send({
      date: '2026-04-01',
      vendor: 'Manual Vendor',
      amount: 100.25,
      description_raw: 'Manual test row'
    });

    expect(create.status).toBe(201);
    txId = create.body.id;

    const list = await request(app).get('/api/transactions');
    expect(list.status).toBe(200);
    expect(list.body.some((row: { id: string }) => row.id === txId)).toBe(true);
  });

  it('uploads csv and stores source file + raw rows + normalized transactions', async () => {
    const csvPath = path.join(dbDir, 'input.csv');
    writeFileSync(csvPath, 'Date,Vendor,Amount,Description\n2026-04-02,Bookstore,18.75,Books\ninvalid,No Amount,,skip\n');

    const res = await request(app).post('/api/imports/csv').attach('file', csvPath);
    expect(res.status).toBe(201);
    expect(res.body.importedCount).toBe(1);
    expect(res.body.skippedCount).toBe(1);
    csvSourceFileId = res.body.sourceFileId;

    const source = db.prepare('SELECT * FROM source_files WHERE id = ?').get(csvSourceFileId);
    expect(source).toBeTruthy();

    const rawCount = db.prepare('SELECT COUNT(*) as count FROM import_rows_raw WHERE source_file_id = ?').get(csvSourceFileId) as { count: number };
    expect(rawCount.count).toBe(2);

    const txCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE source_type = 'csv_import' AND source_file_id = ?").get(csvSourceFileId) as { count: number };
    expect(txCount.count).toBe(1);
  });

  it('uploads and lists documents', async () => {
    const filePath = path.join(dbDir, 'receipt.pdf');
    writeFileSync(filePath, 'fake receipt');

    const upload = await request(app).post('/api/documents/upload').field('notes', 'phase1').attach('file', filePath);
    expect(upload.status).toBe(201);
    docId = upload.body.documentId;

    const docs = await request(app).get('/api/documents');
    expect(docs.status).toBe(200);
    expect(docs.body.some((doc: { id: string }) => doc.id === docId)).toBe(true);
  });

  it('lists csv imports and dashboard counts', async () => {
    const imports = await request(app).get('/api/imports');
    expect(imports.status).toBe(200);
    expect(imports.body.length).toBeGreaterThan(0);

    const dashboard = await request(app).get('/api/dashboard');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.totalTransactions).toBeTruthy();
    expect(dashboard.body.totalDocuments).toBeTruthy();
    expect(dashboard.body.totalSourceFiles).toBeTruthy();
  });
});
