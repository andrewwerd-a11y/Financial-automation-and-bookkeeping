import { distanceKm } from './geo.js';
import { SERVICES, getService } from './pricing.js';
import { getTrade } from './trades.js';
import { bayesianRating, computeTrust, tierRank } from './trust.js';
import type { Reputation } from './reviews.js';
import type { Opportunity, Organization, Place, TrustTier, Urgency, WorkerProfile } from './types.js';

/**
 * The customer side: people and businesses who need work done search for
 * providers, post requests in plain language, and compare quotes.
 */

export type RequestTiming = 'asap' | 'this_week' | 'flexible' | 'scheduled';

export interface ServiceRequest {
  id: string;
  customerId: string;
  title: string;
  description: string;
  serviceId: string | null;
  tradeId: string | null;
  location: Place;
  timing: RequestTiming;
  preferredDate?: string;
  /** In the service's unit (rooms, sqft, hours…). */
  quantity?: number;
  budget?: number;
  /** Providers the customer asked directly (from search or a provider's website). */
  invitedProviderIds: string[];
  status: 'open' | 'booked' | 'closed';
  createdAt: string;
  engagementId?: string;
}

export interface Quote {
  id: string;
  requestId: string;
  providerId: string;
  amount: number;
  message?: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
}

export interface ServiceMatch {
  serviceId: string;
  tradeId: string;
  name: string;
  confidence: number;
}

/**
 * Maps "my AC is blowing warm air" to a service and trade without an AI
 * call. The assistant can refine low-confidence matches.
 */
