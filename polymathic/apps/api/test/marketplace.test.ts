import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { seedData } from '../src/seed.js';
import { MemoryStore } from '../src/store.js';

const NOW = new Date('2026-09-23T12:00:00Z');
const AUSTIN = { lat: 30.2672, lng: -97.7431, region: 'Austin, TX' };
const as = (user: string) => ({ 'x-user-id': user });

function setup() {
  const store = new MemoryStore(seedData(NOW));
  const app = buildApp({ store, env: { NODE_ENV: 'test', PUBLIC_BASE_URL: 'https://polymathic.example' }, now: () => NOW });
  return { app, store };
}

describe('customer side', () => {
  let app: ReturnType<typeof setup>['app'];
  afterEach(() => app?.close());

  it('searches pros from plain language with a local price estimate, without leaking home coordinates', async () => {
    ({ app } = setup());
    const res = (await app.inject(`/providers/search?q=${encodeURIComponent('garage cleanout junk haul away')}&lat=30.2672&lng=-97.7431`)).json();
    expect(res.interpretedAs[0].tradeId).toBe('junk-removal');
    expect(res.estimate.basis.localObservations).toBe(3);
    expect(res.results.map((r: any) => r.provider.id)).toContain('w_alex');
    expect(res.results[0].provider.home).toEqual({ region: expect.any(String) });
    expect(res.results.find((r: any) => r.provider.id === 'w_alex').siteUrl).toBe('https://polymathic.example/s/alex-handyman-austin');
  });

  it('runs request → quote → accept → escrow → paid, and the price teaches the database', async () => {
    let store: MemoryStore;
    ({ app, store } = setup());

    const posted = await app.inject({ method: 'POST', url: '/requests', headers: as('c_jordan'), payload: { description: 'Kitchen faucet leaking under the sink', location: AUSTIN, timing: 'asap' } });
    expect(posted.statusCode).toBe(201);
    const { request, estimate, providers } = posted.json();
    expect(request.tradeId).toBe('plumbing');
    expect(estimate.serviceId).toBe('plumber-hourly');
    expect(providers.map((p: any) => p.id)).toEqual(['w_devon']);

    // The plumber sees it and quotes; other trades don't see it.
    expect((await app.inject({ url: '/providers/w_devon/requests', headers: as('w_devon') })).json().requests).toHaveLength(1);
    expect((await app.inject({ url: '/providers/w_kim/requests', headers: as('w_kim') })).json().requests).toHaveLength(0);
    expect((await app.inject({ url: '/providers/w_devon/requests', headers: as('w_kim') })).statusCode).toBe(403);
    const quote = await app.inject({ method: 'POST', url: `/requests/${request.id}/quotes`, headers: as('w_devon'), payload: { providerId: 'w_devon', amount: 120, message: 'Can come today' } });
    expect(quote.statusCode).toBe(201);
    expect(quote.json().market.position).toBe('typical');
    expect((await app.inject({ method: 'POST', url: `/requests/${request.id}/quotes`, headers: as('w_devon'), payload: { providerId: 'w_devon', amount: 100 } })).statusCode).toBe(409);
    expect((await app.inject({ method: 'POST', url: `/requests/${request.id}/quotes`, headers: as('w_kim'), payload: { providerId: 'w_kim', amount: 90 } })).statusCode).toBe(404);

    // Customer compares and accepts; only they can.
    const view = (await app.inject({ url: `/requests/${request.id}`, headers: as('c_jordan') })).json();
    expect(view.quotes[0].market.position).toBe('typical');
    const quoteId = quote.json().quote.id;
    expect((await app.inject({ method: 'POST', url: `/requests/${request.id}/quotes/${quoteId}/accept`, headers: as('w_devon') })).statusCode).toBe(403);
    const accepted = await app.inject({ method: 'POST', url: `/requests/${request.id}/quotes/${quoteId}/accept`, headers: as('c_jordan') });
    expect(accepted.json().status).toBe('accepted');
    const engId = accepted.json().engagementId;

    const move = (user: string, to: string) => app.inject({ method: 'POST', url: `/engagements/${engId}/transition`, headers: as(user), payload: { to } });
    expect((await move('c_jordan', 'funded')).json().escrow).toBe('held');
    await move('w_devon', 'in_progress');
    await move('w_devon', 'submitted');
    const before = store.priceObservations.length;
    expect((await move('c_jordan', 'approved')).json().engagement.status).toBe('paid');
    expect(store.priceObservations.length).toBe(before + 1);
    expect(store.priceObservations.at(-1)).toMatchObject({ serviceId: 'plumber-hourly', unitPrice: 120 });
    expect(store.requests.get(request.id)!.status).toBe('booked');
  });
});

