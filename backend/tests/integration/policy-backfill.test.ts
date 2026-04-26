import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'policy-backfill-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'policy-backfill.db');

const { createApp } = await import('../../src/server.js');
const app = createApp();

const createWorkspaceAndBusiness = async (suffix: string) => {
  const workspace = await request(app).post('/api/workspaces').send({
    name: `Policy Workspace ${suffix}`,
    slug: `policy-workspace-${suffix}`
  });
  expect(workspace.status).toBe(201);

  const business = await request(app).post('/api/businesses').send({
    workspaceId: workspace.body.id,
    name: `Policy Business ${suffix}`,
    labelType: 'llc'
  });
  expect(business.status).toBe(201);

  return { workspaceId: workspace.body.id as string, businessId: business.body.id as string };
};

describe('policy backfill', () => {
  it('POST /api/policies/:businessId/backfill returns 404 for unknown businessId', async () => {
    const res = await request(app).post('/api/policies/missing-business/backfill');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BUSINESS_NOT_FOUND');
  });

  it('backfill applies amount_threshold flags to existing transactions above threshold', async () => {
    const ids = await createWorkspaceAndBusiness('amount-threshold');

    const low = await request(app).post('/api/transactions').send({
      date: '2026-05-10',
      vendor: 'Amount Low',
      amount: 30,
      businessId: ids.businessId
    });
    const mid = await request(app).post('/api/transactions').send({
      date: '2026-05-11',
      vendor: 'Amount Mid',
      amount: 75,
      businessId: ids.businessId
    });
    const high = await request(app).post('/api/transactions').send({
      date: '2026-05-12',
      vendor: 'Amount High',
      amount: 120,
      businessId: ids.businessId
    });
    expect(low.status).toBe(201);
    expect(mid.status).toBe(201);
    expect(high.status).toBe(201);

    const policy = await request(app).post('/api/policies').send({
      workspaceId: ids.workspaceId,
      businessId: ids.businessId,
      ruleType: 'amount_threshold',
      thresholdValue: 50,
      active: true
    });
    expect(policy.status).toBe(201);

    const lowTx = await request(app).get(`/api/transactions/${low.body.id}`);
    const midTx = await request(app).get(`/api/transactions/${mid.body.id}`);
    const highTx = await request(app).get(`/api/transactions/${high.body.id}`);

    expect(lowTx.body.policy_flags_json).not.toContain('amount_over_threshold:50');
    expect(midTx.body.policy_flags_json).toContain('amount_over_threshold:50');
    expect(highTx.body.policy_flags_json).toContain('amount_over_threshold:50');
  });

  it('backfill applies category_restriction flags to existing transactions', async () => {
    const ids = await createWorkspaceAndBusiness('category-restriction');

    const mealsTx = await request(app).post('/api/transactions').send({
      date: '2026-05-13',
      vendor: 'Coffee House',
      amount: 19,
      description_raw: 'meal with team',
      businessId: ids.businessId
    });
    expect(mealsTx.status).toBe(201);

    const policy = await request(app).post('/api/policies').send({
      workspaceId: ids.workspaceId,
      businessId: ids.businessId,
      ruleType: 'category_restriction',
      categoryValue: 'meals',
      active: true
    });
    expect(policy.status).toBe(201);

    const tx = await request(app).get(`/api/transactions/${mealsTx.body.id}`);
    expect(tx.status).toBe(200);
    expect(tx.body.policy_flags_json).toContain('restricted_category:meals');
  });

  it('backfill applies missing_evidence flags to existing unlinked transactions', async () => {
    const ids = await createWorkspaceAndBusiness('missing-evidence');

    const tx = await request(app).post('/api/transactions').send({
      date: '2026-05-14',
      vendor: 'Receipt Missing',
      amount: 42,
      businessId: ids.businessId
    });
    expect(tx.status).toBe(201);

    const policy = await request(app).post('/api/policies').send({
      workspaceId: ids.workspaceId,
      businessId: ids.businessId,
      ruleType: 'missing_evidence',
      active: true
    });
    expect(policy.status).toBe(201);

    const updated = await request(app).get(`/api/transactions/${tx.body.id}`);
    expect(updated.status).toBe(200);
    expect(updated.body.policy_flags_json).toContain('missing_evidence_rule');
  });

  it('manual POST /api/policies/:businessId/backfill endpoint returns {ok,updated}', async () => {
    const ids = await createWorkspaceAndBusiness('manual-endpoint');

    const tx = await request(app).post('/api/transactions').send({
      date: '2026-05-15',
      vendor: 'Manual Endpoint',
      amount: 65,
      businessId: ids.businessId
    });
    expect(tx.status).toBe(201);

    const policy = await request(app).post('/api/policies').send({
      workspaceId: ids.workspaceId,
      businessId: ids.businessId,
      ruleType: 'amount_threshold',
      thresholdValue: 80,
      active: true
    });
    expect(policy.status).toBe(201);

    const res = await request(app).post(`/api/policies/${ids.businessId}/backfill`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, updated: 1 });
  });

  it('toggling a policy off and backfilling clears flags from previously flagged transactions', async () => {
    const ids = await createWorkspaceAndBusiness('toggle-clear');

    const tx = await request(app).post('/api/transactions').send({
      date: '2026-05-16',
      vendor: 'Toggle Threshold',
      amount: 150,
      businessId: ids.businessId
    });
    expect(tx.status).toBe(201);

    const policy = await request(app).post('/api/policies').send({
      workspaceId: ids.workspaceId,
      businessId: ids.businessId,
      ruleType: 'amount_threshold',
      thresholdValue: 100,
      active: true
    });
    expect(policy.status).toBe(201);

    const beforeToggle = await request(app).get(`/api/transactions/${tx.body.id}`);
    expect(beforeToggle.body.policy_flags_json).toContain('amount_over_threshold:100');

    const update = await request(app).patch(`/api/policies/${policy.body.id}`).send({
      ruleType: 'amount_threshold',
      thresholdValue: 100,
      active: false
    });
    expect(update.status).toBe(200);

    const backfill = await request(app).post(`/api/policies/${ids.businessId}/backfill`);
    expect(backfill.status).toBe(200);

    const afterToggle = await request(app).get(`/api/transactions/${tx.body.id}`);
    expect(afterToggle.body.policy_flags_json).toBe('[]');
  });

  it('transactions without businessId are not affected by backfill', async () => {
    const ids = await createWorkspaceAndBusiness('global-unaffected');

    const globalTx = await request(app).post('/api/transactions').send({
      date: '2026-05-17',
      vendor: 'Global Transaction',
      amount: 300
    });
    expect(globalTx.status).toBe(201);

    const businessTx = await request(app).post('/api/transactions').send({
      date: '2026-05-18',
      vendor: 'Business Transaction',
      amount: 300,
      businessId: ids.businessId
    });
    expect(businessTx.status).toBe(201);

    const policy = await request(app).post('/api/policies').send({
      workspaceId: ids.workspaceId,
      businessId: ids.businessId,
      ruleType: 'amount_threshold',
      thresholdValue: 100,
      active: true
    });
    expect(policy.status).toBe(201);

    const backfill = await request(app).post(`/api/policies/${ids.businessId}/backfill`);
    expect(backfill.status).toBe(200);

    const globalAfter = await request(app).get(`/api/transactions/${globalTx.body.id}`);
    const businessAfter = await request(app).get(`/api/transactions/${businessTx.body.id}`);
    expect(globalAfter.body.policy_flags_json).toBe('[]');
    expect(businessAfter.body.policy_flags_json).toContain('amount_over_threshold:100');
  });
});
