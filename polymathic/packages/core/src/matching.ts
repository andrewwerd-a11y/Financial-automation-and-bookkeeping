import { distanceKm } from './geo.js';
import { estimatePay, type PayEstimate } from './pay.js';
import { computeTrust, tierRank, type TrustResult } from './trust.js';
import type { Opportunity, WorkerProfile } from './types.js';

export type BlockerKind =
  | 'certification'
  | 'equipment'
  | 'skill'
  | 'trust_tier'
  | 'background_check'
  | 'distance'
  | 'availability'
  | 'pay_floor';

export interface Blocker {
  kind: BlockerKind;
  /** The specific thing missing, e.g. a cert slug or skill slug. */
  ref?: string;
  detail: string;
  /** True if the worker can fix this by earning, acquiring, or verifying something. */
  unlockable: boolean;
}

export interface ScoreBreakdown {
  skillFit: number;
  pay: number;
  proximity: number;
  timing: number;
  growth: number;
}

export interface MatchResult {
  opportunity: Opportunity;
  eligible: boolean;
  /** 0–100. Only meaningful for ranking; ineligible matches still get one so "almost" jobs can be shown. */
  score: number;
  breakdown: ScoreBreakdown;
  blockers: Blocker[];
  pay: PayEstimate;
  distanceKm: number | null;
}

const WEIGHTS: ScoreBreakdown = { skillFit: 35, pay: 25, proximity: 15, timing: 15, growth: 10 };
/** Baseline used to score pay when the worker hasn't set a floor. */
const DEFAULT_TARGET_HOURLY = 30;

export function matchOpportunity(
  worker: WorkerProfile,
  opp: Opportunity,
  trust: TrustResult = computeTrust(worker),
): MatchResult {
  const blockers: Blocker[] = [];
  const skillsById = new Map(worker.skills.map((s) => [s.id, s]));
  const certIds = new Set(worker.certifications.filter((c) => !isExpired(c.expiresAt)).map((c) => c.id));
  const equipmentIds = new Set(worker.equipment.map((e) => e.id));

  for (const cert of opp.requiredCertifications) {
    if (!certIds.has(cert)) blockers.push({ kind: 'certification', ref: cert, detail: `Requires ${cert}`, unlockable: true });
  }
  for (const eq of opp.requiredEquipment) {
    if (!equipmentIds.has(eq)) blockers.push({ kind: 'equipment', ref: eq, detail: `Requires ${eq}`, unlockable: true });
  }

  let skillFitSum = 0;
  for (const req of opp.requiredSkills) {
    const have = skillsById.get(req.id);
    const level = have?.level ?? 0;
    if (level < req.minLevel) {
      blockers.push({
        kind: 'skill',
        ref: req.id,
        detail: have ? `${req.id} level ${level}/${req.minLevel}` : `Needs ${req.id} (level ${req.minLevel})`,
        unlockable: true,
      });
    }
    // Exceeding the requirement helps a little; verified evidence helps a little more.
    const ratio = Math.min(1.2, level / req.minLevel);
    const evidenceBonus = have && have.evidence !== 'self_reported' ? 0.05 : 0;
    skillFitSum += Math.min(1, ratio / 1.2 + evidenceBonus);
  }
  const skillFit = opp.requiredSkills.length ? skillFitSum / opp.requiredSkills.length : 0.7;

  if (tierRank(trust.tier) < tierRank(opp.minTrustTier)) {
    blockers.push({
      kind: 'trust_tier',
      ref: opp.minTrustTier,
      detail: `Requires ${opp.minTrustTier} tier (you are ${trust.tier})`,
      unlockable: true,
    });
  }
  if (opp.requiresBackgroundCheck && worker.verification.backgroundCheck !== 'clear') {
    blockers.push({ kind: 'background_check', detail: 'Requires a clear background check', unlockable: true });
  }

  const dist = opp.remote || !opp.location ? null : distanceKm(worker.home, opp.location);
  if (opp.remote && !worker.availability.remoteOk) {
    blockers.push({ kind: 'distance', detail: 'Remote work not enabled in your preferences', unlockable: false });
  }
  if (dist !== null && dist > worker.availability.maxTravelKm) {
    blockers.push({
      kind: 'distance',
      detail: `${Math.round(dist)} km away (your limit is ${worker.availability.maxTravelKm} km)`,
      unlockable: false,
    });
  }

  const timing = timingFit(worker, opp);
  if (timing === 0) {
    blockers.push({ kind: 'availability', detail: 'Outside your availability', unlockable: false });
  }

  const pay = estimatePay(opp, worker);
  if (worker.minHourlyRate && pay.effectiveHourly !== null && pay.effectiveHourly < worker.minHourlyRate) {
    blockers.push({
      kind: 'pay_floor',
      detail: `Effective $${pay.effectiveHourly}/hr is below your $${worker.minHourlyRate}/hr floor`,
      unlockable: false,
    });
  }

  const target = (worker.minHourlyRate ?? DEFAULT_TARGET_HOURLY) * 1.5;
  const payFit = pay.effectiveHourly === null ? 0.4 : clamp01(pay.effectiveHourly / target);
  const proximity = dist === null ? 1 : clamp01(1 - dist / Math.max(1, worker.availability.maxTravelKm));
  const growth = worker.growthInterests?.includes(opp.category) ? 1 : 0;

  const breakdown: ScoreBreakdown = {
    skillFit: round1(skillFit * WEIGHTS.skillFit),
    pay: round1(payFit * WEIGHTS.pay),
    proximity: round1(proximity * WEIGHTS.proximity),
    timing: round1(timing * WEIGHTS.timing),
    growth: round1(growth * WEIGHTS.growth),
  };
  const score = round1(Object.values(breakdown).reduce((a, b) => a + b, 0));

  return { opportunity: opp, eligible: blockers.length === 0, score, breakdown, blockers, pay, distanceKm: dist === null ? null : round1(dist) };
}

export interface RankOptions {
  /** Include jobs the worker can't take yet (useful for "almost qualified" views). */
  includeIneligible?: boolean;
  limit?: number;
}

export function rankOpportunities(worker: WorkerProfile, opps: Opportunity[], options: RankOptions = {}): MatchResult[] {
  const trust = computeTrust(worker);
  const results = opps
    .map((o) => matchOpportunity(worker, o, trust))
    .filter((r) => options.includeIneligible || r.eligible)
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
  return options.limit ? results.slice(0, options.limit) : results;
}

/** 0 means the worker can't do it; 1 means perfect timing. */
function timingFit(worker: WorkerProfile, opp: Opportunity): number {
  const { availability } = worker;
  if (opp.urgency === 'immediate') return availability.availableNow ? 1 : 0;
  if (opp.urgency === 'long_term' || !opp.startsAt) return 0.7;
  const start = Date.parse(opp.startsAt);
  const end = start + (opp.estimatedHours ?? 1) * 3_600_000;
  const fits = availability.windows.some((w) => Date.parse(w.start) <= start && Date.parse(w.end) >= end);
  return fits ? 0.9 : 0;
}

function isExpired(expiresAt: string | undefined): boolean {
  return expiresAt !== undefined && Date.parse(expiresAt) < Date.now();
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
