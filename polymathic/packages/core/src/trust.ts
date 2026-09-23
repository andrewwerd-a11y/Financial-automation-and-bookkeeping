import { TRUST_TIERS, type TrustTier, type WorkerProfile } from './types.js';

export interface TrustComponent {
  key: string;
  label: string;
  points: number;
  max: number;
}

export interface TrustResult {
  score: number;
  tier: TrustTier;
  components: TrustComponent[];
  /** Concrete actions that would raise the score the most. */
  nextSteps: string[];
}

// Bayesian prior: a new worker is assumed to be a 4.0 until proven otherwise,
// weighted as if they had this many ratings. Stops one 5-star review from
// outranking a hundred 4.9s.
const PRIOR_RATING = 4.0;
const PRIOR_WEIGHT = 10;

const TIER_THRESHOLDS: Record<TrustTier, number> = {
  new: 0,
  verified: 25,
  trusted: 50,
  pro: 70,
  elite: 85,
};

export function tierForScore(score: number): TrustTier {
  let tier: TrustTier = 'new';
  for (const t of TRUST_TIERS) if (score >= TIER_THRESHOLDS[t]) tier = t;
  return tier;
}

export function tierRank(tier: TrustTier): number {
  return TRUST_TIERS.indexOf(tier);
}

/**
 * Explainable 0–100 trust score. Every point is attributable to a component so
 * workers can see exactly why they're at their tier and what moves them up.
 */
export function computeTrust(worker: WorkerProfile, now = new Date()): TrustResult {
  const { verification: v, history: h } = worker;
  const components: TrustComponent[] = [];
  const nextSteps: string[] = [];

  components.push({ key: 'identity', label: 'Identity verified', points: v.identity ? 15 : 0, max: 15 });
  if (!v.identity) nextSteps.push('Verify your identity (+15)');

  const bgPoints = v.backgroundCheck === 'clear' ? 15 : v.backgroundCheck === 'consider' ? 5 : 0;
  components.push({ key: 'background', label: 'Background check', points: bgPoints, max: 15 });
  if (v.backgroundCheck === 'none') nextSteps.push('Complete a background check (+15)');

  const credPoints = (v.insurance ? 4 : 0) + (v.businessLicense ? 3 : 0) + Math.min(3, verifiedCerts(worker));
  components.push({ key: 'credentials', label: 'Insurance, license & certifications', points: credPoints, max: 10 });
  if (!v.insurance) nextSteps.push('Add proof of liability insurance (+4)');

  // Volume: log-scaled so the first 20 jobs matter far more than jobs 200–220.
  const volumePoints = Math.min(20, Math.round(Math.log10(h.completedJobs + 1) * 10));
  components.push({ key: 'volume', label: 'Completed jobs', points: volumePoints, max: 20 });

  const ratingPoints =
    h.averageRating === null ? 0 : Math.round(((bayesianRating(h.averageRating, h.ratingCount) - 1) / 4) * 20);
  components.push({ key: 'rating', label: 'Ratings (confidence-weighted)', points: ratingPoints, max: 20 });
  if (h.completedJobs < 10) nextSteps.push('Connect your existing gig accounts to import your track record');

  const reliabilityPoints = h.onTimeRate === null ? 0 : Math.round(h.onTimeRate * 10);
  components.push({ key: 'reliability', label: 'On-time rate', points: reliabilityPoints, max: 10 });

  const tenureYears = h.firstJobAt ? (now.getTime() - Date.parse(h.firstJobAt)) / (365.25 * 86_400_000) : 0;
  components.push({ key: 'tenure', label: 'Tenure', points: Math.min(10, Math.floor(tenureYears * 2)), max: 10 });

  const penalty = h.disputesLost * 8 + Math.max(0, h.cancellations - Math.floor(h.completedJobs / 20)) * 2;
  if (penalty > 0) components.push({ key: 'penalties', label: 'Disputes & cancellations', points: -penalty, max: 0 });

  const raw = components.reduce((sum, c) => sum + c.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  return { score, tier: tierForScore(score), components, nextSteps };
}

export function bayesianRating(avg: number, count: number): number {
  return (PRIOR_RATING * PRIOR_WEIGHT + avg * count) / (PRIOR_WEIGHT + count);
}

function verifiedCerts(worker: WorkerProfile): number {
  return worker.certifications.filter((c) => c.verified).length;
}
