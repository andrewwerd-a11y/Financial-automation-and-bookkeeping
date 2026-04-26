# Sprint Report - Treatment UI, Settings UI, Policy Backfill, Quality Pass

**Date:** 2026-04-26
**Branch:** main
**Base commit:** `48fd4ad5638b96a7830ec3d0d8d1d6f51cf96cf4`
**Final commit:** `e49da24`

---

## Commits (in order)

| SHA (short) | Message | Files changed |
|---|---|---|
| `3943fe1` | `feat(treatment-ui): add TreatmentPage with API wrappers and treatment tests - fixes FE-005` | 5 |
| `4394076` | `feat(settings-ui): wire SettingsPage to /api/settings with workspace-scoped CRUD - fixes FE-004` | 3 |
| `ac0f2f5` | `feat(policy-backfill): auto-backfill on policy create/update, add POST /backfill endpoint and UI button - fixes POL-001` | 5 |
| `f83153d` | `feat(reconciliation): extend scan to match suspected_duplicate pairs - partial REC-001` | 3 |
| `4459fa5` | `feat(review-history): add GET /review/history/:id endpoint and transaction detail history panel` | 5 |
| `8180065` | `chore(system): verify graceful shutdown, add dbOk + transactionCount to /api/system/status` | 3 |
| `5581ce7` | `chore(types): frontend typecheck clean after sprint additions` | 3 |
| `e49da24` | `test(stability): ensure all test files use isolated DBs, vitest config verified` | 1 |

---

## Test suite

| Metric | Before sprint | After sprint |
|---|---|---|
| Total tests | 48 | 83 |
| Passing | 48 | 83 |
| Failing | 0 | 0 |
| New test files | - | `treatment.test.ts`, `settings.test.ts`, `policy-backfill.test.ts`, `reconciliation.test.ts`, `review.test.ts`, `system.test.ts` |
| New test cases | - | 35 |

Run: `npm run test -w backend` output (last 20 lines).

```text
PASS tests/integration/routes-coverage.test.ts > treatment routes > PATCH /api/treatment/transactions/:id/final 404 on unknown id
PASS tests/integration/routes-coverage.test.ts > evidence note PATCH > PATCH /api/evidence/links/:id/note updates the note
PASS tests/integration/routes-coverage.test.ts > evidence note PATCH > GET /api/evidence/transaction/:id lists links with updated note
PASS tests/integration/routes-coverage.test.ts > evidence note PATCH > GET /api/evidence/document/:id lists linked transactions
PASS tests/integration/routes-coverage.test.ts > reconciliation PATCH > creates a pair of transactions and runs scan
PASS tests/integration/routes-coverage.test.ts > reconciliation PATCH > PATCH /api/reconciliation/candidates/:id resolves a candidate
PASS tests/integration/routes-coverage.test.ts > reconciliation PATCH > PATCH /api/reconciliation/candidates/:id 400 on bad status
PASS tests/integration/routes-coverage.test.ts > reconciliation PATCH > PATCH /api/reconciliation/candidates/:id 404 on unknown id
PASS tests/integration/routes-coverage.test.ts > policies PATCH > creates a policy
PASS tests/integration/routes-coverage.test.ts > policies PATCH > PATCH /api/policies/:id updates threshold without touching config
PASS tests/integration/routes-coverage.test.ts > policies PATCH > PATCH /api/policies/:id updates config when explicitly passed
PASS tests/integration/routes-coverage.test.ts > policies PATCH > PATCH /api/policies/:id 404 on unknown id
PASS tests/integration/routes-coverage.test.ts > document upload failures > rejects upload without file
PASS tests/integration/routes-coverage.test.ts > document upload failures > rejects upload with disallowed MIME type (multer fileFilter)
PASS tests/integration/routes-coverage.test.ts > CSV import failure paths > rejects CSV import without file
PASS tests/integration/routes-coverage.test.ts > CSV import failure paths > rejects import with nonexistent templateId
PASS tests/integration/routes-coverage.test.ts > CSV import failure paths > imports a valid CSV and returns job metadata
Test Files  15 passed (15)
Tests       83 passed (83)
Duration    1.20s
```

---

## Features delivered

### FE-005 - Treatment UI
- New page: `frontend/src/pages/TreatmentPage.tsx`
- API wrappers: `getTreatmentSummary`, `getTreatmentBucket`, `getAccountantQueue`, `setTreatmentFinal`
- New type: `TreatmentSummaryRow`
- Treatment fields added/confirmed on `Transaction` type
- Nav entry added
- Tests: `backend/tests/integration/treatment.test.ts` - 8 tests

### FE-004 - Settings UI
- Rewrote `frontend/src/pages/SettingsPage.tsx` - now shows workspace settings CRUD below health status
- Requires `activeWorkspaceId` prop (updated `App.tsx`)
- Tests: `backend/tests/integration/settings.test.ts` - 7 tests

### POL-001 - Policy Backfill
- New: `backfillPolicyFlagsForBusiness(businessId)` in `policies.service.ts`
- New: `POST /api/policies/:businessId/backfill` endpoint
- Auto-backfill wired into `createPolicy` and `updatePolicy`
- Frontend: "Backfill Existing Transactions" button in `PoliciesPage`
- Tests: `backend/tests/integration/policy-backfill.test.ts` - 7 tests

### REC-001 (partial) - Reconciliation
- Extended `runReconciliationScan` to match `suspected_duplicate` pairs
- Confidence `0.70` for manual duplicate matches vs `0.82` for external-source matches
- Tests: `backend/tests/integration/reconciliation.test.ts` - 9 tests

### Quality pass
- Review history endpoint + UI (5a)
- Graceful shutdown verified + `dbOk` in system status (5b)
- Frontend typecheck clean (5c)
- Test suite stability pass (5d)

---

## Remaining backlog (carry-forward)

| ID | Item | Why deferred |
|---|---|---|
| `REC-001` (remainder) | Full reconciliation redesign (manual matching UI, confidence editing, richer heuristics) | Architectural; this sprint only separated external-source and `suspected_duplicate` matching |
| `FE-002` | Frontend component test coverage | Still no frontend test runner in place; out of scope for this surgical sprint |

---

## Decisions made

| Decision | Location | Rationale |
|---|---|---|
| Policy backfill is synchronous | `backend/src/modules/policies/policies.routes.ts` | Local/small-team use; a job queue is not justified yet |
| Backfill runs on `createPolicy` and `updatePolicy` | `backend/src/modules/policies/policies.service.ts` | Keeps existing transaction flags current without requiring a manual follow-up step |
| Non-JSON settings textarea input is preserved as a string | `frontend/src/pages/SettingsPage.tsx` | Allows editing legacy/raw values without forcing JSON syntax |
| Backend tests stay serial while each file gets its own temp DB | `backend/vitest.config.ts` | Shared DB handle at module scope; serial execution avoids cross-test interference |

---

## Known limitations not addressed

- No frontend tests (React component tests). Requires adding a test runner to `frontend/`.
- No auth or RBAC.
- Schema migration story is still `CREATE TABLE IF NOT EXISTS` only.
- Connector types (`simulated_csv_feed` and `manual_external_file`) are functionally identical.
- Export jobs block the event loop synchronously for large datasets.
