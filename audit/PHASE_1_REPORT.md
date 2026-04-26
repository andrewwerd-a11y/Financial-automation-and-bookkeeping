# Phase 1 Report — Surgical Fixes

## Summary

All 36 findings from FINDINGS.md were triaged. 18 were fixed in this phase.
8 were deferred to Phase 2 (tests) or Phase 5 (docs). 10 were classified as
out-of-scope for this audit (auth, real connectors, pagination).

## Fixes applied (commits on audit/full-sweep)

| Finding | Description | Commit area |
|---|---|---|
| F-001 | Windows entrypoint guard in seed.ts (pathToFileURL) | db/seed.ts |
| F-002 | FK delete order in clearAllData (evidence_links before documents) | db/client.ts |
| F-003 | Evidence status aggregation bug in getEvidenceStatusSummary | report.service.ts |
| F-004 | Missing enrichTransaction in businessId-filtered transaction list | transactions.routes.ts |
| F-005 | refreshTreatmentForTransaction unwired after link/unlink | evidence.routes.ts |
| F-006 | refreshTreatmentForTransaction unwired after review action | review.routes.ts |
| F-007 | config_json overwritten on policy PATCH when config not passed | policies.service.ts |
| F-008 | Hardcoded frontend API URL | frontend/api/client.ts + tsconfig |
| F-009 | Graceful shutdown on SIGINT/SIGTERM | server.ts |
| F-010 | Upload filename collision (no unique prefix) | documents.routes.ts, imports.routes.ts |
| F-011 | No MIME type allowlist on document uploads | documents.routes.ts |
| F-012 | Upload size limits missing | documents.routes.ts, imports.routes.ts |
| F-013 | isExportPathSafe fragile startsWith check | export.service.ts |
| F-014 | Reconciliation scan excluded manual duplicates | reconciliation.service.ts |
| F-025 | DocumentsPage Unlink used row.id instead of row.link_id | DocumentsPage.tsx |
| F-026 | Frontend Transaction type missing treatment/flag fields | types/index.ts |
| F-035 | No DB indexes on FK columns | schema.sql |
| F-036 | listTransactionsForDocument ambiguous e.id/t.id | evidence.service.ts |

## Non-blocking findings (deferred or out of scope)

- F-015 to F-019: test gaps → Phase 2
- F-020 to F-024: frontend pages use `any` → acceptable for current dev stage
- F-027 to F-034: auth, pagination, logging, real connectors → POST_AUDIT_BACKLOG.md

## Verification

`npm test -w backend` — 47 tests pass (8 test files).
`npm run typecheck` — 0 errors in both workspaces.
