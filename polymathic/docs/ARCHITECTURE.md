# Architecture

```
            ┌──────────────────────── apps/api (Fastify) ────────────────────────┐
 clients →  │ /workers/:id/opportunities   /workers/:id/growth   /jobs   /connect │
            └───────────────┬───────────────────────────────┬────────────────────┘
                            │                               │
                 packages/connectors                  packages/core
   ┌──────────────────────────────────────┐   ┌──────────────────────────────┐
   │ Connector interface                  │   │ Domain model (types.ts)      │
   │ OAuth2 + PKCE, token refresh         │   │ Trust score  (trust.ts)      │
   │ aggregateOpportunities + dedupe      │──▶│ Pay normalizer (pay.ts)      │
   │ Adapters: polymathic, usajobs, upwork│   │ Matching (matching.ts)       │
   │ INTEGRATION_CATALOG                  │   │ Growth planner (growth.ts)   │
   └──────────────────────────────────────┘   └──────────────────────────────┘
```

## Key decisions

- **Normalize at the edge.** Each connector turns platform data into core `Opportunity` and `EarningsRecord` shapes. The core never knows where a job came from. New platforms are added by writing one adapter.
- **Connectors are stateless.** Credentials come in through a per-call `ConnectorContext`. Token storage, encryption, and refresh belong to the app layer.
- **Partial failure is normal.** Aggregation uses `Promise.allSettled` and reports per-source errors next to results.
- **Hard blockers vs. soft score.** Matching separates *can't* (missing cert, out of range, below trust tier) from *how good* (skill fit, pay, proximity, timing, growth). Blockers marked `unlockable` feed the growth planner.
- **TypeScript monorepo, npm workspaces.** Packages export TypeScript source directly. `tsx` and `vitest` run it without a build step for now.

## Next infrastructure steps

| Concern | Plan |
|---|---|
| Persistence | Postgres + PostGIS (geo radius queries), Drizzle or Kysely for access |
| Secrets | OAuth tokens encrypted at rest (envelope encryption, KMS) |
| Auth | Passkeys/OAuth sign-in for users and org accounts, with role-based access for crews and businesses |
| Jobs | Queue (BullMQ or Postgres-based) for connector syncs, token refresh, and notifications |
| Real-time | WebSocket/SSE for "available now" dispatch |
| Clients | Next.js web dashboard, then React Native mobile (location, check-ins, SOS) |
| Search | Postgres full-text first, then embeddings for semantic skill/job matching |
