import { afterEach, describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import type { MessagesClient } from '@polymathic/ai';
import { buildApp } from '../src/app.js';
import { seedData } from '../src/seed.js';
import { MemoryStore } from '../src/store.js';

const NOW = new Date('2026-09-23T12:00:00Z');

function setup(aiClient?: MessagesClient) {
  const store = new MemoryStore(seedData(NOW));
  const app = buildApp({ store, env: { NODE_ENV: 'test' }, now: () => NOW, aiClient });
  return { app, store };
}

const as = (user: string) => ({ 'x-user-id': user });

describe('market & growth endpoints', () => {
  let app: ReturnType<typeof setup>['app'];
  afterEach(() => app?.close());

  it('serves the trade taxonomy filtered by tier', async () => {
    ({ app } = setup());
    const high = (await app.inject('/trades?tier=high')).json().trades;
    expect(high.length).toBeGreaterThan(10);
    expect(high.every((t: any) => t.tier === 'high')).toBe(true);
    const cna = (await app.inject('/trades/cna')).json();
    expect(cna.market.level).toBe('severe');
  });

  it('identifies demand gaps', async () => {
    ({ app } = setup());
    const snap = (await app.inject('/market/gaps')).json();
    expect(snap.byTrade[0].level).toBe('severe');
    expect(Object.keys(snap.byTier).sort()).toEqual(['high', 'low', 'medium', 'unknown']);
  });

  it('turns equipment into opportunities and ranks purchases', async () => {
    ({ app } = setup());
    const r = (await app.inject('/workers/w_alex/equipment')).json();
    expect(r.investments.map((i: any) => i.equipment.id)).toContain('pressure-washer');
  });

  it('renders a resume as markdown', async () => {
    ({ app } = setup());
    const res = await app.inject('/workers/w_alex/resume?format=md');
    expect(res.headers['content-type']).toContain('text/markdown');
    expect(res.body).toContain('# Alex R.');
  });
});

describe('business side: post → match → escrow → pay → review', () => {
  let app: ReturnType<typeof setup>['app'];
  afterEach(() => app?.close());

  it('runs a job end to end with payment protection and two-way reviews', async () => {
    let store: MemoryStore;
    ({ app, store } = setup());

    // Business posts a job and immediately sees who can do it.
    const post = await app.inject({
      method: 'POST',
      url: '/orgs/org_greenleaf/jobs',
      headers: as('u_dana'),
      payload: { title: 'Patch 3 drywall holes', description: '', category: 'painting-drywall', engagement: 'gig', urgency: 'immediate', remote: false, location: { lat: 30.27, lng: -97.74, region: 'Austin, TX' }, estimatedHours: 3, compensation: { kind: 'fixed', amount: 240, currency: 'USD' }, requiredSkills: [{ id: 'drywall', minLevel: 2 }] },
    });
    expect(post.statusCode).toBe(201);
    const jobId = post.json().job.id;
    expect(post.json().supply.qualified).toBe(1);

    const cands = (await app.inject({ url: `/orgs/org_greenleaf/jobs/${jobId}/candidates`, headers: as('u_dana') })).json();
    expect(cands.candidates[0]).toMatchObject({ workerId: 'w_alex', eligible: true });

    // Offer, accept, and the worker cannot start until escrow is funded.
    const offer = await app.inject({ method: 'POST', url: '/engagements', headers: as('u_dana'), payload: { opportunityId: jobId, workerIds: ['w_alex'], amount: 240 } });
    expect(offer.statusCode).toBe(201);
    const engId = offer.json().engagement.id;
    const move = (user: string, to: string) => app.inject({ method: 'POST', url: `/engagements/${engId}/transition`, headers: as(user), payload: { to } });

    expect((await move('w_alex', 'accepted')).json().escrow).toBe('none');
    const early = await move('w_alex', 'in_progress');
    expect(early.statusCode).toBe(409);
    expect(early.json().allowed).toEqual(['cancelled']);
    expect((await move('u_dana', 'funded')).json().escrow).toBe('held');
    await move('w_alex', 'in_progress');
    await move('w_alex', 'submitted');
    const paid = (await move('u_dana', 'approved')).json();
    expect(paid.engagement.status).toBe('paid');
    expect(paid.payout).toEqual({ gross: 240, platformFee: 24, perWorker: [{ workerId: 'w_alex', net: 216 }] });

    // The completed job lands on the worker's resume automatically.
    expect(store.completedJobs.get('w_alex')![0]!.tradeId).toBe('painting-drywall');

    // Reviews stay hidden until both sides submit.
    const workerReview = await app.inject({ method: 'POST', url: `/engagements/${engId}/reviews`, headers: as('w_alex'), payload: { ratings: { paid_on_time: 5, scope_accuracy: 5, communication: 4, site_safety: 5 } } });
    expect(workerReview.json()).toEqual({ submitted: 1, visible: false });
    expect((await app.inject('/reputation/org_greenleaf')).json().reviewCount).toBe(0);
    await app.inject({ method: 'POST', url: `/engagements/${engId}/reviews`, headers: as('u_dana'), payload: { ratings: { quality: 5, timeliness: 5, communication: 5, professionalism: 5 } } });
    expect((await app.inject('/reputation/org_greenleaf')).json().reviewCount).toBe(1);
    expect((await app.inject('/reputation/w_alex')).json().reviewCount).toBe(1);
  });

  it('only lets members post for an organization and only parties see an engagement', async () => {
    ({ app } = setup());
    const forbidden = await app.inject({ method: 'POST', url: '/orgs/org_greenleaf/jobs', headers: as('w_sam'), payload: { title: 'x job', description: '', category: 'handyman', engagement: 'gig', urgency: 'immediate', remote: true, requiredSkills: [] } });
    expect(forbidden.statusCode).toBe(403);
    const offer = await app.inject({ method: 'POST', url: '/engagements', headers: as('u_dana'), payload: { opportunityId: 'pm_property_maint', workerIds: ['w_alex'], amount: 700 } });
    const engId = offer.json().engagement.id;
    expect((await app.inject({ url: `/engagements/${engId}`, headers: as('w_sam') })).statusCode).toBe(403);
    expect((await app.inject({ url: `/engagements/${engId}` })).statusCode).toBe(401);
  });

  it('lets a worker start a crew', async () => {
    ({ app } = setup());
    const res = await app.inject({ method: 'POST', url: '/orgs', headers: as('w_sam'), payload: { name: 'Sam Books Co', kind: 'crew', home: { lat: 29.88, lng: -97.94, region: 'San Marcos, TX' } } });
    expect(res.statusCode).toBe(201);
    expect(res.json().members).toEqual([{ userId: 'w_sam', role: 'lead' }]);
  });
});

describe('vault endpoints', () => {
  let app: ReturnType<typeof setup>['app'];
  afterEach(() => app?.close());

  it('is owner-only', async () => {
    ({ app } = setup());
    expect((await app.inject('/workers/w_alex/vault/search?q=x')).statusCode).toBe(401);
    expect((await app.inject({ url: '/workers/w_alex/vault/search?q=x', headers: as('w_sam') })).statusCode).toBe(403);
  });

  it('stores fields and documents, searches, autofills with masking, and audits', async () => {
    ({ app } = setup());
    const h = as('w_alex');
    expect((await app.inject({ method: 'PUT', url: '/workers/w_alex/vault/fields', headers: h, payload: { fields: { legal_name: 'Alex Rivera', ssn: '123-45-6789', entity_type: 'Sole proprietor' } } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PUT', url: '/workers/w_alex/vault/fields', headers: h, payload: { fields: { favorite_color: 'blue' } } })).statusCode).toBe(400);
    const doc = await app.inject({ method: 'POST', url: '/workers/w_alex/vault/documents', headers: h, payload: { title: 'OSHA 10 card', category: 'certification', text: 'OSHA 10-hour construction', expiresAt: '2026-10-15' } });
    expect(doc.statusCode).toBe(201);

    expect((await app.inject({ url: '/workers/w_alex/vault/search?q=osha', headers: h })).json().hits[0].title).toBe('OSHA 10 card');
    expect((await app.inject({ url: '/workers/w_alex/vault/expiring?days=30', headers: h })).json().expiring).toHaveLength(1);
    const w9 = (await app.inject({ url: '/workers/w_alex/forms/w9', headers: h })).json();
    expect(w9.fields.find((f: any) => f.sourceKey === 'ssn').value).toBe('•••6789');
    expect(w9.missing).toContain('Line 5 – Address');
    const audit = (await app.inject({ url: '/workers/w_alex/vault/audit', headers: h })).json().entries;
    expect(audit.some((e: any) => e.action === 'read_field' && e.target === 'ssn')).toBe(true);
  });
});

describe('assistant endpoint', () => {
  let app: ReturnType<typeof setup>['app'];
  afterEach(() => app?.close());

  it('explains how to enable it when no API key is configured', async () => {
    ({ app } = setup());
    const res = await app.inject({ method: 'POST', url: '/workers/w_alex/assistant', headers: as('w_alex'), payload: { message: 'hi' } });
    expect(res.statusCode).toBe(503);
  });

  it('answers and remembers the conversation', async () => {
    const create = vi.fn(async () => ({ id: 'm', type: 'message', role: 'assistant', model: 'claude-opus-5', content: [{ type: 'text', text: 'Get your EPA 608.' }], stop_reason: 'end_turn', stop_sequence: null, usage: {} }) as unknown as Anthropic.Beta.BetaMessage);
    let store: MemoryStore;
    ({ app, store } = setup({ beta: { messages: { create } } }));
    const res = await app.inject({ method: 'POST', url: '/workers/w_alex/assistant', headers: as('w_alex'), payload: { message: 'How do I grow?', mode: 'growth_research' } });
    expect(res.json()).toEqual({ reply: 'Get your EPA 608.', stopReason: 'end_turn', toolsUsed: [] });
    expect(store.conversations.get('w_alex')).toHaveLength(2);
    expect((await app.inject({ method: 'DELETE', url: '/workers/w_alex/assistant', headers: as('w_alex') })).statusCode).toBe(204);
    expect(store.conversations.has('w_alex')).toBe(false);
  });
});
