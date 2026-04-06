# Financial Intake / Bookkeeping Platform

## Phase 4 — Reporting and export layer

Phase 4 extends Phase 3 by producing practical operational outputs:
- report summaries,
- grouped counts,
- CSV export jobs,
- downloadable export files,
- export history in the UI.

---

## What Phase 4 adds

### Backend
- Reporting service with:
  - overall totals
  - category summary
  - business activity summary
  - review status summary
  - evidence status summary
- Report endpoints:
  - `GET /api/reports/summary`
  - `GET /api/reports/overall`
  - `GET /api/reports/categories`
  - `GET /api/reports/business-activities`
  - `GET /api/reports/review-status`
  - `GET /api/reports/evidence-status`
- Expanded `export_jobs` support:
  - `file_path`
  - `completed_at`
- Export generation (CSV):
  - transactions
  - documents
  - evidence links
- Export APIs:
  - `POST /api/exports`
  - `GET /api/exports`
  - `GET /api/exports/:id/download`

### Frontend
- Dedicated **Reports** screen with summary blocks and grouped tables.
- Dedicated **Exports** screen:
  - create export jobs
  - view export history
  - download completed files
- Dashboard now surfaces additional operational totals (including total amount and linked evidence count).

---

## Reports included

- Overall summary:
  - total transactions
  - total transaction amount
  - total documents
  - total linked evidence count
- Grouped summaries:
  - by category (`category_final` fallback to `category_suggested`)
  - by business activity (`business_activity_final` fallback to suggested)
  - by review status
  - by evidence status

---

## Exports included

- `transactions` CSV
- `documents` CSV
- `evidence_links` CSV

Exports are deterministic CSV files stored locally under backend export storage and tracked in `export_jobs`.

---

## Generate and download exports locally

1. Open **Exports** screen in frontend.
2. Click one of the export buttons.
3. Refresh export list if needed.
4. Use **Download** link for completed export rows.

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

## Known limitations (intentional)

Deferred beyond Phase 4:
- tax treatment/deduction logic
- advanced analytics/charts
- connectors
- OCR/AI matching
- auth/users
- scheduled export jobs
- PDF exports
- accountant packet generation
- multi-business policy layers
- polished UI pass

---

## Packaging

```bash
./scripts/package_zip.sh
```

Output:
- `dist/phase4-reporting-export-foundation.zip`
