import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  SERVICES,
  classifyRequest,
  estimatePrice,
  getService,
  marketPosition,
  orgAsProvider,
  reputation,
  requestToOpportunity,
  requestVisibleTo,
  searchProviders,
  transition,
  workerAsProvider,
  type Engagement,
  type Place,
  type ProviderProfile,
  type Quote,
  type RequestTiming,
  type ServiceRequest,
} from '@polymathic/core';
import { renderSite, renderSitemap, siteService, validateSettings, type SiteSettings } from '@polymathic/sites';
import { requireUser } from '../auth.js';
import type { GuestContact, MemoryStore } from '../store.js';

export interface MarketplaceDeps {
  store: MemoryStore;
  now: () => Date;
  baseUrl: string;
}

const PLACE_SCHEMA = {
  type: 'object',
  required: ['lat', 'lng', 'region'],
  properties: { lat: { type: 'number', minimum: -90, maximum: 90 }, lng: { type: 'number', minimum: -180, maximum: 180 }, region: { type: 'string', maxLength: 120 } },
} as const;

const TIMINGS: RequestTiming[] = ['asap', 'this_week', 'flexible', 'scheduled'];

// Public pages carry user-written text; lock them down so nothing can run.
const SITE_CSP = "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";

const GUEST_LIMIT = 5;
const GUEST_WINDOW_MS = 10 * 60_000;

