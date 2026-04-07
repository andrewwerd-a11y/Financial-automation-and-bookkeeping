# Financial Intake / Bookkeeping Platform

## Phase 10 — Productization layer

Phase 10 introduces minimal product-oriented structure (workspace/operator/settings foundations) while keeping the platform local/dev-friendly and extendable.

## What Phase 10 adds

### Backend product foundations
- New **workspace/operator** models:
  - `workspaces`
  - `users`
  - `workspace_members`
- New **persistent settings** model:
  - `app_settings` (workspace-scoped key/value settings)
- Workspace-aware structural additions on key data:
  - `transactions.workspace_id`
  - `documents.workspace_id`
  - `export_jobs.workspace_id`
  - `businesses.workspace_id`
  - `policy_rules.workspace_id`
- New APIs:
  - `GET/POST /api/workspaces`
  - `GET/POST /api/users`
  - `GET/POST /api/users/workspace-members`
  - `GET/POST /api/settings`

### Existing multi-business/policy flow alignment
- Businesses now require a workspace context.
- Policies now require workspace + business context.
- Transaction policy flags continue to be evaluated on create and persisted.

### Frontend product structure refinement
- Added **Setup** placeholder page for product setup sequence.
- Added **Workspace** page:
  - create workspaces
  - create operators
  - assign workspace membership
- App shell now shows active workspace + active business context.
- Existing business/policy workflows continue to operate within this more product-like structure.

---

## Startup / run

```bash
npm install
npm run db:init -w backend
npm run dev -w backend
npm run dev -w frontend
```

Optional tests:

```bash
npm run test -w backend
```

---

## Product-oriented foundations now present

- Workspace container model (for future org-level boundaries)
- Operator/user model and workspace membership
- Persistent workspace settings model
- Business and policy records scoped with workspace context
- Product setup placeholder path in frontend

---

## Known limitations

- No full production auth or RBAC yet.
- No billing/subscription model.
- Workspace security boundaries are structural only in this phase.
- No deployment automation/SSO/production hardening in this phase.

---

## Still required for true production readiness

- full auth/session and permission model
- secure multi-tenant isolation controls
- deployment/runtime hardening and observability
- billing/entitlement controls
- deeper onboarding and support tooling
