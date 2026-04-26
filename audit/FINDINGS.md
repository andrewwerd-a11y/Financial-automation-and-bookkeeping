# Findings Ledger

All findings discovered during the `audit/full-sweep` pass.
Format: open | fixed-in-\<commit\> | wontfix-\<reason\> | needs-decision | tracked-in-docs

---

### F-001 / S-01 — getEvidenceStatusSummary aggregates per-transaction not per-bucket
- **Where:** backend/src/modules/reports/report.service.ts:30–52
- **Severity:** high
- **Type:** bug
- **Reproduce:** POST a transaction with no evidence. GET /api/reports/evidence-status. Response has `count:1` per row instead of aggregated bucket counts.
- **Expected vs actual:** 3 rows max (missing/weak/linked) each with a real count. Got one row per transaction with count=1.
- **Proposed fix:** Wrap inner GROUP BY t.id in a subquery, add outer GROUP BY key.
- **Status:** fixed-in-24b4aba

---

### F-002 / S-02 — seed.ts entrypoint guard broken on Windows
- **Where:** backend/src/db/seed.ts:15
- **Severity:** medium
- **Type:** bug
- **Reproduce:** Run `npm run seed -w backend` on Windows. No output, no seed rows.
- **Expected vs actual:** seed.ts entrypoint block should execute. Does not because `file://${process.argv[1]}` doesn't match `import.meta.url` on Windows.
- **Proposed fix:** Use `pathToFileURL(process.argv[1]).href` as in server.ts.
- **Status:** fixed-in-000f4c7

---

### F-003 / S-03 — clearAllData FK delete order violation
- **Where:** backend/src/db/client.ts:22–41
- **Severity:** critical
- **Type:** bug
- **Reproduce:** Call clearAllData() with foreign_keys = ON. Throws SQLite FK violation because documents is deleted before evidence_links.
- **Expected vs actual:** Should complete without error.
- **Proposed fix:** Move evidence_links DELETE before documents DELETE.
- **Status:** fixed-in-000f4c7

---

### F-004 / S-04 — GET /transactions?businessId skips enrichTransaction
- **Where:** backend/src/modules/transactions/transactions.routes.ts:23–24
- **Severity:** high
- **Type:** inconsistency
- **Reproduce:** Create transaction with businessId. GET /api/transactions?businessId=x. Response lacks evidence_status and evidence_count.
- **Expected vs actual:** Same shape as GET /api/transactions (all).
- **Proposed fix:** Call enrichTransaction on each row in the businessId path.
- **Status:** fixed-in-92e7869

---

### F-005 / S-05 — refreshTreatmentForTransaction never called
- **Where:** backend/src/modules/treatment/treatment.service.ts:111
- **Severity:** high
- **Type:** dead-code / bug
- **Reproduce:** Link evidence to a transaction; GET /api/transactions/:id — treatment fields still reflect the pre-link state.
- **Expected vs actual:** Treatment should reflect current evidence status.
- **Proposed fix:** Call refreshTreatmentForTransaction after link/unlink and review actions.
- **Status:** fixed-in-d39beca

---

### F-006 / S-06 — Evidence link/unlink does not refresh treatment
- **Where:** backend/src/modules/evidence/evidence.routes.ts:23–32
- **Severity:** high
- **Type:** bug
- **Reproduce:** See F-005.
- **Status:** fixed-in-d39beca

---

