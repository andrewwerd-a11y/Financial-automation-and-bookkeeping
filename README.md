# Financial Intake / Bookkeeping Platform

## Phase 7 — Automation ingestion layer

Phase 7 focuses on reducing repeated manual CSV intake setup while keeping behavior local, explicit, and extendable.

## What Phase 7 adds

### Backend
- New `ingestion_jobs` model/table for CSV ingestion job tracking:
  - `id`, `job_type`, `status`, `source_file_id`, `metadata_json`, `created_at`, `completed_at`.
- New `import_templates` model/table for reusable CSV mappings:
  - `id`, `name`, `mapping_json`, `created_at`, `updated_at`.
- Import service support for:
  - listing ingestion jobs (`GET /api/imports/jobs`)
  - ingestion job detail (`GET /api/imports/jobs/:id`)
  - listing import templates (`GET /api/imports/templates`)
  - creating templates (`POST /api/imports/templates`)
  - updating templates (`PATCH /api/imports/templates/:id`)
- Import flow enhancements:
  - single CSV import can apply template mapping
  - optional quick inferred template creation (`saveTemplateName`) during single-file import
  - bulk CSV upload endpoint (`POST /api/imports/csv/bulk`)

### Frontend
- New **Ingestion Jobs** screen for status/history/detail visibility.
- New **Import Templates** screen for creating/editing reusable mapping templates.
- Enhanced **Imports** screen:
  - single-file import with optional template
  - bulk upload path
  - ingestion results visibility
- Dashboard now includes ingestion job summary and recent jobs.

---

## Startup / run

### Install dependencies
```bash
npm install
```

### Initialize DB schema
```bash
npm run db:init -w backend
```

### (Optional) seed starter data
```bash
npm run seed -w backend
```

### Run backend
```bash
npm run dev -w backend
```

### Run frontend
```bash
npm run dev -w frontend
```

### Run backend tests
```bash
npm run test -w backend
```

---

## How ingestion jobs work

1. CSV upload creates an ingestion job in `processing` state.
2. Rows are parsed + normalized (default mapping or selected template mapping).
3. Job is marked:
   - `completed` with import counts and metadata, or
   - `failed` with error metadata.
4. Jobs are visible from API + frontend jobs screen.

---

## How saved import templates work

- Templates store explicit CSV column mapping in JSON.
- You can create/update templates from the **Import Templates** screen.
- Imports can apply a template by ID to reuse recurring CSV layouts.

---

## Known limitations

- No live external connectors yet (bank/email/marketplaces).
- No OCR/AI extraction pipeline yet.
- Template inference is intentionally basic (single-file quick-save path).
- No auth/users/permissions yet.
- UI remains operational and desktop-first.

---

## Deferred to later phases

- live ingestion connectors
- advanced reconciliation/dedup across systems
- autonomous ingestion pipelines
- auth and access controls
- design polish and broader automation orchestration
