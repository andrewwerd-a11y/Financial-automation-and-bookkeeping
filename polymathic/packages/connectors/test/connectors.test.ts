import { describe, expect, it, vi } from 'vitest';
import type { Opportunity } from '@polymathic/core';
import {
  aggregateOpportunities,
  buildAuthorizeUrl,
  createPkcePair,
  dedupe,
  exchangeCode,
  isExpired,
  mapUsaJobsItem,
  pkceChallenge,
  refreshAccessToken,
  usaJobsConnector,
  type Connector,
} from '../src/index.js';

const baseOpp: Opportunity = {
  id: 'a:1',
  source: { connectorId: 'a', externalId: '1', fetchedAt: '2026-09-23T00:00:00Z' },
  title: 'Paint fence',
  description: '',
  category: 'handyman',
  engagement: 'gig',
  urgency: 'scheduled',
  remote: false,
  location: { lat: 30.2672, lng: -97.7431, region: 'Austin, TX' },
  startsAt: '2026-09-25T15:00:00Z',
  compensation: { kind: 'hourly', amount: 30, currency: 'USD', platformFeePct: 20 },
  requiredSkills: [],
  requiredCertifications: [],
  requiredEquipment: [],
  minTrustTier: 'new',
  requiresBackgroundCheck: false,
  headcount: 1,
};

describe('oauth2', () => {
  it('produces an RFC 7636 S256 challenge', () => {
    // Test vector from RFC 7636 appendix B.
    expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    const pair = createPkcePair();
    expect(pair.challenge).toBe(pkceChallenge(pair.verifier));
  });

  it('builds an authorize URL', () => {
    const url = new URL(buildAuthorizeUrl({ authorizeUrl: 'https://p.example/auth', clientId: 'cid', redirectUri: 'http://localhost/cb', scopes: ['a', 'b'], state: 's', codeChallenge: 'c' }));
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code', client_id: 'cid', redirect_uri: 'http://localhost/cb', state: 's', scope: 'a b', code_challenge: 'c', code_challenge_method: 'S256',
    });
  });

  it('exchanges a code and computes expiry', async () => {
    const fetchMock = vi.fn(async () => Response.json({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, token_type: 'bearer' }));
    const tokens = await exchangeCode({ tokenUrl: 'https://p.example/token', clientId: 'cid', clientSecret: 'sec', code: 'c', redirectUri: 'r', codeVerifier: 'v', fetch: fetchMock, now: () => new Date('2026-01-01T00:00:00Z') });
    expect(tokens).toMatchObject({ accessToken: 'at', refreshToken: 'rt', expiresAt: '2026-01-01T01:00:00.000Z' });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from('cid:sec').toString('base64')}`);
    expect(String(init.body)).toContain('code_verifier=v');
    expect(isExpired(tokens, new Date('2026-01-01T00:59:30Z'))).toBe(true);
    expect(isExpired(tokens, new Date('2026-01-01T00:30:00Z'))).toBe(false);
  });

  it('keeps the old refresh token when the provider omits one', async () => {
    const fetchMock = vi.fn(async () => Response.json({ access_token: 'at2' }));
    const tokens = await refreshAccessToken({ tokenUrl: 'https://p.example/token', clientId: 'cid', refreshToken: 'rt', fetch: fetchMock });
    expect(tokens.refreshToken).toBe('rt');
  });

  it('surfaces token endpoint errors', async () => {
    const fetchMock = vi.fn(async () => new Response('bad', { status: 400 }));
    await expect(exchangeCode({ tokenUrl: 'https://p.example/token', clientId: 'cid', code: 'c', redirectUri: 'r', fetch: fetchMock })).rejects.toThrow('400');
  });
});

describe('aggregation', () => {
  it('collapses cross-posted jobs, keeping the listing that pays the worker more', () => {
    const cheaper = baseOpp;
    const better = { ...baseOpp, id: 'b:9', source: { ...baseOpp.source, connectorId: 'b', externalId: '9', url: 'https://b/9' }, compensation: { ...baseOpp.compensation!, platformFeePct: 5 } };
    const out = dedupe([cheaper, better]);
    expect(out).toHaveLength(1);
    expect(out[0]!.source.connectorId).toBe('b');
    expect(out[0]!.alsoListedOn).toEqual([{ connectorId: 'a', url: undefined }]);
  });

  it('keeps going when one source fails', async () => {
    const ok: Connector = { id: 'ok', name: 'ok', category: 'job_board', auth: { kind: 'none' }, capabilities: ['opportunities'], fetchOpportunities: async () => [baseOpp] };
    const broken: Connector = { ...ok, id: 'broken', fetchOpportunities: async () => { throw new Error('rate limited'); } };
    const res = await aggregateOpportunities([ok, broken], () => ({ env: {}, fetch, now: () => new Date() }), {});
    expect(res.opportunities).toHaveLength(1);
    expect(res.errors).toEqual([{ connectorId: 'broken', message: 'rate limited' }]);
  });
});

describe('usajobs', () => {
  const item = {
    MatchedObjectId: '123',
    MatchedObjectDescriptor: {
      PositionTitle: 'Maintenance Mechanic',
      PositionURI: 'https://www.usajobs.gov/job/123',
      QualificationSummary: 'Repairs HVAC',
      PositionLocation: [{ LocationName: 'Austin, Texas', Latitude: 30.27, Longitude: -97.74 }],
      PositionRemuneration: [{ MinimumRange: '28.10', MaximumRange: '32.80', RateIntervalCode: 'PH' }],
      PositionSchedule: [{ Name: 'Full-time' }],
    },
  };

  it('maps a search result into an Opportunity', () => {
    const o = mapUsaJobsItem(item, '2026-09-23T00:00:00Z');
    expect(o).toMatchObject({
      id: 'usajobs:123',
      engagement: 'full_time',
      remote: false,
      location: { region: 'Austin, Texas' },
      compensation: { kind: 'hourly', amount: 28.1, maxAmount: 32.8 },
    });
  });

  it('sends the required headers', async () => {
    const fetchMock = vi.fn(async () => Response.json({ SearchResult: { SearchResultItems: [item] } }));
    const out = await usaJobsConnector.fetchOpportunities!(
      { env: { USAJOBS_API_KEY: 'k', USAJOBS_USER_AGENT: 'me@example.com' }, fetch: fetchMock, now: () => new Date() },
      { keywords: ['mechanic'], radiusKm: 80, near: { lat: 0, lng: 0, region: 'Austin, TX' } },
    );
    expect(out).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.get('Radius')).toBe('50');
    expect((init.headers as Record<string, string>)['Authorization-Key']).toBe('k');
  });
});
