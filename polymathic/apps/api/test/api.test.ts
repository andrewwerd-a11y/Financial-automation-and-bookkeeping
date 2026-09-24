import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Connector } from '@polymathic/connectors';
import { buildApp } from '../src/app.js';
import { seedData } from '../src/seed.js';
import { MemoryStore } from '../src/store.js';

const NOW = new Date('2026-09-23T12:00:00Z');
const oauthConnector: Connector = {
  id: 'acme',
  name: 'Acme Gigs',
  category: 'freelance_marketplace',
  auth: { kind: 'oauth2', authorizeUrl: 'https://acme.example/authorize', tokenUrl: 'https://acme.example/token', scopes: ['jobs'], pkce: true, clientIdEnv: 'ACME_ID' },
  capabilities: ['opportunities'],
};

function setup(fetchMock: typeof fetch = vi.fn()) {
  const store = new MemoryStore(seedData(NOW));
  const app = buildApp({ store, connectors: [oauthConnector], env: { NODE_ENV: 'test', ACME_ID: 'client-1' }, fetch: fetchMock, now: () => NOW });
  return { app, store };
}

describe('api', () => {
  let app: ReturnType<typeof setup>['app'];
  afterEach(() => app?.close());

  it('returns ranked matches with explanations', async () => {
    ({ app } = setup());
    const res = await app.inject('/workers/w_alex/opportunities?includeIneligible=true');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.matches[0].eligible).toBe(true);
    expect(body.matches.find((m: any) => m.opportunity.id === 'pm_hvac_helper').blockers[0].ref).toBe('epa-608');
  });

  it('returns a growth plan', async () => {
    ({ app } = setup());
    const res = await app.inject('/workers/w_alex/growth');
    expect(res.json().plan.map((s: any) => s.ref)).toContain('epa-608');
  });

  it('accepts a posted job and matches it', async () => {
    ({ app } = setup());
    const post = await app.inject({
      method: 'POST',
      url: '/jobs',
      payload: { title: 'Hang 4 doors', description: '', category: 'handyman', engagement: 'gig', urgency: 'immediate', remote: false, location: { lat: 30.27, lng: -97.74, region: 'Austin, TX' }, estimatedHours: 3, compensation: { kind: 'fixed', amount: 180, currency: 'USD' }, requiredSkills: [] },
    });
    expect(post.statusCode).toBe(201);
    const matches = (await app.inject('/workers/w_alex/opportunities')).json().matches;
    expect(matches.map((m: any) => m.opportunity.id)).toContain(post.json().id);
  });

  it('rejects invalid jobs', async () => {
    ({ app } = setup());
    const res = await app.inject({ method: 'POST', url: '/jobs', payload: { title: 'x' } });
    expect(res.statusCode).toBe(400);
  });

  it('runs the OAuth connect flow with PKCE and single-use state', async () => {
    const fetchMock = vi.fn(async () => Response.json({ access_token: 'tok', expires_in: 3600 }));
    let store;
    ({ app, store } = setup(fetchMock));

    const start = await app.inject('/connect/acme/start?workerId=w_alex');
    const authorizeUrl = new URL(start.json().authorizeUrl);
    expect(authorizeUrl.origin).toBe('https://acme.example');
    expect(authorizeUrl.searchParams.get('code_challenge_method')).toBe('S256');
    const state = authorizeUrl.searchParams.get('state')!;

    const cb = await app.inject(`/connect/acme/callback?code=abc&state=${state}`);
    expect(cb.json()).toEqual({ connected: 'acme', workerId: 'w_alex' });
    expect(store.tokens.get('w_alex:acme')?.accessToken).toBe('tok');
    expect(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)).toContain('code_verifier=');

    const replay = await app.inject(`/connect/acme/callback?code=abc&state=${state}`);
    expect(replay.statusCode).toBe(400);
  });

  it('serves the map page and its bundled map library', async () => {
    ({ app } = setup());
    const page = await app.inject('/');
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('id="map"');
    expect((await app.inject('/vendor/leaflet.js')).statusCode).toBe(200);
    expect((await app.inject('/vendor/leaflet.css')).headers['content-type']).toContain('text/css');
  });

  it('lists workers for the map picker', async () => {
    ({ app } = setup());
    expect((await app.inject('/workers')).json().workers.map((w: any) => w.id)).toEqual(['w_alex', 'w_sam', 'w_maria']);
  });

  it('shows out-of-range jobs only when asked for blocked jobs', async () => {
    ({ app } = setup());
    const ids = async (q: string) => (await app.inject(`/workers/w_alex/opportunities${q}`)).json().matches.map((m: any) => m.opportunity.id);
    expect(await ids('')).not.toContain('pm_sa_tile');
    expect(await ids('?includeIneligible=true')).toContain('pm_sa_tile');
  });

  it('lists the integration catalog', async () => {
    ({ app } = setup());
    const body = (await app.inject('/integrations')).json();
    expect(body.active.map((c: any) => c.id)).toEqual(['polymathic', 'acme']);
    expect(body.catalog.length).toBeGreaterThan(10);
  });
});
