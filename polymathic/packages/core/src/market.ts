import { matchOpportunity } from './matching.js';
import { computeTrust } from './trust.js';
import { getTrade, type SkillTier } from './trades.js';
import type { Opportunity, WorkerProfile } from './types.js';

export type GapLevel = 'severe' | 'undersupplied' | 'balanced' | 'saturated';

export interface TradeGap {
  tradeId: string;
  tradeName: string;
  tier: SkillTier | 'unknown';
  openJobs: number;
  /** Total people needed (crew jobs count per head). */
  seatsOpen: number;
  urgentJobs: number;
  totalValue: number;
  medianHourly: number | null;
  /** Workers in the pool eligible for at least one of these jobs today. */
  qualifiedWorkers: number;
  /** Seats per qualified worker; higher = bigger gap. */
  gapRatio: number;
  level: GapLevel;
  /** Ways into this trade, from the taxonomy. */
  pathways: string[];
}

export interface MarketSnapshot {
  byTrade: TradeGap[];
  byTier: Record<SkillTier | 'unknown', { openJobs: number; seatsOpen: number; qualifiedWorkers: number; gapRatio: number }>;
}

/**
 * Demand and gap identifier: where is there more work than qualified people,
 * split by trade and by skill tier (low / medium / high)?
 */
export function marketSnapshot(opps: Opportunity[], workers: WorkerProfile[]): MarketSnapshot {
  const trusts = new Map(workers.map((w) => [w.id, computeTrust(w)]));
  const groups = new Map<string, Opportunity[]>();
  for (const o of opps) groups.set(o.category, [...(groups.get(o.category) ?? []), o]);

  const byTrade: TradeGap[] = [];
  for (const [tradeId, jobs] of groups) {
    const trade = getTrade(tradeId);
    const qualified = workers.filter((w) => jobs.some((j) => matchOpportunity(w, j, trusts.get(w.id)).eligible)).length;
    const seatsOpen = jobs.reduce((s, j) => s + j.headcount, 0);
    const gapRatio = round2(seatsOpen / Math.max(1, qualified));
    byTrade.push({
      tradeId,
      tradeName: trade?.name ?? tradeId,
      tier: trade?.tier ?? 'unknown',
      openJobs: jobs.length,
      seatsOpen,
      urgentJobs: jobs.filter((j) => j.urgency === 'immediate').length,
      totalValue: Math.round(jobs.reduce((s, j) => s + jobValue(j) * j.headcount, 0)),
      medianHourly: median(jobs.map(hourlyRate).filter((r): r is number => r !== null)),
      qualifiedWorkers: qualified,
      gapRatio,
      level: qualified === 0 ? 'severe' : gapRatio >= 2 ? 'undersupplied' : gapRatio >= 0.5 ? 'balanced' : 'saturated',
      pathways: trade?.pathways ?? [],
    });
  }
  // Trades nobody can staff come first, then by how stretched supply is.
  const severity: Record<GapLevel, number> = { severe: 3, undersupplied: 2, balanced: 1, saturated: 0 };
  byTrade.sort((a, b) => severity[b.level] - severity[a.level] || b.gapRatio - a.gapRatio || b.totalValue - a.totalValue);

  const byTier = {} as MarketSnapshot['byTier'];
  for (const tier of ['low', 'medium', 'high', 'unknown'] as const) {
    const rows = byTrade.filter((r) => r.tier === tier);
    const seatsOpen = rows.reduce((s, r) => s + r.seatsOpen, 0);
    const qualifiedWorkers = rows.reduce((s, r) => s + r.qualifiedWorkers, 0);
    byTier[tier] = {
      openJobs: rows.reduce((s, r) => s + r.openJobs, 0),
      seatsOpen,
      qualifiedWorkers,
      gapRatio: round2(seatsOpen / Math.max(1, qualifiedWorkers)),
    };
  }
  return { byTrade, byTier };
}

export interface EntryOption {
  gap: TradeGap;
  /** Concrete things this worker is missing for jobs in this trade (certs, gear, skills). */
  steps: string[];
  /** Jobs in the trade the worker can already take. */
  readyNow: number;
}

/**
 * For one worker: which under-supplied trades are closest to reach, and what
 * exactly stands in the way. Feeds the growth research assistant.
 */
export function entryOptions(worker: WorkerProfile, opps: Opportunity[], snapshot: MarketSnapshot): EntryOption[] {
  const trust = computeTrust(worker);
  const options: EntryOption[] = [];
  for (const gap of snapshot.byTrade) {
    if (gap.level === 'saturated') continue;
    const jobs = opps.filter((o) => o.category === gap.tradeId);
    const matches = jobs.map((j) => matchOpportunity(worker, j, trust));
    const steps = new Set<string>();
    for (const m of matches) for (const b of m.blockers) if (b.unlockable) steps.add(b.detail);
    options.push({ gap, steps: [...steps], readyNow: matches.filter((m) => m.eligible).length });
  }
  // Closest first: fewest steps, then biggest gap.
  return options.sort((a, b) => a.steps.length - b.steps.length || b.gap.gapRatio - a.gap.gapRatio);
}

/** Rough value of one seat on a job, for sizing demand. */
export function jobValue(o: Opportunity): number {
  const c = o.compensation;
  if (!c) return 0;
  switch (c.kind) {
    case 'hourly':
      return c.amount * (o.estimatedHours ?? 8);
    case 'fixed':
      return c.amount;
    case 'salary_annual':
      return c.amount / 12;
  }
}

function hourlyRate(o: Opportunity): number | null {
  const c = o.compensation;
  if (!c) return null;
  if (c.kind === 'hourly') return c.amount;
  if (c.kind === 'fixed') return o.estimatedHours ? c.amount / o.estimatedHours : null;
  return c.amount / 2080;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return round2(s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