export function classifyRequest(text: string, limit = 3): ServiceMatch[] {
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')} `;
  const scored = SERVICES.map((svc) => {
    let score = 0;
    for (const kw of svc.keywords) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:s|es)?\\b`);
      if (re.test(hay)) score += 1 + kw.split(' ').length; // multi-word phrases are stronger evidence
    }
    return { svc, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map(({ svc, score }) => ({ serviceId: svc.id, tradeId: svc.tradeId, name: svc.name, confidence: Math.min(1, score / 6) }));
}

export interface ProviderProfile {
  id: string;
  kind: 'worker' | 'crew' | 'business';
  name: string;
  home: Place;
  serviceRadiusKm: number;
  trades: string[];
  trustScore: number | null;
  trustTier: TrustTier | null;
  rating: number | null;
  reviewCount: number;
  verified: { identity: boolean; backgroundCheck: boolean; insurance: boolean; license: boolean };
  availableNow: boolean;
  siteSlug?: string;
}

export function workerAsProvider(worker: WorkerProfile, rep?: Reputation, siteSlug?: string): ProviderProfile {
  const trust = computeTrust(worker);
  const h = worker.history;
  // Combine imported platform history with Polymathic reviews, confidence-weighted.
  const importedCount = h.averageRating === null ? 0 : h.ratingCount;
  const nativeCount = rep?.reviewCount ?? 0;
  const count = importedCount + nativeCount;
  const avg =
    count === 0 ? null : ((h.averageRating ?? 0) * importedCount + (rep?.overall ?? 0) * nativeCount) / count;
  return {
    id: worker.id,
    kind: 'worker',
    name: worker.displayName,
    home: worker.home,
    serviceRadiusKm: worker.availability.maxTravelKm,
    trades: worker.offers ?? [],
    trustScore: trust.score,
    trustTier: trust.tier,
    rating: avg === null ? null : Math.round(bayesianRating(avg, count) * 100) / 100,
    reviewCount: count,
    verified: {
      identity: worker.verification.identity,
      backgroundCheck: worker.verification.backgroundCheck === 'clear',
      insurance: worker.verification.insurance,
      license: worker.verification.businessLicense || worker.certifications.some((c) => c.verified && c.id.endsWith('license')),
    },
    availableNow: worker.availability.availableNow,
    siteSlug,
  };
}

export function orgAsProvider(org: Organization, rep?: Reputation, siteSlug?: string): ProviderProfile {
  return {
    id: org.id,
    kind: org.kind,
    name: org.name,
    home: org.home,
    serviceRadiusKm: 50,
    trades: org.trades ?? [],
    trustScore: null,
    trustTier: null,
    rating: rep?.overall ?? null,
    reviewCount: rep?.reviewCount ?? 0,
    verified: { identity: true, backgroundCheck: false, insurance: org.verification.insurance, license: org.verification.businessLicense },
    availableNow: false,
    siteSlug,
  };
}

export interface ProviderQuery {
  location: Place;
  /** Free text like "fix a leaking faucet"; classified into trades when tradeIds is absent. */
  text?: string;
  tradeIds?: string[];
  availableNow?: boolean;
  minTier?: TrustTier;
  limit?: number;
}

export interface ProviderResult {
  provider: ProviderProfile;
  score: number;
  distanceKm: number;
  reasons: string[];
}

export function searchProviders(query: ProviderQuery, providers: ProviderProfile[]): { interpretedAs: ServiceMatch[]; results: ProviderResult[] } {
  const interpretedAs = !query.tradeIds?.length && query.text ? classifyRequest(query.text) : [];
  const wanted = new Set(query.tradeIds?.length ? query.tradeIds : interpretedAs.map((m) => m.tradeId));

  const results: ProviderResult[] = [];
  for (const p of providers) {
    const d = distanceKm(query.location, p.home);
    if (d > p.serviceRadiusKm) continue;
    const matched = p.trades.filter((t) => wanted.has(t));
    if (wanted.size && !matched.length) continue;
    if (query.availableNow && !p.availableNow) continue;
    if (query.minTier && (!p.trustTier || tierRank(p.trustTier) < tierRank(query.minTier))) continue;

    const reasons: string[] = [];
    if (matched.length) reasons.push(`Offers ${matched.map((t) => getTrade(t)?.name ?? t).join(', ')}`);
    const verifiedCount = Object.values(p.verified).filter(Boolean).length;
    if (p.verified.backgroundCheck) reasons.push('Background checked');
    if (p.verified.insurance) reasons.push('Insured');
    if (p.availableNow) reasons.push('Available now');
    if (p.rating !== null) reasons.push(`${p.rating.toFixed(1)}★ (${p.reviewCount})`);

    const score =
      (p.trustScore ?? 40) * 0.3 + // 0–30
      (p.rating === null ? 10 : ((p.rating - 1) / 4) * 25) + // 0–25
      (1 - d / Math.max(1, p.serviceRadiusKm)) * 20 + // 0–20
      (p.availableNow ? (query.availableNow ? 15 : 8) : 0) + // 0–15
      (verifiedCount / 4) * 10; // 0–10
    results.push({ provider: p, score: Math.round(score * 10) / 10, distanceKm: Math.round(d * 10) / 10, reasons });
  }
  results.sort((a, b) => b.score - a.score);
  return { interpretedAs, results: results.slice(0, query.limit ?? 20) };
}

/** Can this provider see and quote on this request? */
export function requestVisibleTo(req: ServiceRequest, provider: ProviderProfile): boolean {
  if (req.status !== 'open') return false;
  if (req.invitedProviderIds.includes(provider.id)) return true;
  return !!req.tradeId && provider.trades.includes(req.tradeId) && distanceKm(req.location, provider.home) <= provider.serviceRadiusKm;
}

const URGENCY: Record<RequestTiming, Urgency> = { asap: 'immediate', this_week: 'scheduled', scheduled: 'scheduled', flexible: 'long_term' };

/** An accepted quote becomes a regular job, so escrow, reviews and records all apply. */
export function requestToOpportunity(req: ServiceRequest, quote: Quote, now = new Date()): Opportunity {
  const service = req.serviceId ? getService(req.serviceId) : undefined;
  return {
    id: `req_${req.id}`,
    source: { connectorId: 'polymathic', externalId: req.id, fetchedAt: now.toISOString() },
    title: req.title,
    description: req.description,
    category: req.tradeId ?? service?.tradeId ?? 'handyman',
    serviceId: req.serviceId ?? undefined,
    engagement: 'gig',
    urgency: URGENCY[req.timing],
    location: req.location,
    remote: false,
    startsAt: req.preferredDate,
    compensation: { kind: 'fixed', amount: quote.amount, currency: 'USD' },
    requiredSkills: [],
    requiredCertifications: [],
    requiredEquipment: [],
    minTrustTier: 'new',
    requiresBackgroundCheck: false,
    headcount: 1,
    postedBy: req.customerId,
  };
}
