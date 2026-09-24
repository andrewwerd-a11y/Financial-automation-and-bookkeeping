import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT,
  TRADES,
  TransitionError,
  ReviewError,
  allowedTransitions,
  autoApproveIfDue,
  buildResume,
  entryOptions,
  equipmentReport,
  escrowState,
  getEquipment,
  isVisible,
  marketSnapshot,
  payoutBreakdown,
  reputation,
  resumeToMarkdown,
  transition,
  validateReview,
  type Engagement,
  type Review,
} from '../src/index.js';
import { seedData } from '../../../apps/api/src/seed.js';

const NOW = new Date('2026-09-23T12:00:00Z');
const { workers, opportunities } = seedData(NOW);
const alex = workers.find((w) => w.id === 'w_alex')!;
const maria = workers.find((w) => w.id === 'w_maria')!;

describe('trade taxonomy', () => {
  it('covers many trades across every tier with unique ids', () => {
    expect(TRADES.length).toBeGreaterThanOrEqual(75);
    expect(new Set(TRADES.map((t) => t.id)).size).toBe(TRADES.length);
    for (const tier of ['low', 'medium', 'high'] as const) expect(TRADES.filter((t) => t.tier === tier).length).toBeGreaterThan(10);
  });

  it('only references equipment that exists in the equipment catalog', () => {
    const missing = TRADES.flatMap((t) => t.equipment).filter((id) => !getEquipment(id));
    expect(missing).toEqual([]);
  });

  it('uses taxonomy ids for every demo job', () => {
    const ids = new Set(TRADES.map((t) => t.id));
    expect(opportunities.filter((o) => !ids.has(o.category)).map((o) => o.category)).toEqual([]);
  });
});

describe('equipment', () => {
  it('turns owned gear into sellable trades and service ideas', () => {
    const r = equipmentReport(alex, opportunities);
    expect(r.equippedFor.map((x) => x.trade.id)).toContain('handyman');
    expect(r.serviceIdeas.find((s) => s.equipmentId === 'pickup-truck')?.ideas).toContain('Junk removal');
  });

  it('ranks purchases by the work they unlock and estimates payback', () => {
    const r = equipmentReport(alex, opportunities);
    const washer = r.investments.find((i) => i.equipment.id === 'pressure-washer')!;
    expect(washer.unlocksJobs).toBe(1);
    expect(washer.paybackJobs).toBeGreaterThan(0);
    expect(r.investments[0]!.unlockedValue).toBeGreaterThanOrEqual(r.investments.at(-1)!.unlockedValue);
    expect(r.investments.some((i) => i.equipment.id === 'power-tools')).toBe(false); // already owned
  });

  it('has sane cost ranges', () => {
    for (const e of EQUIPMENT) expect(e.costUsd[0]).toBeLessThanOrEqual(e.costUsd[1]);
  });
});

describe('market gaps', () => {
  const snap = marketSnapshot(opportunities, workers);

  it('flags trades with no qualified workers as severe', () => {
    const cna = snap.byTrade.find((g) => g.tradeId === 'cna')!;
    expect(cna.qualifiedWorkers).toBe(0);
    expect(cna.level).toBe('severe');
    expect(cna.pathways.length).toBeGreaterThan(0);
  });

  it('counts crew seats, not just postings', () => {
    const event = snap.byTrade.find((g) => g.tradeId === 'event-staffing')!;
    expect(event.seatsOpen).toBe(6);
    expect(event.qualifiedWorkers).toBe(1);
    expect(event.level).toBe('undersupplied');
  });

  it('rolls up by skill tier', () => {
    expect(snap.byTier.low.openJobs + snap.byTier.medium.openJobs + snap.byTier.high.openJobs + snap.byTier.unknown.openJobs).toBe(opportunities.length);
  });

  it('shows a worker the closest way into a gap trade', () => {
    const options = entryOptions(maria, opportunities, snap);
    const cna = options.find((o) => o.gap.tradeId === 'cna')!;
    expect(cna.steps).toEqual(['Requires cna-certification']);
  });
});

