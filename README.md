# Financial Intake / Bookkeeping Platform

## Phase 3 — Evidence and substantiation engine

Phase 3 extends Phase 2 by making transactions **supportable and traceable** through manual evidence linking.

You can now:
1. link uploaded documents to transactions,
2. unlink evidence links,
3. view evidence status/count on transactions,
4. view document match state and linked transactions,
5. work queues for missing evidence and unmatched documents,
6. store business-purpose notes on transactions and evidence links.

---

## What Phase 3 adds

### Backend
- `evidence_links` table with:
  - `transaction_id`, `document_id`
  - `relation_type`
  - `strength_status` (`linked` / `weak`)
  - `business_purpose_note`
- Transaction evidence derivation:
  - `evidence_status` (`missing` / `linked` / `weak`)
  - `evidence_count`
- Document match derivation:
  - `matched_status` (`matched` / `unmatched`)
  - `linked_transaction_count`
- Evidence APIs:
  - `POST /api/evidence/links`
  - `DELETE /api/evidence/links/:id`
  - `PATCH /api/evidence/links/:id/note`
  - `GET /api/evidence/transaction/:transactionId`
  - `GET /api/evidence/document/:documentId`
  - `GET /api/evidence/queues/missing-transactions`
  - `GET /api/evidence/queues/unmatched-documents`
- Enhanced detail APIs:
  - `GET /api/transactions/:id` includes linked evidence + evidence status
  - `GET /api/documents/:id` includes linked transactions + match state

### Frontend
- Transactions screen:
  - evidence status/count columns
  - transaction detail evidence panel
  - link/unlink controls
  - business-purpose note editing
- Documents screen:
  - matched/unmatched state + linked count
  - document detail with linked transactions
  - manual linking from document to transaction
- New queue views:
  - Missing Evidence queue
  - Unmatched Documents queue

---

## Manual evidence linking workflow

1. Upload transactions (manual/CSV) and upload documents.
2. Open Transaction Detail or Document Detail.
3. Select target document/transaction and create link.
4. Evidence status updates automatically:
   - `missing`: no links
   - `linked`: one+ links, no weak links
   - `weak`: at least one weak link
5. Unlink if needed; queues recalculate from persisted links.

---

## Queue meanings

- **Missing Evidence queue**: transactions with no linked documents.
- **Unmatched Documents queue**: documents not linked to any transaction.

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

Deferred beyond Phase 3:
- OCR / receipt text extraction
- AI evidence matching
- advanced evidence scoring models
- tax treatment logic
- connector integrations
- exports generation / accountant packets
- auth/users
- multi-business/policy/billing
- polished UI pass

---

## Packaging

```bash
./scripts/package_zip.sh
```

Output:
- `dist/phase3-evidence-substantiation-foundation.zip`
