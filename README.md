# Financial Intake / Bookkeeping Platform

## Phase 1 — Core intake backbone + basic frontend shell

This phase provides a **minimal full-stack internal tool** to:
1. upload CSV files,
2. upload receipt/document files,
3. create manual transactions,
4. persist core data in SQLite,
5. operate all flows from a plain frontend shell.

No advanced automation, OCR, classification, reconciliation, tax logic, auth, or connector work is included in this phase.

---

## Tech stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + TypeScript + Express
- Database: SQLite (`better-sqlite3`)
- API: REST

---

## Data model (Phase 1)

Implemented tables:
- `transactions`
- `source_files`
- `documents`
- `import_rows_raw`
- `reviews` (placeholder)
- `export_jobs` (placeholder)

---

## What’s included in Phase 1

### Backend
- DB bootstrap/init flow
- CSV upload endpoint (`POST /api/imports/csv`)
- CSV parse + conservative normalization
- Raw CSV row archival
- Normalized transaction creation from valid CSV rows
- Manual transaction create endpoint (`POST /api/transactions`)
- Transactions list endpoint (`GET /api/transactions`)
- Imports/source files list endpoint (`GET /api/imports`)
- Document upload endpoint (`POST /api/documents/upload`)
- Documents list endpoint (`GET /api/documents`)
- Health endpoint (`GET /health`)
- Basic dashboard/system endpoints (`GET /api/dashboard`, `GET /api/system/status`)

### Frontend (plain operational shell)
- Left sidebar navigation
- Top header/status area
- Dashboard screen
- Transactions screen (table + manual entry form)
- Imports screen (CSV upload + list)
- Documents screen (upload + list)
- Settings/System screen (health/status)

---

## Local setup

### 1) Install dependencies

```bash
npm install
```

### 2) Initialize local DB schema

```bash
npm run db:init -w backend
```

### 3) (Optional) seed starter row

```bash
npm run seed -w backend
```

### 4) Run backend

```bash
npm run dev -w backend
```

Backend default URL: `http://localhost:4000`

### 5) Run frontend (separate terminal)

```bash
npm run dev -w frontend
```

Frontend default URL: `http://localhost:5173`

### 6) Run backend tests

```bash
npm run test -w backend
```

---

## API summary

- `GET /health`
- `GET /api/system/status`
- `GET /api/dashboard`
- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/imports`
- `POST /api/imports/csv`
- `GET /api/documents`
- `POST /api/documents/upload`

---

## Known limitations (intentional for Phase 1)

Deferred to later phases:
- auth / users
- connectors (bank/email/marketplace)
- OCR and document parsing
- document-to-transaction matching
- duplicate detection workflows
- classification/tax/review engines
- export generation workflows
- advanced reports
- multi-business and policy controls
- polished UI/branding

---

## Packaging

To create a distributable zip bundle:

```bash
./scripts/package_zip.sh
```

Output:
- `dist/phase1-core-intake-backbone.zip`
