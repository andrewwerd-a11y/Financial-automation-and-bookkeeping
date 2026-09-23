# Integrations

The full, typed list lives in [`packages/connectors/src/catalog.ts`](../packages/connectors/src/catalog.ts) and is served at `GET /integrations`.

## The honest reality of "OAuth with every gig platform"

Most gig platforms **do not offer worker-facing APIs**. There are four ways to reach them, from best to worst:

| Access path | Examples | How we connect |
|---|---|---|
| **OAuth2, self-serve developer app** | Upwork, Freelancer.com, QuickBooks, Google Calendar | Worker clicks "Connect" and we store a token. Already built (`/connect/:id/start` → `/callback`) |
| **Public API key** | USAJOBS, Adzuna, Stripe, Plaid, Twilio | Server-side key |
| **Partner API** (needs a business agreement) | Thumbtack, Indeed, Argyle, Checkr, Persona | Apply for partnership, then build the adapter |
| **Consented aggregator** | Uber, Lyft, DoorDash, Instacart, Amazon Flex | Worker logs in through an aggregator (Argyle, Pinwheel, Truv) that returns earnings, trips, and ratings |
| **Import only** | Fiverr, TaskRabbit | CSV/PDF statement upload, email-forward parsing |

**One aggregator partnership (Argyle-class) unlocks track record and earnings from hundreds of platforms at once.** It's the highest-impact business-development task.

Note: aggregators give us a worker's *history and earnings*, not those platforms' *job feeds*. Live jobs come from open job APIs, partner feeds, and Polymathic's own postings. That's why the native general-contractor marketplace matters.

## Adding a connector

1. Add a catalog entry (access path, capabilities, notes).
2. Create `packages/connectors/src/adapters/<id>.ts` implementing `Connector`.
3. Export a pure `map<Platform>Item()` function and test it against a recorded fixture.
4. Register it in `apps/api/src/main.ts`, controlled by its env vars.

## Accounts and keys we'll need

- **Now (free/self-serve):** USAJOBS API key, Adzuna API key, Google Cloud OAuth client (Calendar), Stripe account (Connect), Plaid dev account, Twilio account
- **Apply early (approval takes weeks):** Upwork developer app, Argyle (or Pinwheel/Truv), Checkr, Persona, Thumbtack partner, Indeed partner
- **Business prerequisites:** registered business entity, privacy policy & ToS, FCRA permissible-purpose process for background checks