describe('engagements & escrow', () => {
  const base: Engagement = {
    id: 'e1',
    opportunityId: 'pm_drywall',
    clientId: 'org_greenleaf',
    workerIds: ['w_alex'],
    status: 'offered',
    amount: 608,
    currency: 'USD',
    platformFeePct: 10,
    createdAt: NOW.toISOString(),
    history: [],
  };

  it('will not let work start before the client funds escrow', () => {
    const accepted = transition(base, 'accepted', 'worker', NOW);
    expect(() => transition(accepted, 'in_progress', 'worker', NOW)).toThrow(TransitionError);
    const funded = transition(accepted, 'funded', 'client', NOW);
    expect(escrowState(funded.status)).toBe('held');
    expect(transition(funded, 'in_progress', 'worker', NOW).status).toBe('in_progress');
  });

  it('enforces who may make each move', () => {
    expect(() => transition(base, 'accepted', 'client', NOW)).toThrow(/client cannot/);
    expect(allowedTransitions('submitted', 'client').sort()).toEqual(['approved', 'disputed']);
  });

  it('auto-approves when a client goes silent after delivery', () => {
    let e = base;
    for (const [to, by] of [['accepted', 'worker'], ['funded', 'client'], ['in_progress', 'worker'], ['submitted', 'worker']] as const) e = transition(e, to, by, NOW);
    expect(autoApproveIfDue(e, new Date(NOW.getTime() + 2 * 86_400_000)).status).toBe('submitted');
    const later = autoApproveIfDue(e, new Date(NOW.getTime() + 3 * 86_400_000));
    expect(later.status).toBe('approved');
    expect(later.history.at(-1)!.by).toBe('platform');
  });

  it('splits crew payouts to the cent', () => {
    const p = payoutBreakdown({ ...base, amount: 100, platformFeePct: 10, workerIds: ['a', 'b', 'c'] });
    expect(p.platformFee).toBe(10);
    expect(p.perWorker.map((w) => w.net)).toEqual([30, 30, 30]);
    const odd = payoutBreakdown({ ...base, amount: 100.01, platformFeePct: 0, workerIds: ['a', 'b', 'c'] });
    expect(odd.perWorker.reduce((s, w) => s + Math.round(w.net * 100), 0)).toBe(10001);
  });
});

describe('two-way reviews', () => {
  const paid: Engagement = {
    id: 'e2',
    opportunityId: 'pm_drywall',
    clientId: 'org_greenleaf',
    workerIds: ['w_alex'],
    status: 'paid',
    amount: 500,
    currency: 'USD',
    platformFeePct: 10,
    createdAt: NOW.toISOString(),
    history: [{ at: NOW.toISOString(), from: 'approved', to: 'paid', by: 'platform' }],
  };
  const workerReview: Review = {
    id: 'r1',
    engagementId: 'e2',
    direction: 'worker_to_client',
    authorId: 'w_alex',
    subjectId: 'org_greenleaf',
    ratings: { paid_on_time: 5, scope_accuracy: 4, communication: 5, site_safety: 5 },
    submittedAt: NOW.toISOString(),
  };
  const clientReview: Review = {
    id: 'r2',
    engagementId: 'e2',
    direction: 'client_to_worker',
    authorId: 'org_greenleaf',
    subjectId: 'w_alex',
    ratings: { quality: 5, timeliness: 5, communication: 4, professionalism: 5 },
    submittedAt: NOW.toISOString(),
  };

  it('lets workers rate the businesses they work for', () => {
    expect(() => validateReview(workerReview, paid, [])).not.toThrow();
    expect(reputation('org_greenleaf', [workerReview]).criteria.paid_on_time).toBeGreaterThan(4);
  });

  it('rejects reviews from non-parties, before payment, duplicates, and bad ratings', () => {
    expect(() => validateReview({ ...workerReview, authorId: 'w_sam' }, paid, [])).toThrow(ReviewError);
    expect(() => validateReview(workerReview, { ...paid, status: 'in_progress' }, [])).toThrow(/paid/);
    expect(() => validateReview(workerReview, paid, [workerReview])).toThrow(/Already/);
    expect(() => validateReview({ ...workerReview, ratings: { ...workerReview.ratings, site_safety: 9 } }, paid, [])).toThrow(/1–5/);
    expect(() => validateReview({ ...workerReview, ratings: { ...workerReview.ratings, vibes: 5 } }, paid, [])).toThrow(/Unknown/);
  });

  it('keeps reviews blind until both sides submit or the window closes', () => {
    expect(isVisible(workerReview, paid, [workerReview], NOW)).toBe(false);
    expect(isVisible(workerReview, paid, [workerReview, clientReview], NOW)).toBe(true);
    expect(isVisible(workerReview, paid, [workerReview], new Date(NOW.getTime() + 15 * 86_400_000))).toBe(true);
  });
});

describe('resume', () => {
  it('builds an evidence-backed resume', () => {
    const r = buildResume(alex, [
      { title: 'Drywall repair', tradeId: 'painting-drywall', completedAt: '2026-08-01T00:00:00Z' },
      { title: 'Patch job', tradeId: 'painting-drywall', completedAt: '2026-09-01T00:00:00Z' },
    ]);
    expect(r.trustLine).toContain('Background checked');
    expect(r.verifiedSkills).toContain('Drywall (Expert)');
    expect(r.otherSkills).toContain('Hvac (Learning)');
    expect(r.experience[0]).toEqual({ trade: 'Painting & drywall', jobs: 2, latest: '2026-09-01' });
    expect(resumeToMarkdown(r)).toContain('## Verified skills');
  });
});
