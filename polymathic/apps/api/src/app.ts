import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { computeTrust, growthPlan, rankOpportunities, type Opportunity } from '@polymathic/core';
import {
  INTEGRATION_CATALOG,
  aggregateOpportunities,
  buildAuthorizeUrl,
  createPkcePair,
  createPolymathicConnector,
  createState,
  exchangeCode,
  type Connector,
  type ConnectorContext,
} from '@polymathic/connectors';
import { MemoryStore } from './store.js';

const PENDING_AUTH_TTL_MS = 10 * 60_000;

type JobDefaults = 'requiredCertifications' | 'requiredEquipment' | 'minTrustTier' | 'requiresBackgroundCheck' | 'headcount';
type JobInput = Omit<Opportunity, 'id' | 'source' | JobDefaults> & Partial<Pick<Opportunity, JobDefaults>>;

export interface AppOptions {
  store: MemoryStore;
  /** External connectors to aggregate from, in addition to Polymathic's own jobs. */
  connectors?: Connector[];
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
  now?: () => Date;
}

export function buildApp(opts: AppOptions) {
  const { store } = opts;
  const env = opts.env ?? process.env;
  const now = opts.now ?? (() => new Date());
  const doFetch = opts.fetch ?? fetch;
  const connectors = [createPolymathicConnector({ list: () => store.listOpportunities() }), ...(opts.connectors ?? [])];
  const connectorById = new Map(connectors.map((c) => [c.id, c]));
  const baseUrl = env.PUBLIC_BASE_URL ?? 'http://localhost:4100';

  const app = Fastify({ logger: env.NODE_ENV !== 'test' && env.LOG !== '0' });

  const contextFor = (workerId: string) => (c: Connector): ConnectorContext => ({
    accessToken: store.tokens.get(`${workerId}:${c.id}`)?.accessToken,
    env,
    fetch: doFetch,
    now,
  });

  app.get('/health', async () => ({ ok: true }));

  app.get('/integrations', async () => ({
    active: connectors.map(({ id, name, category, capabilities, auth }) => ({ id, name, category, capabilities, auth: auth.kind })),
    catalog: INTEGRATION_CATALOG,
  }));

  app.get<{ Params: { id: string } }>('/workers/:id', async (req, reply) => {
    const worker = store.workers.get(req.params.id);
    if (!worker) return reply.code(404).send({ error: 'worker not found' });
    return { worker, trust: computeTrust(worker, now()) };
  });

  app.get<{ Params: { id: string }; Querystring: { includeIneligible?: string; limit?: string } }>(
    '/workers/:id/opportunities',
    async (req, reply) => {
      const worker = store.workers.get(req.params.id);
      if (!worker) return reply.code(404).send({ error: 'worker not found' });

      const radiusKm = worker.availability.maxTravelKm;
      const { opportunities, errors } = await aggregateOpportunities(connectors, contextFor(worker.id), {
        near: worker.home,
        radiusKm,
        includeRemote: worker.availability.remoteOk,
      });
      const matches = rankOpportunities(worker, opportunities, {
        includeIneligible: req.query.includeIneligible === 'true',
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      return { matches, sourceErrors: errors };
    },
  );

  app.get<{ Params: { id: string } }>('/workers/:id/growth', async (req, reply) => {
    const worker = store.workers.get(req.params.id);
    if (!worker) return reply.code(404).send({ error: 'worker not found' });
    const { opportunities } = await aggregateOpportunities(connectors, contextFor(worker.id), {});
    return { trust: computeTrust(worker, now()), plan: growthPlan(worker, opportunities) };
  });

  app.post<{ Body: JobInput }>(
    '/jobs',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title', 'description', 'category', 'engagement', 'urgency', 'remote', 'requiredSkills'],
          properties: {
            title: { type: 'string', minLength: 3 },
            description: { type: 'string' },
            category: { type: 'string', minLength: 1 },
            engagement: { enum: ['gig', 'contract', 'temp', 'full_time'] },
            urgency: { enum: ['immediate', 'scheduled', 'long_term'] },
            remote: { type: 'boolean' },
            requiredSkills: { type: 'array' },
          },
        },
      },
    },
    async (req, reply) => {
      const id = `pm_${randomUUID()}`;
      const opp: Opportunity = {
        requiredCertifications: [],
        requiredEquipment: [],
        minTrustTier: 'new',
        requiresBackgroundCheck: false,
        headcount: 1,
        ...req.body,
        id,
        source: { connectorId: 'polymathic', externalId: id, fetchedAt: now().toISOString() },
      };
      store.opportunities.set(id, opp);
      return reply.code(201).send(opp);
    },
  );

  // OAuth2 connect flow: start → provider consent screen → callback.
  app.get<{ Params: { connectorId: string }; Querystring: { workerId?: string } }>(
    '/connect/:connectorId/start',
    async (req, reply) => {
      const connector = connectorById.get(req.params.connectorId);
      if (!connector || connector.auth.kind !== 'oauth2') return reply.code(404).send({ error: 'no OAuth connector with that id' });
      const workerId = req.query.workerId;
      if (!workerId || !store.workers.has(workerId)) return reply.code(400).send({ error: 'valid workerId required' });
      const clientId = env[connector.auth.clientIdEnv];
      if (!clientId) return reply.code(503).send({ error: `${connector.auth.clientIdEnv} is not configured` });

      const state = createState();
      const pkce = connector.auth.pkce ? createPkcePair() : undefined;
      store.pendingAuth.set(state, { workerId, connectorId: connector.id, codeVerifier: pkce?.verifier, createdAt: now().getTime() });

      const authorizeUrl = buildAuthorizeUrl({
        authorizeUrl: connector.auth.authorizeUrl,
        clientId,
        redirectUri: `${baseUrl}/connect/${connector.id}/callback`,
        scopes: connector.auth.scopes,
        state,
        codeChallenge: pkce?.challenge,
      });
      return { authorizeUrl };
    },
  );

  app.get<{ Params: { connectorId: string }; Querystring: { code?: string; state?: string; error?: string } }>(
    '/connect/:connectorId/callback',
    async (req, reply) => {
      const { code, state, error } = req.query;
      const pending = state ? store.pendingAuth.get(state) : undefined;
      if (state) store.pendingAuth.delete(state);
      if (!pending || pending.connectorId !== req.params.connectorId) return reply.code(400).send({ error: 'unknown or reused state' });
      if (now().getTime() - pending.createdAt > PENDING_AUTH_TTL_MS) return reply.code(400).send({ error: 'authorization expired' });
      if (error || !code) return reply.code(400).send({ error: error ?? 'missing code' });

      const connector = connectorById.get(pending.connectorId)!;
      if (connector.auth.kind !== 'oauth2') return reply.code(400).send({ error: 'not an OAuth connector' });
      const tokens = await exchangeCode({
        tokenUrl: connector.auth.tokenUrl,
        clientId: env[connector.auth.clientIdEnv]!,
        clientSecret: connector.auth.clientSecretEnv ? env[connector.auth.clientSecretEnv] : undefined,
        code,
        redirectUri: `${baseUrl}/connect/${connector.id}/callback`,
        codeVerifier: pending.codeVerifier,
        fetch: doFetch,
        now,
      });
      store.tokens.set(`${pending.workerId}:${connector.id}`, tokens);
      return { connected: connector.id, workerId: pending.workerId };
    },
  );

  return app;
}
