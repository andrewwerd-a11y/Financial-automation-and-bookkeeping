# Polymathic

**One platform for self-employed work.** Polymathic pulls in work from every gig platform, job board, and staffing source. It sends each job to the people who can do it, compares pay honestly across sources, and keeps one professional record of a worker's track record, earnings, and credentials. It also acts as a **general contractor**: it takes on its own jobs and hands them to trusted independent workers as subcontractors.

It isn't meant to be another gig app. It's the layer that sits above all of them.

## What's here (v0.1)

| Package | What it does |
|---|---|
| `packages/core` | Domain model, **trust score** (explainable, 0–100, five tiers), **pay normalizer** (fixed, hourly, or salary → effective hourly after fees, mileage, and drive time), **matching engine** (hard blockers plus a ranked score), **growth planner** (which cert, equipment, or skill unlocks the most real work) |
| `packages/connectors` | Connector interface, OAuth2 + PKCE helpers, multi-source aggregation with cross-post de-duplication, the **integration catalog**, and adapters: Polymathic native jobs (live), USAJOBS (live), Upwork (OAuth scaffold) |
| `apps/api` | Fastify API with demo data: matches, growth plan, job posting, OAuth connect flow, and an **interactive work map** at `/` (OpenStreetMap + Leaflet, colour-coded jobs, travel radius, pay and blockers per pin, works on phones) |

## Quick start

```bash
cd polymathic
npm install
npm test           # 32 tests
npm run typecheck
npm run dev        # open http://localhost:4100 for the work map
```

Try these:

```bash
curl localhost:4100/workers/w_alex/opportunities?includeIneligible=true
curl localhost:4100/workers/w_alex/growth
curl localhost:4100/integrations
```

Copy `.env.example` to `.env` to turn on live connectors (for example, a free USAJOBS key).

## Docs

- [Vision & product pillars](docs/VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Integrations: what we can connect and how](docs/INTEGRATIONS.md)
- [Roadmap, risks & compliance](docs/ROADMAP.md)
