# Polymathic

**End-to-end software for working for yourself.** Polymathic pulls in work from every gig platform, job board, and staffing source, and gets each job in front of the people who can do it. It compares pay honestly across sources and holds client money in escrow so workers get paid. It keeps one encrypted home for every document, license, and form, and its AI assistant handles planning, paperwork, and research. It also acts as a **general contractor**: it takes on its own jobs and staffs them with trusted independent workers and crews.

The goal is simple: people focus on the hands-on work, and the platform takes care of everything else.

## What's here (v0.3)

| Package | What it does |
|---|---|
| `packages/core` | **Trust score** (explainable, five tiers). **Pay normalizer** (effective hourly after fees, mileage, and drive time). **Matching engine** (hard blockers plus a ranked score). **Growth planner**. **Trade taxonomy**: 82 trades across 18 sectors with skill tier, licensing, certifications, equipment, logistics, and entry pathways. **Equipment catalog**: what your gear can earn, and which purchase pays back fastest. **Demand/gap finder** by trade and by low/medium/high skill tier. **Engagement lifecycle with escrow**: no work starts until the client's money is held, and silent clients are auto-approved. **Two-way blind reviews** (employers and businesses get rated too). **Auto-updating resume** |
| `packages/core` (customer side) | **Pricing database**: 69 services across 60 trades with per-unit price ranges, adjusted by region and continuously corrected by real paid jobs nearby. **Request understanding**: "my faucet is leaking" → plumbing. **Provider search** across workers, crews and businesses, ranked by trust, rating, distance, availability and verification. **Quotes** checked against the local market, and accepted quotes become escrow-protected jobs |
| `packages/sites` | **Provider websites**: SEO-ready pages (schema.org LocalBusiness, sitemap, canonical URLs, Open Graph) built from verified profiles, live local pricing, and reviews. They work on phones and include a request-a-quote form that doesn't need JavaScript |
| `packages/vault` | **Encrypted document vault**: AES-256-GCM, a data key per user, master-key rotation, ciphertext bound to its owner, and an audit log of every read. Keyword search across documents, expiry reminders, and **form autofill** (W-9, subcontractor packet, bid header) with sensitive values masked |
| `packages/ai` | **Claude-powered assistant** grounded in the user's own data through tools: vault search, form prefill, trade requirements, market gaps, growth plan, and equipment report. Modes: business plan, growth research (with live web search for schooling and licensing rules), and paperwork |
| `packages/connectors` | Connector interface, OAuth2 + PKCE, multi-source aggregation with cross-post de-duplication, the **integration catalog**. Adapters: Polymathic jobs, USAJOBS (live), Upwork (OAuth scaffold) |
| `apps/api` | Fastify API plus three web experiences: the **work map** at `/` for people looking for work, **Find a pro** at `/find` for people who need work done, and **provider websites** at `/s/:slug` |

## Quick start

```bash
npm install
npm test           # 108 tests
npm run typecheck
npm run dev        # http://localhost:4100 (work map), /find (customers), /s/alex-handyman-austin (a pro's site)
```

Copy `.env.example` to `.env` to enable the AI assistant (`ANTHROPIC_API_KEY`), a persistent vault key (`VAULT_MASTER_KEYS`), and live connectors.

### Try it

```bash
curl 'localhost:4100/providers/search?q=leaky+faucet&lat=30.27&lng=-97.74'   # find a pro from plain language
curl 'localhost:4100/pricing/estimate?service=interior-painting-room&quantity=3&lat=30.27&lng=-97.74'
curl localhost:4100/market/gaps                                  # where demand outstrips qualified people
curl localhost:4100/workers/w_alex/equipment                     # what Alex's gear can earn, what to buy next
curl localhost:4100/trades?tier=low                              # trades anyone can start this week
curl 'localhost:4100/workers/w_alex/resume?format=md'            # resume built from verified activity
curl -H 'x-user-id: w_alex' localhost:4100/workers/w_alex/forms/w9   # W-9 prefilled from the vault
```

### Deploy

`render.yaml` is a one-click [Render](https://render.com) blueprint: New → Blueprint → pick this repo, then fill in the secrets it asks for. Storage is in memory until the Postgres layer lands, so data resets on each deploy.

> **Auth is a development stub.** Sensitive routes check an `x-user-id` header so ownership rules are enforced and tested today. It must be replaced with real sign-in before any deployment.

## Docs

- [Vision & product pillars](docs/VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Integrations: what we can connect and how](docs/INTEGRATIONS.md)
- [Roadmap, risks & compliance](docs/ROADMAP.md)
