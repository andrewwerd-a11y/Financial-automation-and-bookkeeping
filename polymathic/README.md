# Polymathic

**End-to-end software for working for yourself.** Polymathic pulls in work from every gig platform, job board, and staffing source, and gets each job in front of the people who can do it. It compares pay honestly across sources and holds client money in escrow so workers get paid. It keeps one encrypted home for every document, license, and form, and its AI assistant handles planning, paperwork, and research. It also acts as a **general contractor**: it takes on its own jobs and staffs them with trusted independent workers and crews.

The goal is simple: people focus on the hands-on work, and the platform takes care of everything else.

## What's here (v0.2)

| Package | What it does |
|---|---|
| `packages/core` | **Trust score** (explainable, five tiers). **Pay normalizer** (effective hourly after fees, mileage, and drive time). **Matching engine** (hard blockers plus a ranked score). **Growth planner**. **Trade taxonomy**: 82 trades across 18 sectors with skill tier, licensing, certifications, equipment, logistics, and entry pathways. **Equipment catalog**: what your gear can earn, and which purchase pays back fastest. **Demand/gap finder** by trade and by low/medium/high skill tier. **Engagement lifecycle with escrow**: no work starts until the client's money is held, and silent clients are auto-approved. **Two-way blind reviews** (employers and businesses get rated too). **Auto-updating resume** |
| `packages/vault` | **Encrypted document vault**: AES-256-GCM, a data key per user, master-key rotation, ciphertext bound to its owner, and an audit log of every read. Keyword search across documents, expiry reminders, and **form autofill** (W-9, subcontractor packet, bid header) with sensitive values masked |
| `packages/ai` | **Claude-powered assistant** grounded in the user's own data through tools: vault search, form prefill, trade requirements, market gaps, growth plan, and equipment report. Modes: business plan, growth research (with live web search for schooling and licensing rules), and paperwork |
| `packages/connectors` | Connector interface, OAuth2 + PKCE, multi-source aggregation with cross-post de-duplication, the **integration catalog**. Adapters: Polymathic jobs, USAJOBS (live), Upwork (OAuth scaffold) |
| `apps/api` | Fastify API plus the **interactive work map** at `/`: colour-coded jobs, travel radius, pay and blockers per pin, growth plan, what your equipment can earn, and local gaps. Works on phones |

## Quick start

```bash
npm install
npm test           # 80 tests
npm run typecheck
npm run dev        # open http://localhost:4100 for the work map
```

Copy `.env.example` to `.env` to enable the AI assistant (`ANTHROPIC_API_KEY`), a persistent vault key (`VAULT_MASTER_KEYS`), and live connectors.

### Try it

```bash
curl localhost:4100/market/gaps                                  # where demand outstrips qualified people
curl localhost:4100/workers/w_alex/equipment                     # what Alex's gear can earn, what to buy next
curl localhost:4100/trades?tier=low                              # trades anyone can start this week
curl 'localhost:4100/workers/w_alex/resume?format=md'            # resume built from verified activity
curl -H 'x-user-id: w_alex' localhost:4100/workers/w_alex/forms/w9   # W-9 prefilled from the vault
```

> **Auth is a development stub.** Sensitive routes check an `x-user-id` header so ownership rules are enforced and tested today. It must be replaced with real sign-in before any deployment.

## Docs

- [Vision & product pillars](docs/VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Integrations: what we can connect and how](docs/INTEGRATIONS.md)
- [Roadmap, risks & compliance](docs/ROADMAP.md)
