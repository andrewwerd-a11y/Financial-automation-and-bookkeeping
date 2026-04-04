# Financial Intake, Evidence, Classification, Review, and Tax-Prep Platform (Phase 0)

Phase 0 is a **tax-season rescue MVP** focused on reliable intake, evidence preservation, reviewability, and practical exports.

## What Phase 0 includes

- CSV upload with preview + column mapping + processing
- Raw import row preservation (`import_job_raw_rows`)
- Manual transaction entry
- Document upload (PDF/JPG/PNG) and evidence linking
- Unified ledger with filters
- Rules-driven category/tax-treatment suggestions
- Review queue and review decisions
- Summary reports and CSV exports

## Architecture (modular, Phase-0 scoped)

- `backend/src/modules/imports` — CSV preview/process + mapping normalization helpers
- `backend/src/modules/documents` — upload + link evidence records
- `backend/src/modules/transactions` — create/query/edit transactions
- `backend/src/modules/rules` — heuristic rules engine (tax-year version-ready)
- `backend/src/modules/review` — review queue + decision persistence
- `backend/src/modules/reports` — summary aggregation service + route
- `backend/src/modules/exports` — export job creation + CSV file output
- `backend/src/modules/lookups` — categories/activities lookup
- `backend/src/db` — schema, DB bootstrap/init, seed
- `frontend/src/pages` — ledger/manual/import/documents/review/reports screens

## Local setup (normal development)

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Initialize database schema

```bash
npm run db:init -w backend
```

### Seed sample data

```bash
npm run seed -w backend
```

### Run backend

```bash
npm run dev -w backend
```

Backend default URL: `http://localhost:4000`

### Run frontend (separate terminal)

```bash
npm run dev -w frontend
```

Frontend default URL: `http://localhost:5173`

## Testing

Backend tests include unit, integration, and smoke workflow coverage.

```bash
npm run test -w backend
```

## DB/runtime hardening notes

- DB path is configurable via `FIN_DB_FILE`; default is `backend/data/phase0.db`.
- DB schema bootstrap is idempotent (`CREATE TABLE IF NOT EXISTS`).
- Seed execution is idempotent (`seedIfEmpty`).
- Foreign keys are enabled.
- Server is split into `createApp()` and `startServer()` for testability.

## Known Phase 0 limitations (intentional)

- No bank/card connectors yet (Phase 2)
- No OCR extraction pipeline yet (stores originals + placeholder field)
- No multi-user/workflow approvals yet
- Tax treatment is heuristic guidance, not filing-grade tax computation
- Export formats are practical CSVs, not full accountant packet automation

## Future extension points (without Phase 0 rewrite)

- Tax-year rule packs and versioned rules
- Vendor memory/rule persistence enhancements
- Connector adapters (bank/email/marketplace)
- Richer evidence strength/conflict scoring
- Multi-entity and multi-user ownership dimensions
