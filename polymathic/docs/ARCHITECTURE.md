# Architecture

```
                   ┌──────────────────────────── apps/api (Fastify) ─────────────────────────────┐
 web map / apps →  │ matches · growth · equipment · market gaps · trades · resume                │
                   │ orgs & job posting · candidates · engagements (escrow) · reviews            │
                   │ vault (owner-only) · forms · assistant · OAuth connect                      │
                   └──────┬───────────────┬─────────────────┬─────────────────┬──────────────────┘
                          │               │                 │                 │
              packages/connectors   packages/core     packages/vault     packages/ai
              ┌──────────────────┐ ┌────────────────┐ ┌───────────────┐ ┌──────────────────────┐
              │ Connector iface  │ │ trust · pay    │ │ AES-256-GCM   │ │ Claude (Opus 5)      │
              │ OAuth2 + PKCE    │ │ matching       │ │ per-user DEK  │ │ manual tool loop     │
              │ aggregate+dedupe │ │ trades (82)    │ │ KEK rotation  │ │ platform tools over  │
              │ catalog          │ │ equipment      │ │ audit log     │ │ core + vault         │
              │ adapters         │ │ market gaps    │ │ doc search    │ │ web search for       │
              └──────────────────┘ │ engagement FSM │ │ autofill      │ │ requirements research│
                                   │ reviews resume │ └───────────────┘ └──────────────────────┘
                                   └────────────────┘
```

## Key decisions

- **Normalize at the edge.** Connectors turn platform data into core `Opportunity` and `EarningsRecord` shapes. Job categories are trade ids from the taxonomy, so gap analysis, growth plans, and logistics work the same for every source.
- **Hard blockers vs. soft score.** Matching separates *can't* (missing cert, out of range, trust tier) from *how good* (skill fit, pay, proximity, timing, growth). Fixable blockers feed the growth planner, equipment investments, and entry options.
- **Money moves only on state transitions.** `engagement.ts` is a state machine that decides *when* money may move. The payment processor (Stripe Connect, planned) does the moving. Work can't start until escrow is funded.
- **Envelope encryption for user data.** Each user's records are encrypted with their own data key, which is stored only wrapped by a master key (KMS in production). Ciphertext is bound to owner and record id via GCM AAD. Only non-sensitive metadata (category, expiry date) is stored in the clear, so reminders work without decrypting anything.
- **The assistant only sees what tools return.** Tools are scoped to the signed-in user and return masked sensitive values. The system prompt is frozen for prompt caching, and per-task instructions ride in the user turn. Tool-input errors go back to the model as `is_error` results. Refusals stop the loop, and server-side fallbacks retry on another model automatically.
- **TypeScript monorepo, npm workspaces.** Packages export TypeScript source directly. `tsx` and `vitest` run it without a build step for now.

## Next infrastructure steps

| Concern | Plan |
|---|---|
| Identity | Replace the `x-user-id` dev stub with passkeys/OAuth sign-in, sessions, and org roles |
| Persistence | Postgres + PostGIS. The vault's `VaultStorage` interface maps to one table plus a keys table |
| Keys | Master keys in a cloud KMS/HSM. Per-tenant key policies |
| Documents | OCR/parsing pipeline (Claude vision or PDF input) fills the `text` field used by search and the assistant |
| Payments | Stripe Connect: escrow via separate charges and transfers, payouts, 1099s |
| Jobs & events | Queue for connector syncs, token refresh, auto-approval sweeps, expiry reminders |
| Clients | Next.js web dashboard, then React Native mobile (location, check-ins, SOS) |
| Search | Postgres full-text, then embeddings for semantic skill/job matching |
