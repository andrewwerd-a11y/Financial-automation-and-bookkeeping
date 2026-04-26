# Phase 0 Report — Orientation

Branch: `audit/full-sweep`  
Date: 2026-04-26  
Baseline commit: `140cc19` (main HEAD at branch creation)  
Known-blockers cherry-picks applied: 7 commits (000f4c7 → 18fbea0)

---

## Baseline diagnostics

| Check | Result |
|---|---|
| Node version | v24.15.0 |
| npm version | 11.12.1 |
| npm install | ✅ clean (6 moderate vulns, pre-existing) |
| better-sqlite3 rebuild | ✅ required (NMV 127 → 137); fixed |
| npm run typecheck (backend) | ✅ clean |
| npm run typecheck (frontend) | ✅ clean (after adding vite/client types) |
| npm run test -w backend | ✅ 21/21 pass, 709ms |

---

## System characterisation

**Backend:** Express 4 + better-sqlite3 + zod + multer + papaparse. 17 route modules, 1 schema file, no migration tooling. Dev runner: tsx watch. All DB operations are synchronous better-sqlite3 calls; no async IO except file reads (readFileSync) and writes (writeFileSync). Single-process, no worker threads.

**Frontend:** React 18 + Vite. 18 pages wired via in-memory tab switcher in App.tsx. No routing library. Two context values threaded from App: `activeWorkspaceId` and `activeBusinessId`. No frontend tests, no frontend CI.

**Database:** File-backed SQLite WAL mode. Schema applied at boot via `CREATE TABLE IF NOT EXISTS` (no migrations). 19 tables, 12 missing FK declarations (documented).

**Key structural observations:**
- All business logic runs synchronously in request handlers. Large CSV imports and exports block the event loop.
- `refreshTreatmentForTransaction` existed but was unwired until this pass.
- No auth, no RBAC — all endpoints are publicly accessible.
- `evidence_links` carries duplicate treatment/policy columns that are never written.
- `reviews` table is defined but never used by any module.
- Treatment routes exist and work but have no frontend UI.

---

## SYSTEM_MAP.md produced

Covers: all 57 routes × tables, all 18 frontend pages × API calls, FK diagram, CSV import lifecycle.

---

## Seed findings confirmed

All 27 seed findings (S-01 through S-27) verified against the codebase.  
- S-01 through S-08, S-17: **fixed** by cherry-picked commits from audit/known-blockers-pass.  
- S-09 through S-16, S-18 through S-27: **logged in FINDINGS.md**, addressed in subsequent phases.  
- Additional findings F-028 through F-036 discovered during orientation.

---

## CSV import lifecycle (for reference)

`POST /api/imports/csv` → multer writes file to disk → `parseAndImportFile` inserts source_files + ingestion_jobs → PapaParse reads entire file into memory → for each row: `normalizeCsvRow` + `createTransaction` (classifier → treatment → policy eval → DB INSERT) → `import_rows_raw` bulk inserted → ingestion job marked completed → HTTP 201. Entire pipeline runs synchronously in the request handler.
