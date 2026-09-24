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

## Support-system integrations

| Need | Integration | Status |
|---|---|---|
| AI planning, paperwork, research | Claude via the Anthropic API (`packages/ai`), with server-side web search for live licensing/school requirements | Implemented |
| Secure payments & escrow | Stripe Connect (charges held until approval, then transfers; 1099s) | State machine built; processor planned |
| Document import | Google Drive / Dropbox OAuth, email forwarding, phone camera + OCR | Planned |
| Books & taxes | Plaid bank feeds, QuickBooks / Xero sync, quarterly estimate reminders | Planned |
| Advertising & local search | Google Business Profile, Meta ads, schema.org structured data on hosted storefronts | Planned |
| Provider websites | Hosted at `/s/:slug` with schema.org data + sitemap; custom domains via Cloudflare/Vercel API; Google Business Profile sync | Hosted sites built; domains planned |
| Pricing data | Built-in pricing database learning from paid jobs; later imports (e.g. published cost guides, BLS wage data) as `import` observations | Built |
| Notifications | Resend/Postmark (email) and Twilio (SMS) for new requests, quotes, escrow events | Planned |
| Growth research data | US DOL CareerOneStop (programs, licenses, certifications by state) plus web search | Planned |

## Accounts and keys we'll need

- **Now (free/self-serve):** Anthropic API key, USAJOBS API key, Adzuna API key, Google Cloud OAuth client (Calendar, Business Profile), Stripe account (Connect), Plaid dev account, Twilio account
- **Apply early (approval takes weeks):** Upwork developer app, Argyle (or Pinwheel/Truv), Checkr, Persona, Thumbtack partner, Indeed partner
- **Business prerequisites:** registered business entity, privacy policy & ToS, FCRA permissible-purpose process for background checks
