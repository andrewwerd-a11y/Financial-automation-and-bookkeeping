# Roadmap

## Phase 0: Foundation ✅ (this commit)
Domain model, trust score, pay normalizer, matching, growth planner, connector framework, OAuth2/PKCE, USAJOBS live adapter, API with demo data, 29 tests.

## Phase 1: Usable MVP for one metro, one set of trades
- Postgres/PostGIS persistence, user accounts, org/crew accounts
- Web dashboard: feed, compare view, profile/trust page, growth plan
- Worker onboarding: skills, certs (upload + verify), equipment, availability, Google Calendar sync
- Business job posting + Polymathic GC flow: quote → accept → escrow (Stripe Connect) → complete → pay → rate
- Messaging (masked via Twilio), notifications
- Earnings import: CSV/statement upload; Plaid bank feed; mileage log

## Phase 2: Trust & safety
- Identity verification (Persona / Stripe Identity), background checks (Checkr) with FCRA adverse-action flow
- Job check-in/check-out, SOS, trusted-contact sharing
- Consented job-site documentation (before/after photos, time-stamped logs)
- Disputes and resolution

## Phase 3: Aggregation at scale
- Argyle-class aggregator for gig earnings and reputation import
- Upwork, Freelancer, Adzuna, and staffing-agency feeds
- Crew formation: assemble multi-person teams for jobs with `headcount > 1`
- Certification partners (training providers) linked from the growth planner

## Phase 4: Business layer
- Invoicing, quotes, contracts, 1099s, QuickBooks/Xero sync
- Marketplace storefronts, domain hosting
- Supply/tool price comparison and market research
- Connect the resale AI / cross-listing and estate-sale tools on the shared identity and payments backbone

## Risks & compliance (address before launch, with counsel)

| Area | Why it matters |
|---|---|
| **Worker classification** (AB5, ABC tests, DOL rules) | Acting as GC with subcontractors creates misclassification risk. Structure control, pay setting, and "full-time conversion" paths carefully |
| **Background checks (FCRA, ban-the-box laws)** | Need permissible purpose, disclosure/consent, and an adverse-action process. Rules vary by state and city |
| **Surveillance / monitoring** | Job-site recording needs explicit consent, and many states require two-party consent for audio. Keep it opt-in and job-specific |
| **Money movement** | Use Stripe Connect so we're not a money transmitter. Escrow terms must be clear |
| **Platform ToS** | Never scrape or log in to platforms on a worker's behalf outside sanctioned APIs or aggregators |
| **Contractor licensing** | Many trades (electrical, plumbing, HVAC) require licensed contractors. The GC model may need licenses per state and trade |
| **Insurance** | General liability and occupational accident coverage for GC jobs |
| **Privacy** | CCPA/state privacy laws; location data is sensitive |
