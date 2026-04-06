# Financial Intake / Bookkeeping Platform

## Phase 2 — Classification and review foundation

Phase 2 extends the Phase 1 intake backbone by adding **basic classification suggestions + review workflow**.

A user can now:
1. ingest transactions via manual entry or CSV,
2. see suggested category/activity/confidence on transactions,
3. view a dedicated review queue,
4. open transaction detail and apply review actions,
5. persist review decisions to the backend.

---

## What Phase 2 adds

### Backend
- Transaction classification fields:
  - `category_suggested`, `category_final`
  - `business_activity_suggested`, `business_activity_final`
  - `confidence_score`
  - `review_status`
  - `duplicate_status`
  - `notes_internal`
- `review_decisions` persistence table for action trace.
- Lightweight classification helper with keyword heuristics.
- Simple confidence scoring and review-needed logic.
- Review queue endpoint and review action endpoint.

### Frontend
- Transactions table now shows suggestion/review columns.
- Transaction detail panel with review actions.
- Dedicated Review Queue screen with simple filters.
- Dashboard now includes pending/approved/unresolved counters.

---

## Review flow (Phase 2)

1. Transaction is created/imported.
2. Backend applies lightweight suggestion heuristics.
3. Backend sets `review_status` (approved or needs_review).
4. Review queue shows items needing action.
5. Operator applies a review action:
   - `approve_suggestion`
   - `reclassify`
   - `change_activity`
   - `mark_personal`
   - `hold`
   - `reject`
6. Backend updates transaction final fields/status and stores a `review_decisions` trace record.

---

## Suggestions and confidence (basic meaning)

- Suggestions are rule-of-thumb keyword matches only.
- `confidence_score` is a simple bounded numeric signal (not ML).
- Unknown/low-confidence/suspected-duplicate items are pushed toward review.

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

## Key API endpoints

- `GET /health`
- `GET /api/system/status`
- `GET /api/dashboard`
- `GET /api/transactions`
- `GET /api/transactions/:id`
- `POST /api/transactions`
- `GET /api/imports`
- `POST /api/imports/csv`
- `GET /api/documents`
- `POST /api/documents/upload`
- `GET /api/review/queue`
- `POST /api/review/actions/:transactionId`

---

## Known limitations (intentional)

Still deferred beyond Phase 2:
- document-to-transaction matching
- evidence strength scoring
- OCR
- tax logic
- connector integrations
- auth/users
- advanced duplicate workflows
- exports generation
- advanced analytics/reporting
- multi-business/policy/billing
- AI/LLM classification

---

## Packaging

```bash
./scripts/package_zip.sh
```

Output:
- `dist/phase2-classification-review-foundation.zip`
