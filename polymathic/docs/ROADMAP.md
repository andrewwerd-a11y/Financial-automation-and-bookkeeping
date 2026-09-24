# Roadmap

## Phase 0: Foundation ✅
Domain model, trust score, pay normalizer, matching, growth planner, connector framework, OAuth2/PKCE, USAJOBS live adapter, and the interactive work map.

## Phase 0.5: Support system core ✅
- 82-trade taxonomy (low/medium/high skill) with licensing, certifications, equipment, logistics, and pathways
- Equipment catalog: what your gear can earn, and ranked equipment investments with payback
- Demand/gap finder by trade and skill tier, plus each worker's closest entry into gap trades
- Engagement state machine with escrow, auto-approval, and exact crew payout splits
- Two-way verified blind reviews and employer/business reputation
- Auto-updating resume
- Encrypted vault (per-user keys, rotation, audit), document search, expiry tracking, form autofill
- Claude assistant with platform tools: business plans, growth research with web search, paperwork
- Business and crew side: orgs, job posting with a live supply preview, ranked candidates

## Phase 1: Usable MVP for one metro
- Real sign-in (passkeys/OAuth), Postgres/PostGIS, KMS-held vault keys
- Web dashboard: feed, compare view, profile/trust, vault, assistant chat, business console
- Stripe Connect escrow + payouts; 1099 reporting
- Document intake: photo/PDF upload → OCR → vault with auto-detected expiry
- Messaging (masked via Twilio), notifications, expiry and auto-approval reminders
- Earnings import: CSV/statement upload, Plaid bank feed, mileage log, quarterly tax estimates

## Phase 2: Trust & safety
- Identity verification (Persona / Stripe Identity), background checks (Checkr) with FCRA adverse-action flow
- Job check-in/out, SOS, trusted-contact sharing, consented job-site documentation
- Dispute resolution workflow and evidence capture

## Phase 3: Aggregation at scale
- Argyle-class aggregator for gig earnings and reputation import
- Upwork, Freelancer, Adzuna, and staffing-agency feeds
- Automatic crew formation for multi-person jobs
- Training and certification partners linked from growth plans (schools, apprenticeships, exam prep)

## Phase 4: Business layer
- Invoicing, quotes, contracts, QuickBooks/Xero sync, business-plan tracking against goals
- Advertising support: Google Business Profile, local ads, and listings generated from verified profiles
- Premium tiers and exclusive programs (priority GC work, group insurance, equipment financing)
- Storefronts, domain hosting, SEO, and a business marketplace
- Tool/supply price comparison and market research
- Integration with the resale AI / cross-listing and estate-sale tools

## Risks & compliance (address before launch, with counsel)

| Area | Why it matters |
|---|---|
| **Worker classification** (AB5, ABC tests, DOL rules) | Acting as GC with subcontractors creates misclassification risk. Structure control, pay setting, and full-time conversion paths carefully |
| **Background checks** (FCRA, ban-the-box) | Need permissible purpose, disclosure/consent, and adverse-action process. Rules vary by state and city |
| **Monitoring & recording** | Job-site recording needs explicit consent, and many states require two-party consent for audio. Keep it opt-in and job-specific |
| **Money movement & escrow** | Use Stripe Connect so we're not a money transmitter. Escrow and auto-approval terms must be in the user agreement |
| **Sensitive data** (SSN/EIN, IDs, health-adjacent work) | Vault encryption, access logging, breach-notification plan, data retention and deletion policy; SOC 2 before enterprise clients |
| **AI assistance** | Information, not legal/tax advice; cite sources; keep a human professional in the loop for filings; never send unmasked identifiers to the model |
| **Platform ToS** | Never scrape or log in to platforms on a worker's behalf outside sanctioned APIs or aggregators |
| **Contractor licensing** | Licensed trades require licensed contractors. The GC model may need licenses per state and trade |
| **Reviews** | Defamation and fake-review rules (FTC). Verified-engagement-only reviews help |
| **Privacy** | CCPA/state privacy laws; location data is sensitive |
