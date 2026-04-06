# Financial Intake / Bookkeeping Platform

## Phase 6 — Reliability and control hardening

Phase 6 focuses on operational stability and maintainability (not new product scope).

## What Phase 6 adds

### Backend hardening
- Explicit runtime initialization (`initializeRuntime`) separated from app wiring.
- Environment-safe runtime paths for DB, uploads, and exports:
  - `FIN_DB_FILE`
  - `FIN_DATA_DIR`
  - `FIN_UPLOADS_DIR`
  - `FIN_DB_SEED=1` (optional startup seeding)
- Safer startup behavior:
  - DB bootstrap is explicit.
  - Seeding is opt-in instead of hidden startup side effect.
- Consistent API error envelope for key routes:
  - `{ "error": { "code", "message", "details?" } }`
- Export flow hardening:
  - deterministic CSV column ordering
  - explicit failed/completed job statuses
  - safer download path/file checks
- Service boundary cleanup:
  - transaction creation logic moved into `transactions.service.ts`

### Frontend hardening
- Loading/error/empty states added to major operational views.
- Clearer retry behavior for failed fetches.
- Safer action UX for unlink operations (confirmation prompts).
- Navigation labels and top-level phase text aligned for Phase 6.

---

## Startup / init behavior (Phase 6)

### One-time setup
```bash
npm install
```

### Initialize schema explicitly
```bash
npm run db:init -w backend
```

### Optional: seed starter data explicitly
```bash
npm run seed -w backend
```

### Run backend
```bash
npm run dev -w backend
```

### Run backend with seed-on-start enabled
```bash
FIN_DB_SEED=1 npm run dev -w backend
```

### Run frontend
```bash
npm run dev -w frontend
```

### Run tests
```bash
npm run test -w backend
```

---

## Operational notes

- Default backend URL: `http://localhost:4000`
- Default frontend URL: `http://localhost:5173`
- Export files are written under the configured data directory (`data/exports` by default).
- Upload files are written under configured uploads directory (`uploads/` by default).

---

## Known limitations

- No auth/users yet.
- No external connectors yet.
- No billing/onboarding workflows.
- Frontend remains intentionally operational/desktop-first (not polished).
- No enterprise policy engine.

---

## Deferred to later phases

- connectors/sync integrations
- authentication and role-based access
- advanced analytics/visualizations
- workflow automation beyond current manual operations

---

## Packaging

```bash
./scripts/package_zip.sh
```

Output:
- `dist/phase4-reporting-export-foundation.zip` (packaging filename is unchanged in this phase)
