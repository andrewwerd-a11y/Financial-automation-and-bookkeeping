import { describe, expect, it } from 'vitest';
import {
  SERVICES,
  TRADES,
  classifyRequest,
  estimatePrice,
  marketPosition,
  orgAsProvider,
  regionFor,
  requestToOpportunity,
  requestVisibleTo,
  searchProviders,
  workerAsProvider,
  type PriceObservation,
  type ServiceRequest,
} from '../src/index.js';
import { seedData } from '../../../apps/api/src/seed.js';

const NOW = new Date('2026-09-23T12:00:00Z');
const { workers, organizations } = seedData(NOW);
const AUSTIN = { lat: 30.2672, lng: -97.7431, region: 'Austin, TX' };
const providers = [...workers.filter((w) => w.offers?.length).map((w) => workerAsProvider(w)), ...organizations.map((o) => orgAsProvider(o))];

describe('pricing database', () => {
  it('has a service for many trades, all mapped to real trades, with sane ranges', () => {
    const tradeIds = new Set(TRADES.map((t) => t.id));
    expect(SERVICES.length).toBeGreaterThanOrEqual(60);
    expect(SERVICES.filter((s) => !tradeIds.has(s.tradeId)).map((s) => s.id)).toEqual([]);
    expect(new Set(SERVICES.map((s) => s.id)).size).toBe(SERVICES.length);
    for (const s of SERVICES) expect(s.seed.low <= s.seed.typical && s.seed.typical <= s.seed.high).toBe(true);
  });

  it('adjusts for region', () => {
    expect(regionFor({ lat: 40.7, lng: -74 })?.id).toBe('nyc');
    const austin = estimatePrice('standard-clean', { location: AUSTIN, now: NOW });
    const nyc = estimatePrice('standard-clean', { location: { lat: 40.71, lng: -74.0 }, now: NOW });
    expect(nyc.perUnit.typical).toBeGreaterThan(austin.perUnit.typical);
    expect(estimatePrice('standard-clean', { location: { lat: 45, lng: -100 }, now: NOW }).basis.regionMultiplier).toBe(1);
  });

  it('learns from local paid jobs and ignores far-away or stale ones', () => {
    const obs = (unitPrice: number, lat: number, daysAgo: number): PriceObservation => ({
      serviceId: 'junk-haul-load',
      unitPrice,
      location: { lat, lng: -97.74 },
      at: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
      source: 'paid_job',
    });
    const local = Array.from({ length: 20 }, () => obs(500, 30.27, 10));
    const est = estimatePrice('junk-haul-load', { location: AUSTIN, observations: [...local, obs(50, 40, 1), obs(50, 30.27, 400)], now: NOW });
    expect(est.basis.localObservations).toBe(20);
    expect(est.basis.confidence).toBe('high');
    expect(est.perUnit.typical).toBeGreaterThan(420); // pulled most of the way from 300 toward 500
  });

  it('scales totals by quantity and positions quotes against the market', () => {
    const est = estimatePrice('interior-painting-room', { location: AUSTIN, quantity: 3, now: NOW });
    expect(est.total.typical).toBe(1500);
    expect(marketPosition(1500, est).position).toBe('typical');
    expect(marketPosition(500, est).position).toBe('well_below');
    expect(marketPosition(4000, est).position).toBe('well_above');
  });
});

describe('request classification', () => {
  it.each([
    ['My kitchen faucet is leaking under the sink', 'plumbing'],
    ['Need my garage cleaned out and the junk hauled away', 'junk-removal'],
    ['AC is not cooling and the house is 85 degrees', 'hvac'],
    ['Looking for someone to mow the lawn every week', 'landscaping'],
    ['Assemble an IKEA bed frame and two dressers', 'furniture-assembly'],
    ['Need a photographer for headshots', 'photography'],
  ])('%s → %s', (text, trade) => {
    expect(classifyRequest(text)[0]?.tradeId).toBe(trade);
  });

  it('does not match words inside other words', () => {
    expect(classifyRequest('back porch').some((m) => m.tradeId === 'hvac')).toBe(false);
  });
});

describe('provider search', () => {
  it('finds the right pros for a plain-language need, ranked', () => {
    const { interpretedAs, results } = searchProviders({ location: AUSTIN, text: 'toilet keeps running and a drain is clogged' }, providers);
    expect(interpretedAs[0]!.tradeId).toBe('plumbing');
    expect(results.map((r) => r.provider.id)).toEqual(['w_devon']);
    expect(results[0]!.reasons).toContain('Background checked');
  });

  it('respects each provider\'s service radius and availability filter', () => {
    const farAway = { lat: 29.42, lng: -98.49, region: 'San Antonio, TX' };
    expect(searchProviders({ location: farAway, tradeIds: ['plumbing'] }, providers).results).toEqual([]);
    const now = searchProviders({ location: AUSTIN, tradeIds: ['house-cleaning'], availableNow: true }, providers);
    expect(now.results).toEqual([]); // Kim isn't available right now
  });

  it('includes crews and businesses', () => {
    const { results } = searchProviders({ location: AUSTIN, tradeIds: ['junk-removal'] }, providers);
    expect(results.map((r) => r.provider.id).sort()).toEqual(['crew_alex', 'w_alex']);
  });
});

describe('requests', () => {
  const req: ServiceRequest = {
    id: 'r1',
    customerId: 'c_jordan',
    title: 'Fix leak',
    description: 'faucet leak',
    serviceId: 'plumber-hourly',
    tradeId: 'plumbing',
    location: AUSTIN,
    timing: 'asap',
    invitedProviderIds: [],
    status: 'open',
    createdAt: NOW.toISOString(),
  };

  it('is visible to nearby pros in the trade, or anyone invited', () => {
    const devon = providers.find((p) => p.id === 'w_devon')!;
    const kim = providers.find((p) => p.id === 'w_kim')!;
    expect(requestVisibleTo(req, devon)).toBe(true);
    expect(requestVisibleTo(req, kim)).toBe(false);
    expect(requestVisibleTo({ ...req, invitedProviderIds: ['w_kim'] }, kim)).toBe(true);
    expect(requestVisibleTo({ ...req, status: 'booked' }, devon)).toBe(false);
  });

  it('turns an accepted quote into a normal job', () => {
    const opp = requestToOpportunity(req, { id: 'q1', requestId: 'r1', providerId: 'w_devon', amount: 180, createdAt: NOW.toISOString(), status: 'accepted' }, NOW);
    expect(opp).toMatchObject({ category: 'plumbing', serviceId: 'plumber-hourly', urgency: 'immediate', postedBy: 'c_jordan', compensation: { kind: 'fixed', amount: 180 } });
  });
});