export function marketplaceRoutes(app: FastifyInstance, { store, now, baseUrl }: MarketplaceDeps) {
  // Guest quote forms are public; cap submissions per IP to blunt spam.
  const guestHits = new Map<string, number[]>();
  const allowGuest = (ip: string) => {
    const t = now().getTime();
    const recent = (guestHits.get(ip) ?? []).filter((x) => t - x < GUEST_WINDOW_MS);
    if (recent.length >= GUEST_LIMIT) return false;
    guestHits.set(ip, [...recent, t]);
    return true;
  };

  // HTML forms post urlencoded bodies; parse them without extra dependencies.
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string', bodyLimit: 16_384 }, (_req, body, done) => {
    done(null, Object.fromEntries(new URLSearchParams(body as string)));
  });

  function providers(): ProviderProfile[] {
    const reviews = store.visibleReviews(now());
    const slugFor = (id: string) => {
      const site = store.sites.get(id);
      return site?.published ? site.slug : undefined;
    };
    return [
      ...[...store.workers.values()].filter((w) => w.offers?.length).map((w) => workerAsProvider(w, reputation(w.id, reviews), slugFor(w.id))),
      ...[...store.organizations.values()].filter((o) => o.trades?.length).map((o) => orgAsProvider(o, reputation(o.id, reviews), slugFor(o.id))),
    ];
  }

  const providerById = (id: string) => providers().find((p) => p.id === id);
  const estimateFor = (serviceId: string | null, location: Place, quantity?: number) =>
    serviceId ? estimatePrice(serviceId, { location, quantity, observations: store.priceObservations, now: now() }) : null;

  /** Worker ids who do the work when a provider is a crew or business. */
  function workersFor(providerId: string): string[] {
    if (store.workers.has(providerId)) return [providerId];
    const org = store.organizations.get(providerId);
    return (org?.members ?? []).map((m) => m.userId).filter((id) => store.workers.has(id));
  }

  /** Can this user act for this provider (is them, or a member of their organization)? */
  const actsForProvider = (user: string, providerId: string) => store.actsFor(user, providerId);

  // --- Pricing database -------------------------------------------------------------

  app.get<{ Querystring: { trade?: string } }>('/pricing/services', async (req) => ({
    services: SERVICES.filter((svc) => !req.query.trade || svc.tradeId === req.query.trade),
  }));

  app.get<{ Querystring: { service: string; quantity?: string; lat?: string; lng?: string } }>('/pricing/estimate', async (req, reply) => {
    if (!getService(req.query.service ?? '')) return reply.code(404).send({ error: 'unknown service' });
    const location = req.query.lat && req.query.lng ? { lat: Number(req.query.lat), lng: Number(req.query.lng) } : undefined;
    return estimatePrice(req.query.service, { location, quantity: Number(req.query.quantity ?? 1), observations: store.priceObservations, now: now() });
  });

  app.get<{ Querystring: { q: string } }>('/classify', async (req) => ({ matches: classifyRequest(req.query.q ?? '') }));

  // --- Provider search (the customer side) --------------------------------------

  app.get<{ Querystring: { q?: string; trade?: string; lat: string; lng: string; region?: string; availableNow?: string } }>(
    '/providers/search',
    async (req, reply) => {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return reply.code(400).send({ error: 'lat and lng are required' });
      const location: Place = { lat, lng, region: req.query.region ?? '' };
      const { interpretedAs, results } = searchProviders(
        { location, text: req.query.q, tradeIds: req.query.trade ? [req.query.trade] : undefined, availableNow: req.query.availableNow === 'true' },
        providers(),
      );
      const top = interpretedAs[0];
      return {
        interpretedAs,
        estimate: top ? estimateFor(top.serviceId, location) : null,
        results: results.map((r) => ({
          ...r,
          // Show the region, never a provider's home coordinates.
          provider: { ...r.provider, home: { region: r.provider.home.region } },
          siteUrl: r.provider.siteSlug ? `${baseUrl}/s/${r.provider.siteSlug}` : null,
        })),
      };
    },
  );

  // --- Requests & quotes ----------------------------------------------------------

  app.post<{
    Body: { description: string; title?: string; serviceId?: string; location: Place; timing: RequestTiming; preferredDate?: string; quantity?: number; budget?: number; invitedProviderIds?: string[] };
  }>(
    '/requests',
    {
      schema: {
        body: {
          type: 'object',
          required: ['description', 'location', 'timing'],
          properties: {
            description: { type: 'string', minLength: 5, maxLength: 4000 },
            title: { type: 'string', maxLength: 120 },
            serviceId: { type: 'string' },
            location: PLACE_SCHEMA,
            timing: { enum: TIMINGS },
            preferredDate: { type: 'string', format: 'date' },
            quantity: { type: 'number', exclusiveMinimum: 0 },
            budget: { type: 'number', exclusiveMinimum: 0 },
            invitedProviderIds: { type: 'array', items: { type: 'string' }, maxItems: 10 },
          },
        },
      },
    },
    async (req, reply) => {
      const user = requireUser(req, reply);
      if (!user) return;
      const created = createRequest(user, req.body);
      if ('error' in created) return reply.code(400).send(created);
      const { request, interpretedAs } = created;
      const matches = searchProviders({ location: request.location, tradeIds: request.tradeId ? [request.tradeId] : undefined, limit: 5 }, providers());
      return reply.code(201).send({
        request,
        interpretedAs,
        estimate: estimateFor(request.serviceId, request.location, request.quantity),
        providers: matches.results.map((r) => ({ id: r.provider.id, name: r.provider.name, score: r.score, reasons: r.reasons })),
      });
    },
  );

  function createRequest(
    customerId: string,
    body: { description: string; title?: string; serviceId?: string; location: Place; timing: RequestTiming; preferredDate?: string; quantity?: number; budget?: number; invitedProviderIds?: string[] },
  ): { request: ServiceRequest; interpretedAs: ReturnType<typeof classifyRequest> } | { error: string } {
    if (body.serviceId && !getService(body.serviceId)) return { error: 'unknown service' };
    const interpretedAs = classifyRequest(`${body.title ?? ''} ${body.description}`);
    const serviceId = body.serviceId ?? interpretedAs[0]?.serviceId ?? null;
    const request: ServiceRequest = {
      id: randomUUID(),
      customerId,
      title: body.title?.trim() || (serviceId ? getService(serviceId)!.name : body.description.slice(0, 60)),
      description: body.description,
      serviceId,
      tradeId: serviceId ? getService(serviceId)!.tradeId : null,
      location: body.location,
      timing: body.timing,
      preferredDate: body.preferredDate,
      quantity: body.quantity,
      budget: body.budget,
      invitedProviderIds: body.invitedProviderIds ?? [],
      status: 'open',
      createdAt: now().toISOString(),
    };
    store.requests.set(request.id, request);
    return { request, interpretedAs };
  }

  app.get<{ Params: { id: string } }>('/requests/:id', async (req, reply) => {
    const user = requireUser(req, reply);
    if (!user) return;
    const request = store.requests.get(req.params.id);
    if (!request) return reply.code(404).send({ error: 'request not found' });
    const estimate = estimateFor(request.serviceId, request.location, request.quantity);
    const quotes = [...store.quotes.values()].filter((q) => q.requestId === request.id);
    const withPosition = (q: Quote) => ({ ...q, market: estimate ? marketPosition(q.amount, estimate) : null });

    if (request.customerId === user) return { request, estimate, quotes: quotes.map(withPosition) };
    const asProvider = providers().find((p) => actsForProvider(user, p.id) && (requestVisibleTo(request, p) || quotes.some((q) => q.providerId === p.id)));
    if (!asProvider) return reply.code(403).send({ error: 'not visible to you' });
    return {
      request,
      estimate,
      // Guest contact details go only to providers the customer invited.
      contact: request.invitedProviderIds.includes(asProvider.id) ? store.guestContacts.get(request.id) ?? null : null,
      quotes: quotes.filter((q) => q.providerId === asProvider.id).map(withPosition),
    };
  });

  app.get<{ Params: { id: string } }>('/providers/:id/requests', async (req, reply) => {
    const user = requireUser(req, reply);
    if (!user) return;
    if (!actsForProvider(user, req.params.id)) return reply.code(403).send({ error: 'not your provider profile' });
    const provider = providerById(req.params.id);
    if (!provider) return reply.code(404).send({ error: 'no provider profile; add the trades you offer first' });
    const open = [...store.requests.values()].filter((r) => requestVisibleTo(r, provider));
    return { requests: open.map((r) => ({ request: r, invited: r.invitedProviderIds.includes(provider.id), estimate: estimateFor(r.serviceId, r.location, r.quantity) })) };
  });

  app.post<{ Params: { id: string }; Body: { providerId: string; amount: number; message?: string } }>(
    '/requests/:id/quotes',
    {
      schema: {
        body: {
          type: 'object',
          required: ['providerId', 'amount'],
          properties: { providerId: { type: 'string' }, amount: { type: 'number', exclusiveMinimum: 0, maximum: 1_000_000 }, message: { type: 'string', maxLength: 2000 } },
        },
      },
    },
    async (req, reply) => {
      const user = requireUser(req, reply);
      if (!user) return;
      if (!actsForProvider(user, req.body.providerId)) return reply.code(403).send({ error: 'you cannot quote for that provider' });
      const request = store.requests.get(req.params.id);
      const provider = providerById(req.body.providerId);
      if (!request || !provider || !requestVisibleTo(request, provider)) return reply.code(404).send({ error: 'request not available' });
      const existing = [...store.quotes.values()].find((q) => q.requestId === request.id && q.providerId === provider.id && q.status === 'pending');
      if (existing) return reply.code(409).send({ error: 'you already have a pending quote on this request', quoteId: existing.id });
      const quote: Quote = { id: randomUUID(), requestId: request.id, providerId: provider.id, amount: req.body.amount, message: req.body.message, createdAt: now().toISOString(), status: 'pending' };
      store.quotes.set(quote.id, quote);
      const estimate = estimateFor(request.serviceId, request.location, request.quantity);
      return reply.code(201).send({ quote, market: estimate ? marketPosition(quote.amount, estimate) : null });
    },
  );

  app.post<{ Params: { id: string; quoteId: string } }>('/requests/:id/quotes/:quoteId/accept', async (req, reply) => {
    const user = requireUser(req, reply);
    if (!user) return;
    const request = store.requests.get(req.params.id);
    const quote = store.quotes.get(req.params.quoteId);
    if (!request || !quote || quote.requestId !== request.id) return reply.code(404).send({ error: 'quote not found' });
    if (request.customerId !== user) return reply.code(403).send({ error: 'only the customer can accept a quote' });
    if (request.status !== 'open' || quote.status !== 'pending') return reply.code(409).send({ error: 'request or quote is no longer open' });
    const workerIds = workersFor(quote.providerId);
    if (!workerIds.length) return reply.code(409).send({ error: 'provider has no workers who can take the job' });

    // The accepted quote becomes a regular job + engagement, so escrow, reviews and records all apply.
    const opportunity = requestToOpportunity(request, quote, now());
    store.opportunities.set(opportunity.id, opportunity);
    let engagement: Engagement = {
      id: `eng_${randomUUID()}`,
      opportunityId: opportunity.id,
      clientId: request.customerId,
      workerIds,
      status: 'offered',
      amount: quote.amount,
      currency: 'USD',
      platformFeePct: 10,
      createdAt: now().toISOString(),
      history: [],
    };
    // The provider's quote is their acceptance of the job at that price.
    engagement = transition(engagement, 'accepted', 'worker', now(), `Quote ${quote.id} accepted`);
    store.engagements.set(engagement.id, engagement);

    for (const q of store.quotes.values()) {
      if (q.requestId === request.id && q.status === 'pending') store.quotes.set(q.id, { ...q, status: q.id === quote.id ? 'accepted' : 'declined' });
    }
    store.requests.set(request.id, { ...request, status: 'booked', engagementId: engagement.id });
    return { engagementId: engagement.id, status: engagement.status, next: 'Fund escrow to confirm the booking: POST /engagements/:id/transition { "to": "funded" }' };
  });

  // --- Provider websites ------------------------------------------------------------

  app.get<{ Params: { id: string } }>('/providers/:id/site', async (req, reply) => {
    const user = requireUser(req, reply);
    if (!user) return;
    if (!actsForProvider(user, req.params.id)) return reply.code(403).send({ error: 'not your provider profile' });
    const site = store.sites.get(req.params.id);
    return { site: site ?? null, url: site ? `${baseUrl}/s/${site.slug}` : null };
  });

  app.put<{ Params: { id: string }; Body: Partial<Omit<SiteSettings, 'ownerId'>> }>(
    '/providers/:id/site',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            slug: { type: 'string' },
            published: { type: 'boolean' },
            headline: { type: 'string' },
            about: { type: 'string' },
            accent: { type: 'string' },
            serviceIds: { type: 'array', items: { type: 'string' } },
            prices: { type: 'object', additionalProperties: { type: 'number' } },
            photos: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const user = requireUser(req, reply);
      if (!user) return;
      if (!actsForProvider(user, req.params.id)) return reply.code(403).send({ error: 'not your provider profile' });
      if (!providerById(req.params.id)) return reply.code(404).send({ error: 'add the trades you offer before creating a site' });
      const current = store.sites.get(req.params.id);
      const next: SiteSettings = { ...current, ...req.body, ownerId: req.params.id, slug: req.body.slug ?? current?.slug ?? '', published: req.body.published ?? current?.published ?? false };
      const errors = validateSettings(next);
      if (!next.slug) errors.push('Choose a site address (slug)');
      const unknownServices = (next.serviceIds ?? []).filter((id) => !getService(id));
      if (unknownServices.length) errors.push(`Unknown services: ${unknownServices.join(', ')}`);
      const taken = store.siteBySlug(next.slug);
      if (taken && taken.ownerId !== req.params.id) errors.push('That address is taken');
      if (errors.length) return reply.code(400).send({ errors });
      store.sites.set(req.params.id, next);
      return { site: next, url: `${baseUrl}/s/${next.slug}` };
    },
  );

  function renderProviderSite(reply: FastifyReply, slug: string, flash?: string) {
    const site = store.siteBySlug(slug);
    const provider = site?.published ? providerById(site.ownerId) : undefined;
    if (!site || !provider) return reply.code(404).type('text/plain').send('Not found');
    const serviceIds = site.serviceIds?.length ? site.serviceIds : SERVICES.filter((svc) => provider.trades.includes(svc.tradeId)).map((svc) => svc.id);
    const services = serviceIds.map((id) => siteService(estimatePrice(id, { location: provider.home, observations: store.priceObservations, now: now() }), site.prices?.[id]));
    const reviews = store
      .visibleReviews(now())
      .filter((r) => r.subjectId === provider.id)
      .map((r) => ({ rating: Object.values(r.ratings).reduce((a, b) => a + b, 0) / Object.values(r.ratings).length, comment: r.comment, date: r.submittedAt }));
    return reply
      .header('content-security-policy', SITE_CSP)
      .header('x-content-type-options', 'nosniff')
      .type('text/html; charset=utf-8')
      .send(renderSite({ settings: site, provider, services, reviews, baseUrl, flash }));
  }

  app.get<{ Params: { slug: string }; Querystring: { sent?: string } }>('/s/:slug', async (req, reply) =>
    renderProviderSite(reply, req.params.slug, req.query.sent === '1' ? 'Thanks! Your request was sent. You will hear back soon.' : undefined),
  );

  // The website's quote form: guests can request work without an account.
  app.post<{ Params: { slug: string }; Body: Record<string, string> }>('/s/:slug/request', async (req, reply) => {
    const site = store.siteBySlug(req.params.slug);
    const provider = site?.published ? providerById(site.ownerId) : undefined;
    if (!site || !provider) return reply.code(404).type('text/plain').send('Not found');
    if (!allowGuest(req.ip)) return reply.code(429).type('text/plain').send('Too many requests, please try again later.');
    const body = req.body ?? {};
    const description = (body.description ?? '').trim().slice(0, 2000);
    const contact: GuestContact = { name: (body.name ?? '').trim().slice(0, 100), email: body.email?.trim().slice(0, 200) || undefined, phone: body.phone?.trim().slice(0, 30) || undefined };
    if (description.length < 5 || !contact.name || (!contact.email && !contact.phone)) {
      return reply.code(400).type('text/plain').send('Please describe the job and leave your name plus an email or phone number.');
    }
    const timing = TIMINGS.includes(body.timing as RequestTiming) ? (body.timing as RequestTiming) : 'flexible';
    const serviceId = body.serviceId && getService(body.serviceId) ? body.serviceId : undefined;
    const created = createRequest(`guest_${randomUUID()}`, {
      description,
      serviceId,
      // Guests don't share an address up front; use the provider's area until they do.
      location: provider.home,
      timing,
      invitedProviderIds: [provider.id],
    });
    if ('error' in created) return reply.code(400).type('text/plain').send(created.error);
    store.guestContacts.set(created.request.id, contact);
    return reply.redirect(`/s/${site.slug}?sent=1#quote`, 303);
  });

  app.get('/sitemap.xml', async (_req, reply) =>
    reply.type('application/xml').send(renderSitemap(baseUrl, [...store.sites.values()].filter((site) => site.published).map((site) => site.slug))),
  );

  app.get('/robots.txt', async (_req, reply) => reply.type('text/plain').send(`User-agent: *\nAllow: /s/\nAllow: /find\nDisallow: /\nSitemap: ${baseUrl}/sitemap.xml\n`));
}