describe('provider websites', () => {
  let app: ReturnType<typeof setup>['app'];
  afterEach(() => app?.close());

  it('serves a locked-down, SEO-ready site with live pricing', async () => {
    ({ app } = setup());
    const res = await app.inject('/s/alex-handyman-austin');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.body).toContain('Reliable handyman');
    expect(res.body).toContain('application/ld+json');
    expect(res.body).toContain('From $70');
    expect((await app.inject('/sitemap.xml')).body).toContain('https://polymathic.example/s/devon-plumbing');
    expect((await app.inject('/s/nope')).statusCode).toBe(404);
  });

  it('lets a guest request a quote from the site, and only the invited pro sees their contact', async () => {
    let store: MemoryStore;
    ({ app, store } = setup());
    const res = await app.inject({
      method: 'POST',
      url: '/s/devon-plumbing/request',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({ description: 'Water heater is leaking', name: 'Pat', phone: '512-555-0199', timing: 'asap' }).toString(),
    });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe('/s/devon-plumbing?sent=1#quote');
    const [request] = [...store.requests.values()];
    expect(request!.invitedProviderIds).toEqual(['w_devon']);
    expect((await app.inject({ url: `/requests/${request!.id}`, headers: as('w_devon') })).json().contact).toEqual({ name: 'Pat', phone: '512-555-0199' });
    expect((await app.inject('/s/devon-plumbing?sent=1')).body).toContain('Your request was sent');
  });

  it('rejects incomplete guest requests and rate-limits spam', async () => {
    ({ app } = setup());
    const post = (description: string) =>
      app.inject({ method: 'POST', url: '/s/devon-plumbing/request', headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: new URLSearchParams({ description, name: 'Pat', email: 'p@example.com' }).toString() });
    expect((await post('hi')).statusCode).toBe(400);
    // Every submission counts toward the limit, including rejected ones.
    for (let i = 0; i < 4; i++) expect((await post('Leaky pipe under sink')).statusCode).toBe(303);
    expect((await post('Leaky pipe under sink')).statusCode).toBe(429);
  });

  it('lets a pro build and publish their own site, with validation and unique addresses', async () => {
    ({ app } = setup());
    const put = (user: string, id: string, payload: object) => app.inject({ method: 'PUT', url: `/providers/${id}/site`, headers: as(user), payload });
    expect((await put('w_kim', 'w_devon', { slug: 'x-y-z' })).statusCode).toBe(403);
    expect((await put('w_kim', 'w_kim', { slug: 'devon-plumbing' })).json().errors).toContain('That address is taken');
    expect((await put('w_kim', 'w_kim', { slug: 'kim-cleans', accent: 'pink' })).statusCode).toBe(400);
    const ok = await put('w_kim', 'w_kim', { slug: 'kim-cleans', published: true, headline: 'Spotless homes in East Austin', prices: { 'standard-clean': 150 } });
    expect(ok.json().url).toBe('https://polymathic.example/s/kim-cleans');
    const page = await app.inject('/s/kim-cleans');
    expect(page.body).toContain('Spotless homes in East Austin');
    expect(page.body).toContain('From $150');
  });
});
