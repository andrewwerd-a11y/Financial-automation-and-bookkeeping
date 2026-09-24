import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  EQUIPMENT,
  TRADES,
  ReviewError,
  TransitionError,
  allowedTransitions,
  autoApproveIfDue,
  buildResume,
  computeTrust,
  entryOptions,
  equipmentReport,
  escrowState,
  getEquipment,
  getTrade,
  isVisible,
  marketSnapshot,
  matchOpportunity,
  payoutBreakdown,
  reputation,
  resumeToMarkdown,
  transition,
  validateReview,
  CRITERIA,
  type Actor,
  type Engagement,
  type EngagementStatus,
  type Opportunity,
  type Organization,
  type Review,
  type ReviewDirection,
} from '@polymathic/core';
import { requireUser } from '../auth.js';
import { JOB_BODY_SCHEMA, type JobInput } from '../jobs.js';
import type { MemoryStore } from '../store.js';

export interface BusinessDeps {
  store: MemoryStore;
  now: () => Date;
  /** Every opportunity in the market (native + connected sources). */
  market: () => Promise<Opportunity[]>;
}

const POSTING_ROLES = ['owner', 'admin', 'dispatcher', 'lead'];
const DEFAULT_PLATFORM_FEE_PCT = 10;

export function businessRoutes(app: FastifyInstance, { store, now, market }: BusinessDeps) {
  const workers = () => [...store.workers.values()];

  // --- Trades, equipment, market -------------------------------------------------

  app.get<{ Querystring: { tier?: string; sector?: string } }>('/trades', async (req) => ({
    trades: TRADES.filter((t) => (!req.query.tier || t.tier === req.query.tier) && (!req.query.sector || t.sector === req.query.sector)),
  }));

  app.get<{ Params: { id: string } }>('/trades/:id', async (req, reply) => {
    const trade = getTrade(req.params.id);
    if (!trade) return reply.code(404).send({ error: 'unknown trade' });
    const gap = marketSnapshot(await market(), workers()).byTrade.find((g) => g.tradeId === trade.id) ?? null;
    return { trade, equipment: trade.equipment.map((id) => getEquipment(id)), market: gap };
  });

  app.get('/equipment', async () => ({ equipment: EQUIPMENT }));

  app.get('/market/gaps', async () => marketSnapshot(await market(), workers()));

  app.get<{ Params: { id: string } }>('/workers/:id/equipment', async (req, reply) => {
    const worker = store.workers.get(req.params.id);
    if (!worker) return reply.code(404).send({ error: 'worker not found' });
    return equipmentReport(worker, await market());
  });

  app.get<{ Params: { id: string } }>('/workers/:id/entry-options', async (req, reply) => {
    const worker = store.workers.get(req.params.id);
    if (!worker) return reply.code(404).send({ error: 'worker not found' });
    const opps = await market();
    return { options: entryOptions(worker, opps, marketSnapshot(opps, workers())) };
  });

  app.get<{ Params: { id: string }; Querystring: { format?: string } }>('/workers/:id/resume', async (req, reply) => {
    const worker = store.workers.get(req.params.id);
    if (!worker) return reply.code(404).send({ error: 'worker not found' });
    const resume = buildResume(worker, store.completedJobs.get(worker.id) ?? [], visibleReviews());
    if (req.query.format === 'md') return reply.type('text/markdown; charset=utf-8').send(resumeToMarkdown(resume));
    return resume;
  });

  // --- Organizations: businesses and crews ---------------------------------------

  app.post<{ Body: Pick<Organization, 'name' | 'kind' | 'home' | 'trades'> }>(
    '/orgs',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'kind', 'home'],
          properties: {
            name: { type: 'string', minLength: 2 },
            kind: { enum: ['business', 'crew'] },
            home: { type: 'object', required: ['lat', 'lng', 'region'] },
            trades: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const user = requireUser(req, reply);
      if (!user) return;
      const org: Organization = {
        ...req.body,
        id: `org_${randomUUID()}`,
        members: [{ userId: user, role: req.body.kind === 'crew' ? 'lead' : 'owner' }],
        verification: { businessLicense: false, insurance: false, taxIdVerified: false },
      };
      store.organizations.set(org.id, org);
      return reply.code(201).send(org);
    },
  );

  app.get<{ Params: { id: string } }>('/orgs/:id', async (req, reply) => {
    const org = store.organizations.get(req.params.id);
    if (!org) return reply.code(404).send({ error: 'organization not found' });
    return {
      org,
      reputation: reputation(org.id, visibleReviews()),
      openJobs: store.listOpportunities().filter((o) => o.postedBy === org.id),
    };
  });

  app.post<{ Params: { id: string }; Body: JobInput }>('/orgs/:id/jobs', { schema: { body: JOB_BODY_SCHEMA } }, async (req, reply) => {
    const user = requireUser(req, reply);
    if (!user) return;
    const org = store.organizations.get(req.params.id);
    if (!org) return reply.code(404).send({ error: 'organization not found' });
    if (!store.actsFor(user, org.id, POSTING_ROLES)) return reply.code(403).send({ error: 'not allowed to post for this organization' });
    const id = `pm_${randomUUID()}`;
    const job: Opportunity = {
      requiredCertifications: [],
      requiredEquipment: [],
      minTrustTier: 'new',
      requiresBackgroundCheck: false,
      headcount: 1,
      ...req.body,
      id,
      postedBy: org.id,
      source: { connectorId: 'polymathic', externalId: id, fetchedAt: now().toISOString() },
    };
    store.opportunities.set(id, job);
    return reply.code(201).send({ job, supply: candidates(job).summary });
  });

  // Put the job in front of the people who can do it.
  app.get<{ Params: { id: string; jobId: string } }>('/orgs/:id/jobs/:jobId/candidates', async (req, reply) => {
    const user = requireUser(req, reply);
    if (!user) return;
    if (!store.actsFor(user, req.params.id)) return reply.code(403).send({ error: 'not a member of this organization' });
    const job = store.opportunities.get(req.params.jobId);
    if (!job || job.postedBy !== req.params.id) return reply.code(404).send({ error: 'job not found' });
    return candidates(job);
  });

  function candidates(job: Opportunity) {
    const ranked = workers()
      .map((w) => {
        const trust = computeTrust(w, now());
        const m = matchOpportunity(w, job, trust);
        return {
          workerId: w.id,
          displayName: w.displayName,
          trustTier: trust.tier,
          eligible: m.eligible,
          score: m.score,
          distanceKm: m.distanceKm,
          blockers: m.blockers.map((b) => b.detail),
        };
      })
      .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
    const qualified = ranked.filter((c) => c.eligible).length;
    return {
      summary: { qualified, seatsNeeded: job.headcount, almostQualified: ranked.filter((c) => !c.eligible && c.blockers.length === 1).length },
      candidates: ranked,
    };
  }

  // --- Engagements: offer → escrow → work → approval → payout --------------------

  app.post<{ Body: { opportunityId: string; workerIds: string[]; amount: number } }>(
    '/engagements',
    {
      schema: {
        body: {
          type: 'object',
          required: ['opportunityId', 'workerIds', 'amount'],
          properties: {
            opportunityId: { type: 'string' },
            workerIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
            amount: { type: 'number', exclusiveMinimum: 0 },
          },
        },
      },
    },
    async (req, reply) => {
      const user = requireUser(req, reply);
      if (!user) return;
      const job = store.opportunities.get(req.body.opportunityId);
      if (!job) return reply.code(404).send({ error: 'job not found' });
      const clientId = job.postedBy ?? user;
      if (!store.actsFor(user, clientId, job.postedBy ? POSTING_ROLES : undefined)) {
        return reply.code(403).send({ error: 'only the posting organization can make offers' });
      }
      if (req.body.workerIds.some((id) => !store.workers.has(id))) return reply.code(400).send({ error: 'unknown worker' });
      const eng: Engagement = {
        id: `eng_${randomUUID()}`,
        opportunityId: job.id,
        clientId,
        workerIds: req.body.workerIds,
        status: 'offered',
        amount: req.body.amount,
        currency: job.compensation?.currency ?? 'USD',
        platformFeePct: DEFAULT_PLATFORM_FEE_PCT,
        createdAt: now().toISOString(),
        history: [],
      };
      store.engagements.set(eng.id, eng);
      return reply.code(201).send(view(eng));
    },
  );

  app.get<{ Params: { id: string } }>('/engagements/:id', async (req, reply) => {
    const user = requireUser(req, reply);
    if (!user) return;
    const eng = loadEngagement(req.params.id);
    if (!eng) return reply.code(404).send({ error: 'engagement not found' });
    if (!actorFor(user, eng)) return reply.code(403).send({ error: 'not a party to this engagement' });
    return view(eng);
  });

  app.post<{ Params: { id: string }; Body: { to: EngagementStatus; note?: string } }>(
    '/engagements/:id/transition',
    { schema: { body: { type: 'object', required: ['to'], properties: { to: { type: 'string' }, note: { type: 'string', maxLength: 1000 } } } } },
    async (req, reply) => {
      const user = requireUser(req, reply);
      if (!user) return;
      const eng = loadEngagement(req.params.id);
      if (!eng) return reply.code(404).send({ error: 'engagement not found' });
      const actor = actorFor(user, eng);
      if (!actor) return reply.code(403).send({ error: 'not a party to this engagement' });
      try {
        let next = transition(eng, req.body.to, actor, now(), req.body.note);
        // Stand-in for the payment processor: release escrow as soon as work is approved.
        if (next.status === 'approved') next = transition(next, 'paid', 'platform', now(), 'Escrow released');
        if (next.status === 'paid') recordCompletion(next);
        store.engagements.set(next.id, next);
        return view(next);
      } catch (err) {
        if (err instanceof TransitionError) return reply.code(409).send({ error: err.message, allowed: allowedTransitions(eng.status, actor) });
        throw err;
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { ratings: Record<string, number>; comment?: string } }>(
    '/engagements/:id/reviews',
    { schema: { body: { type: 'object', required: ['ratings'], properties: { ratings: { type: 'object' }, comment: { type: 'string', maxLength: 2000 } } } } },
    async (req, reply) => {
      const user = requireUser(req, reply);
      if (!user) return;
      const eng = loadEngagement(req.params.id);
      if (!eng) return reply.code(404).send({ error: 'engagement not found' });
      const actor = actorFor(user, eng);
      if (!actor || actor === 'platform') return reply.code(403).send({ error: 'not a party to this engagement' });
      const direction: ReviewDirection = actor === 'worker' ? 'worker_to_client' : 'client_to_worker';
      const reviews: Pick<Review, 'subjectId' | 'authorId'>[] =
        direction === 'worker_to_client'
          ? [{ subjectId: eng.clientId, authorId: user }]
          : eng.workerIds.map((w) => ({ subjectId: w, authorId: eng.clientId }));
      const created: Review[] = [];
      try {
        for (const r of reviews) {
          const review: Review = { ...r, id: `rev_${randomUUID()}`, engagementId: eng.id, direction, ratings: req.body.ratings, comment: req.body.comment, submittedAt: now().toISOString() };
          validateReview(review, eng, store.reviews);
          created.push(review);
        }
      } catch (err) {
        if (err instanceof ReviewError) return reply.code(400).send({ error: err.message, criteria: CRITERIA[direction] });
        throw err;
      }
      store.reviews.push(...created);
      return reply.code(201).send({ submitted: created.length, visible: created.every((r) => isVisible(r, eng, store.reviews, now())) });
    },
  );

  app.get<{ Params: { subjectId: string } }>('/reputation/:subjectId', async (req) => reputation(req.params.subjectId, visibleReviews()));

  function loadEngagement(id: string): Engagement | undefined {
    const eng = store.engagements.get(id);
    if (!eng) return undefined;
    const current = autoApproveIfDue(eng, now());
    if (current !== eng) {
      const paid = transition(current, 'paid', 'platform', now(), 'Escrow released');
      recordCompletion(paid);
      store.engagements.set(id, paid);
      return paid;
    }
    return eng;
  }

  function actorFor(user: string, eng: Engagement): Actor | undefined {
    if (eng.workerIds.includes(user)) return 'worker';
    if (store.actsFor(user, eng.clientId)) return 'client';
    return undefined;
  }

  function recordCompletion(eng: Engagement) {
    const job = store.opportunities.get(eng.opportunityId);
    if (!job) return;
    // Every paid job teaches the pricing database what this work costs here.
    if (job.serviceId && job.location) {
      const quantity = [...store.requests.values()].find((r) => r.engagementId === eng.id)?.quantity ?? 1;
      store.priceObservations.push({ serviceId: job.serviceId, unitPrice: eng.amount / quantity, location: { lat: job.location.lat, lng: job.location.lng }, at: now().toISOString(), source: 'paid_job' });
    }
    for (const w of eng.workerIds) {
      const list = store.completedJobs.get(w) ?? [];
      list.push({ title: job.title, tradeId: job.category, completedAt: now().toISOString(), clientName: store.organizations.get(eng.clientId)?.name });
      store.completedJobs.set(w, list);
    }
  }

  const visibleReviews = () => store.visibleReviews(now());


  function view(eng: Engagement) {
    return { engagement: eng, escrow: escrowState(eng.status), payout: payoutBreakdown(eng) };
  }
}
