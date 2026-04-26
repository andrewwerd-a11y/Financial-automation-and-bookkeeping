import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'cross-wire-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'cross-wiring.db');

const { createApp } = await import('../../src/server.js');
const { db } = await import('../../src/db/client.js');
const app = createApp();

describe('cross-wiring behavior', () => {
  it('recomputes policy flags after evidence and review changes, and keeps csv/manual behavior aligned', async () => {
    const workspace = await request(app).post('/api/workspaces').send({ name: 'Cross Wiring WS', slug: 'cross-wiring-ws' });
    expect(workspace.status).toBe(201);

    const business = await request(app).post('/api/businesses').send({ workspaceId: workspace.body.id, name: 'Cross Wiring Biz', labelType: 'llc' });
    expect(business.status).toBe(201);

    const missingEvidencePolicy = await request(app).post('/api/policies').send({
      workspaceId: workspace.body.id,
      businessId: business.body.id,
      ruleType: 'missing_evidence',
      active: true
    });
    expect(missingEvidencePolicy.status).toBe(201);

    const restrictedPolicy = await request(app).post('/api/policies').send({
      workspaceId: workspace.body.id,
      businessId: business.body.id,
      ruleType: 'category_restriction',
      categoryValue: 'personal',
      active: true
    });
    expect(restrictedPolicy.status).toBe(201);

    const manualTx = await request(app).post('/api/transactions').send({
      date: '2026-04-21',
      vendor: 'Office Depot',
      amount: 45,
      description_raw: 'printer paper',
      businessId: business.body.id
    });
    expect(manualTx.status).toBe(201);
    expect(manualTx.body.policy_flags_json).toContain('missing_evidence_rule');
    expect(manualTx.body.evidence_status).toBe('missing');
    expect(manualTx.body.treatment_suggested).toBeTruthy();

    const csvPath = path.join(dbDir, 'cross-wiring.csv');
    writeFileSync(csvPath, 'date,vendor,amount,description\n2026-04-22,Slack,25,team chat\n');
    const csvImport = await request(app).post('/api/imports/csv')
      .field('businessId', business.body.id)
      .attach('file', csvPath);
    expect(csvImport.status).toBe(201);
    expect(csvImport.body.importedCount).toBe(1);

    const businessTransactions = await request(app).get(`/api/transactions?businessId=${business.body.id}`);
    expect(businessTransactions.status).toBe(200);
    expect(businessTransactions.body).toHaveLength(2);
    const importedTx = businessTransactions.body.find((row: { source_type: string }) => row.source_type === 'csv_import');
    expect(importedTx?.policy_flags_json).toContain('missing_evidence_rule');
    expect(importedTx?.evidence_status).toBe('missing');
    expect(importedTx?.treatment_suggested).toBeTruthy();

    const docPath = path.join(dbDir, 'cross-wiring.pdf');
    writeFileSync(docPath, 'fake');
    const document = await request(app).post('/api/documents/upload')
      .field('businessId', business.body.id)
      .attach('file', docPath);
    expect(document.status).toBe(201);

    const link = await request(app).post('/api/evidence/links').send({
      transactionId: manualTx.body.id,
      documentId: document.body.documentId,
      strengthStatus: 'linked'
    });
    expect(link.status).toBe(201);

    const linkedTx = await request(app).get(`/api/transactions/${manualTx.body.id}`);
    expect(linkedTx.status).toBe(200);
    expect(linkedTx.body.evidence_status).toBe('linked');
    expect(linkedTx.body.evidence_count).toBe(1);
    expect(linkedTx.body.policy_flags_json).not.toContain('missing_evidence_rule');
    expect(linkedTx.body.treatment_suggested).toBeTruthy();

    const unlink = await request(app).delete(`/api/evidence/links/${link.body.id}`);
    expect(unlink.status).toBe(200);

    const unlinkedTx = await request(app).get(`/api/transactions/${manualTx.body.id}`);
    expect(unlinkedTx.status).toBe(200);
    expect(unlinkedTx.body.evidence_status).toBe('missing');
    expect(unlinkedTx.body.evidence_count).toBe(0);
    expect(unlinkedTx.body.policy_flags_json).toContain('missing_evidence_rule');

    const review = await request(app).post(`/api/review/actions/${manualTx.body.id}`).send({
      actionType: 'mark_personal',
      note: 'audit cross-wiring proof'
    });
    expect(review.status).toBe(201);

    const reviewedTx = await request(app).get(`/api/transactions/${manualTx.body.id}`);
    expect(reviewedTx.status).toBe(200);
    expect(reviewedTx.body.review_status).toBe('personal');
    expect(reviewedTx.body.category_final).toBe('personal');
    expect(reviewedTx.body.policy_flags_json).toContain('restricted_category:personal');
    expect(reviewedTx.body.treatment_suggested).toBe('personal_or_excluded');

    const reviewDecisionCount = db.prepare('SELECT COUNT(*) as count FROM review_decisions WHERE transaction_id = ?')
      .get(manualTx.body.id) as { count: number };
    expect(reviewDecisionCount.count).toBe(1);

    const evidenceStatusReport = await request(app).get(`/api/reports/evidence-status?businessId=${business.body.id}`);
    expect(evidenceStatusReport.status).toBe(200);
    expect(Array.isArray(evidenceStatusReport.body)).toBe(true);
    expect(evidenceStatusReport.body.every((row: { key?: string; count?: number }) => typeof row.key === 'string' && typeof row.count === 'number')).toBe(true);

    await request(app).post('/api/transactions').send({
      date: '2026-04-23',
      vendor: 'Recon Pair',
      amount: 99,
      businessId: business.body.id
    });
    await request(app).post('/api/transactions').send({
      date: '2026-04-23',
      vendor: 'Recon Pair',
      amount: 99,
      businessId: business.body.id
    });

    const scan = await request(app).post('/api/reconciliation/scan');
    expect(scan.status).toBe(200);
    expect(scan.body.scannedPairs).toBeGreaterThan(0);

    const candidates = await request(app).get('/api/reconciliation/candidates');
    expect(candidates.status).toBe(200);
    expect(candidates.body.length).toBeGreaterThan(0);
    expect(candidates.body.some((row: { reason?: string }) => row.reason === 'Same date/amount; at least one flagged as suspected duplicate')).toBe(true);
  });
});
