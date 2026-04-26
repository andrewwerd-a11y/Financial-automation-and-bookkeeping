import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dbDir = mkdtempSync(path.join(tmpdir(), 'settings-int-'));
process.env.FIN_DB_FILE = path.join(dbDir, 'settings.db');

const { createApp } = await import('../../src/server.js');
const app = createApp();

describe('settings routes', () => {
  it('GET /api/settings returns 400 when workspaceId is missing', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WORKSPACE_REQUIRED');
  });

  it('GET /api/settings returns empty array for workspace with no settings', async () => {
    const workspace = await request(app).post('/api/workspaces').send({ name: 'Settings Empty', slug: 'settings-empty' });
    expect(workspace.status).toBe(201);

    const res = await request(app).get(`/api/settings?workspaceId=${workspace.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/settings creates a new setting', async () => {
    const workspace = await request(app).post('/api/workspaces').send({ name: 'Settings Create', slug: 'settings-create' });
    expect(workspace.status).toBe(201);

    const res = await request(app).post('/api/settings').send({
      workspaceId: workspace.body.id,
      key: 'currency',
      value: { code: 'USD' }
    });

    expect(res.status).toBe(201);
    expect(res.body.workspace_id).toBe(workspace.body.id);
    expect(res.body.key).toBe('currency');
    expect(res.body.value_json).toBe(JSON.stringify({ code: 'USD' }));
  });

  it('POST /api/settings upserts — second POST with same key updates value, does not create duplicate', async () => {
    const workspace = await request(app).post('/api/workspaces').send({ name: 'Settings Upsert', slug: 'settings-upsert' });
    expect(workspace.status).toBe(201);

    const first = await request(app).post('/api/settings').send({
      workspaceId: workspace.body.id,
      key: 'timezone',
      value: 'UTC'
    });
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/settings').send({
      workspaceId: workspace.body.id,
      key: 'timezone',
      value: 'America/New_York'
    });
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.value_json).toBe(JSON.stringify('America/New_York'));

    const list = await request(app).get(`/api/settings?workspaceId=${workspace.body.id}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('GET /api/settings returns the upserted value after update', async () => {
    const workspace = await request(app).post('/api/workspaces').send({ name: 'Settings Readback', slug: 'settings-readback' });
    expect(workspace.status).toBe(201);

    const update = await request(app).post('/api/settings').send({
      workspaceId: workspace.body.id,
      key: 'locale',
      value: { region: 'en-US' }
    });
    expect(update.status).toBe(201);

    const res = await request(app).get(`/api/settings?workspaceId=${workspace.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body[0].key).toBe('locale');
    expect(res.body[0].value_json).toBe(JSON.stringify({ region: 'en-US' }));
  });

  it('POST /api/settings returns 400 for missing required fields', async () => {
    const res = await request(app).post('/api/settings').send({ key: 'missing-workspace' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('settings are workspace-scoped — workspace A settings not visible from workspace B', async () => {
    const workspaceA = await request(app).post('/api/workspaces').send({ name: 'Workspace A', slug: 'workspace-a' });
    const workspaceB = await request(app).post('/api/workspaces').send({ name: 'Workspace B', slug: 'workspace-b' });
    expect(workspaceA.status).toBe(201);
    expect(workspaceB.status).toBe(201);

    const create = await request(app).post('/api/settings').send({
      workspaceId: workspaceA.body.id,
      key: 'currency',
      value: 'USD'
    });
    expect(create.status).toBe(201);

    const listA = await request(app).get(`/api/settings?workspaceId=${workspaceA.body.id}`);
    const listB = await request(app).get(`/api/settings?workspaceId=${workspaceB.body.id}`);
    expect(listA.status).toBe(200);
    expect(listB.status).toBe(200);
    expect(listA.body).toHaveLength(1);
    expect(listB.body).toEqual([]);
  });
});
