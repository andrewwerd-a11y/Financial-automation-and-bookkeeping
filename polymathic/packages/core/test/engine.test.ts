import { describe, expect, it } from 'vitest';
import { bayesianRating, computeTrust, estimatePay, growthPlan, matchOpportunity, rankOpportunities, tierForScore } from '../src/index.js';
import { seedData } from '../../../apps/api/src/seed.js';

const NOW = new Date('2026-09-23T12:00:00Z');
const { workers, opportunities } = seedData(NOW);
const alex = workers.find((w) => w.id === 'w_alex')!;
const sam = workers.find((w) => w.id === 'w_sam')!;
const opp = (id: string) => opportunities.find((o) => o.id === id)!;

describe('trust', () => {
  it('scores an established, verified worker at pro tier with an explainable breakdown', () => {
    const t = computeTrust(alex, NOW);
    expect(t.tier).toBe('pro');
    expect(t.components.reduce((s, c) => s + c.points, 0)).toBe(t.score);
    expect(t.nextSteps).toContain('Add proof of liability insurance (+4)');
  });

  it('does not let a couple of 5-star reviews outrank a long track record', () => {
    expect(bayesianRating(5, 2)).toBeLessThan(bayesianRating(4.85, 118));
  });

  it('maps score thresholds to tiers', () => {
    expect(tierForScore(0)).toBe('new');
    expect(tierForScore(25)).toBe('verified');
    expect(tierForScore(85)).toBe('elite');
  });

  it('penalizes lost disputes', () => {
    const clean = computeTrust(alex, NOW).score;
    const disputed = computeTrust({ ...alex, history: { ...alex.history, disputesLost: 2 } }, NOW).score;
    expect(clean - disputed).toBe(16);
  });
});

describe('pay comparison', () => {
  it('turns a fixed-price job into an effective hourly after travel', () => {
    const p = estimatePay(opp('pm_assembly_now'), alex);
    expect(p.grossHourly).toBe(60);
    expect(p.roundTripKm).toBeGreaterThan(0);
    expect(p.roundTripKm).toBeLessThan(1);
    expect(p.effectiveHourly!).toBeLessThan(60);
    expect(p.effectiveHourly!).toBeGreaterThan(59);
  });

  it('counts drive time and vehicle cost against distant jobs', () => {
    const p = estimatePay(opp('pm_drywall'), alex);
    expect(p.roundTripKm).toBeGreaterThan(50);
    expect(p.effectiveHourly!).toBeLessThan(p.netHourly!);
  });

  it('applies platform fees', () => {
    const withFee = { ...opp('pm_drywall'), remote: true, location: undefined, compensation: { kind: 'hourly' as const, amount: 40, currency: 'USD' as const, platformFeePct: 20 } };
    expect(estimatePay(withFee, alex).netHourly).toBe(32);
  });
});

describe('matching', () => {
  it('explains exactly why a job is blocked', () => {
    const m = matchOpportunity(alex, opp('pm_hvac_helper'));
    expect(m.eligible).toBe(false);
    expect(m.blockers).toEqual([expect.objectContaining({ kind: 'certification', ref: 'epa-608', unlockable: true })]);
  });

  it('blocks immediate jobs when the worker is not available now', () => {
    const busy = { ...alex, availability: { ...alex.availability, availableNow: false } };
    expect(matchOpportunity(busy, opp('pm_assembly_now')).blockers.map((b) => b.kind)).toContain('availability');
  });

  it('enforces trust tier and background check gates', () => {
    const m = matchOpportunity(sam, opp('pm_property_maint'));
    const kinds = m.blockers.map((b) => b.kind);
    expect(kinds).toContain('trust_tier');
    expect(kinds).toContain('background_check');
  });

  it('ranks eligible jobs first, best score first', () => {
    const ranked = rankOpportunities(alex, opportunities, { includeIneligible: true });
    const firstIneligible = ranked.findIndex((r) => !r.eligible);
    expect(ranked.slice(0, firstIneligible).every((r) => r.eligible)).toBe(true);
    for (let i = 1; i < firstIneligible; i++) expect(ranked[i - 1]!.score).toBeGreaterThanOrEqual(ranked[i]!.score);
    expect(ranked.map((r) => r.opportunity.id)).toContain('pm_property_maint');
  });

  it('matches remote work for remote-ok workers only', () => {
    expect(matchOpportunity(sam, opp('pm_remote_books')).eligible).toBe(true);
    expect(matchOpportunity(alex, opp('pm_remote_books')).eligible).toBe(false);
  });
});

describe('growth plan', () => {
  it('ranks the certification and equipment that unlock real work', () => {
    const plan = growthPlan(alex, opportunities);
    expect(plan.map((s) => s.ref)).toEqual(expect.arrayContaining(['epa-608', 'box-truck']));
    const epa = plan.find((s) => s.ref === 'epa-608')!;
    expect(epa.unlocksNow).toBe(1);
    expect(epa.unlockedValue).toBeGreaterThan(0);
  });

  it('ignores jobs that are blocked for reasons a certificate cannot fix', () => {
    const plan = growthPlan(alex, opportunities);
    // San Antonio job is out of range; bookkeeping job is remote and Alex is not remote-ok.
    expect(plan.find((s) => s.ref === 'bookkeeping')).toBeUndefined();
  });
});