### F-007 / S-07 — evaluateTransactionPolicies no-ops without businessId
- **Where:** backend/src/modules/policies/policies.service.ts:71
- **Severity:** medium
- **Type:** inconsistency
- **Reproduce:** Create transaction without businessId. No policy flags ever set even if workspace-level policies exist (they don't currently but the function silently bails).
- **Expected vs actual:** Either evaluate workspace-level policies or document intentional gap.
- **Proposed fix:** Document as intended (no workspace-level policies in current design). See DECISIONS.md.
- **Status:** wontfix-by-design (documented in DECISIONS.md)

---

### F-008 / S-08 — PATCH /policies/:id overwrites config_json with {} on active toggle
- **Where:** backend/src/modules/policies/policies.service.ts:51–62
- **Severity:** high
- **Type:** bug
- **Reproduce:** Create policy with config={threshold:100}. PATCH with {active:false}. config_json becomes {}.
- **Expected vs actual:** config_json unchanged when config key omitted in PATCH.
- **Proposed fix:** Only update config_json when input.config is not undefined.
- **Status:** fixed-in-ace4a0b

---

### F-009 / S-09 — reconciliationScan requires external_source_id; manual duplicates never surface
- **Where:** backend/src/modules/reconciliation/reconciliation.service.ts:13–18
- **Severity:** medium
- **Type:** bug
- **Reproduce:** Create two manual transactions with same date/amount. Run /api/reconciliation/scan. No candidates created.
- **Expected vs actual:** Same-date/amount pairs should be candidates regardless of source.
- **Proposed fix:** Remove the `external_source_id IS NOT NULL` guard, or add a second scan for duplicate_status='suspected_duplicate'.
- **Status:** open

---

### F-010 / S-10 — Both connector types execute the same hardcoded generator
- **Where:** backend/src/modules/connectors/connectors.service.ts:26–68
- **Severity:** low
- **Type:** inconsistency
- **Reproduce:** Create connectors of type simulated_csv_feed and manual_external_file. Sync both. Identical transactions.
- **Expected vs actual:** Two connector types differentiated at runtime, or clearly documented as both being "simulated".
- **Proposed fix:** Document in code comment. See DECISIONS.md.
- **Status:** tracked-in-docs/POST_AUDIT_BACKLOG.md

---

### F-011 / S-11 — Export runs synchronously inside request handler; no pending state observable
- **Where:** backend/src/modules/exports/export.service.ts:48–69
- **Severity:** medium
- **Type:** performance / design
- **Reproduce:** POST /api/exports with large DB. Request blocks until file written. DB shows status='processing' only during that window.
- **Expected vs actual:** Large export should run async; status='pending' should be observable.
- **Proposed fix:** For now document the limitation. True async requires a job queue. See DECISIONS.md.
- **Status:** tracked-in-docs/POST_AUDIT_BACKLOG.md

---

### F-012 / S-12 — 12 missing FK declarations in schema.sql
- **Where:** backend/src/db/schema.sql (multiple)
- **Severity:** medium
- **Type:** schema-drift
- **Details:** transactions.{workspace_id,business_id,connector_id}, documents.{workspace_id,business_id}, export_jobs.{workspace_id,business_id}, ingestion_jobs.{workspace_id,business_id,connector_id}, businesses.workspace_id, policy_rules.workspace_id
- **Proposed fix:** Add FK declarations. Note: adding FKs to existing tables in SQLite requires table recreation — document in SCHEMA.md as design debt rather than applying migration.
- **Status:** tracked-in-docs/POST_AUDIT_BACKLOG.md (schema migration required)

---

### F-013 / S-13 — SettingsPage shows only health status; workspace settings unmanageable from UI
- **Where:** frontend/src/pages/SettingsPage.tsx
- **Severity:** low
- **Type:** doc-gap / missing feature
- **Reproduce:** Navigate to Settings. No key/value settings UI.
- **Status:** tracked-in-docs/POST_AUDIT_BACKLOG.md

---

### F-014 / S-14 — No frontend page for Treatment module
- **Where:** frontend nav (App.tsx)
- **Severity:** medium
- **Type:** dead-code (backend routes unreachable from UI)
- **Reproduce:** Treatment endpoints exist and are functional; no nav entry, no page.
- **Status:** tracked-in-docs/POST_AUDIT_BACKLOG.md

---

### F-015 / S-15 — review_decisions table never displayed
- **Where:** backend schema / frontend
- **Severity:** low
- **Type:** doc-gap
- **Reproduce:** Apply review actions. GET /api/review/... — no endpoint exposes review_decisions history.
- **Status:** tracked-in-docs/POST_AUDIT_BACKLOG.md

---

### F-016 / S-16 — PoliciesPage toggle sends config:undefined, overwrites config_json with {}
- **Where:** frontend/src/pages/PoliciesPage.tsx (toggle handler)
- **Severity:** high
- **Type:** bug
- **Reproduce:** Create policy with config. Toggle active in UI. Backend overwrites config.
- **Expected vs actual:** config_json preserved.
- **Proposed fix:** Backend fix (F-008) already applied. Frontend should also avoid sending config key when not changing it.
- **Status:** fixed-in-ace4a0b (backend); frontend tracked as F-016b below

---

### F-016b — PoliciesPage toggle sends full ruleType in PATCH (requires ruleType to always be present)
- **Where:** frontend/src/pages/PoliciesPage.tsx
- **Severity:** low
- **Type:** inconsistency
- **Status:** tracked-in-docs/POST_AUDIT_BACKLOG.md

---

### F-017 / S-17 — frontend/src/api/client.ts hardcoded localhost:4000
- **Where:** frontend/src/api/client.ts:1,25
- **Severity:** medium
- **Type:** bug / deployment blocker
- **Reproduce:** Build frontend with VITE_API_BASE_URL=https://prod.api — app still hits localhost:4000.
- **Status:** fixed-in-a01dea0

---

### F-018 / S-18 — Low test coverage (~7 tests for ~30 routes)
- **Where:** backend/tests/
- **Severity:** high
- **Type:** missing-test
- **Details:** Untested: dashboard, system, treatment (all routes), reconciliation PATCH, evidence note PATCH, policies PATCH, CSV import failure paths, document upload failures.
- **Status:** open (Phase 2 work)

---

### F-019 / S-19 — No frontend tests
- **Where:** frontend/package.json
- **Severity:** medium
- **Type:** missing-test
- **Reproduce:** npm run test -w frontend — no script.
- **Status:** open (Phase 2 work)

---

### F-020 / S-20 — No graceful shutdown; DB not closed on SIGTERM
- **Where:** backend/src/server.ts
- **Severity:** low
- **Type:** bug
- **Propose fix:** Add process.on('SIGINT'/'SIGTERM') that calls db.close() and server.close().
- **Status:** open

---

### F-021 / S-21 — Document upload: no MIME/extension/size validation
- **Where:** backend/src/modules/documents/documents.routes.ts:10–13
- **Severity:** medium
- **Type:** security
- **Reproduce:** POST /api/documents/upload with a 5GB executable. Accepted.
- **Proposed fix:** Add multer fileFilter for allowed MIME types and fileSize limit.
- **Status:** open

---

### F-022 / S-22 — CSV import: no file size cap; large file OOMs papaparse
- **Where:** backend/src/modules/imports/imports.routes.ts:25–28
- **Severity:** medium
- **Type:** security / performance
- **Reproduce:** POST 100MB CSV. Process parses entire file in memory.
- **Proposed fix:** Add multer limits.fileSize (e.g. 10MB).
- **Status:** open

---

### F-023 / S-23 — Missing project files: .env.example, LICENSE, CONTRIBUTING.md, CI workflow, eslint/prettier
- **Where:** repo root
- **Severity:** low
- **Type:** doc-gap
- **Status:** open (Phase 5 work)

---

### F-024 / S-24 — No schema migration story; CREATE TABLE IF NOT EXISTS only
- **Where:** backend/src/db/schema.sql
- **Severity:** medium
- **Type:** schema-drift
- **Reproduce:** Add a column to schema.sql; restart against existing DB — column absent.
- **Proposed fix:** Document in SCHEMA.md; add a schema_version table as guidance for future.
- **Status:** open (Phase 5 documentation)

---

### F-025 / S-25 — DocumentsPage Unlink uses row.id which is evidence_link.id (brittle)
- **Where:** frontend/src/pages/DocumentsPage.tsx (Unlink button)
- **Severity:** low
- **Type:** bug / fragile
- **Details:** Works today because listTransactionsForDocument SELECT puts evidence_links first (SELECT e.*, t.vendor…). If query reordered, row.id becomes transaction.id and unlink silently 404s.
- **Proposed fix:** Rename `id` to `link_id` in the listTransactionsForDocument result or use explicit `e.id as link_id`.
- **Status:** open

---

### F-026 / S-26 — frontend/src/types/index.ts Transaction missing treatment fields; Document missing workspace_id
- **Where:** frontend/src/types/index.ts
- **Severity:** low
- **Type:** schema-drift
- **Details:** Transaction lacks treatment_suggested, treatment_final, treatment_confidence, treatment_reason, accountant_review_flag, mixed_use_flag, excluded_flag, workspace_id, updated_at. Document lacks workspace_id.
- **Status:** open

---

### F-027 / S-27 — CSV upload filename collision at same millisecond
- **Where:** backend/src/modules/imports/imports.routes.ts:27, documents/documents.routes.ts:12
- **Severity:** low
- **Type:** bug
- **Reproduce:** Two simultaneous uploads in the same millisecond produce identical stored filenames.
- **Proposed fix:** Use makeId('upl') instead of Date.now() as filename prefix.
- **Status:** open

---

### F-028 — evidence_links has treatment/policy columns never written
- **Where:** backend/src/db/schema.sql:76–83
- **Severity:** low
- **Type:** dead-code / schema-drift
- **Details:** evidence_links has treatment_suggested, treatment_final, treatment_confidence, treatment_reason, accountant_review_flag, mixed_use_flag, excluded_flag, policy_flags_json — none ever written by any service. These mirror transaction columns but no code populates them.
- **Status:** tracked-in-docs/POST_AUDIT_BACKLOG.md

---

### F-029 — reviews table never used
- **Where:** backend/src/db/schema.sql:101–107
- **Severity:** low
- **Type:** dead-code
- **Details:** reviews table defined in schema, included in clearAllData, but no module reads or writes it.
- **Status:** tracked-in-docs/POST_AUDIT_BACKLOG.md

---

### F-030 — ingestion_jobs.workspace_id / business_id / connector_id written but never queried
- **Where:** backend/src/modules/imports/ingestion.service.ts
- **Severity:** low
- **Type:** dead-code
- **Details:** These fields are set on create but no list/get query filters by them.
- **Status:** tracked-in-docs/POST_AUDIT_BACKLOG.md

---

### F-031 — isExportPathSafe path.sep approach fragile on Windows
- **Where:** backend/src/modules/exports/export.service.ts:78–81
- **Severity:** low
- **Type:** bug (Windows-specific)
- **Details:** `resolved.startsWith(exportsDir + path.sep)` fails if filePath IS exportsDir (no trailing sep). The `|| resolved === exportsDir` handles the equal case but a file one level up that happens to start with the exports dir string could sneak past on case-insensitive FS. Use `path.relative` check instead.
- **Status:** open

---

### F-032 — treatment.routes.ts 404 handler returns non-canonical error shape
- **Where:** backend/src/modules/treatment/treatment.routes.ts:29
- **Severity:** low
- **Type:** inconsistency
- **Details:** Returns `{message:'Not found'}` instead of canonical `{error:{code,message}}` envelope from sendApiError.
- **Status:** open

---

### F-033 — review.routes.ts 404 handler returns non-canonical error shape
- **Where:** backend/src/modules/review/review.routes.ts:29
- **Severity:** low
- **Type:** inconsistency
- **Details:** Returns `{message:'Transaction not found'}` instead of `{error:{code,message}}` envelope.
- **Status:** open

---

### F-034 — evidence.routes.ts link validation error returns non-canonical shape
- **Where:** backend/src/modules/evidence/evidence.routes.ts:25
- **Severity:** low
- **Type:** inconsistency
- **Details:** Returns `parsed.error.flatten()` directly (zod shape) instead of `sendApiError(res, 400, 'VALIDATION_ERROR', ...)`.
- **Status:** open

---

### F-035 — No indexes on high-cardinality FK columns
- **Where:** backend/src/db/schema.sql
- **Severity:** medium
- **Type:** performance
- **Details:** Queries filter by business_id, workspace_id, transaction_id, document_id on tables that can grow large (transactions, evidence_links, documents, policy_rules). No indexes declared beyond PKs. SQLite will full-scan for every filtered list.
- **Proposed fix:** Add CREATE INDEX IF NOT EXISTS statements to schema.sql for the most-queried FK columns.
- **Status:** open

---

### F-036 — businesses.workspace_id is NOT NULL but has no FK constraint
- **Where:** backend/src/db/schema.sql:181
- **Severity:** medium
- **Type:** schema-drift
- **Details:** businesses.workspace_id is declared NOT NULL (enforces presence) but no FOREIGN KEY references workspaces. A workspace that doesn't exist can be referenced freely.
- **Status:** tracked-in-docs/POST_AUDIT_BACKLOG.md (migration required to add FK)
