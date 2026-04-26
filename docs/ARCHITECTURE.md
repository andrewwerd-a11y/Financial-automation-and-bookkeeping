# Architecture

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 20 |
| Backend framework | Express 4 |
| Database | SQLite (better-sqlite3, WAL mode) |
| Validation | Zod |
| File uploads | Multer |
| CSV parsing | PapaParse |
| Frontend | React 18 + Vite |
| Tests | Vitest + Supertest |

## Backend module structure

Each domain lives in `backend/src/modules/<domain>/`:
- `<domain>.routes.ts` — Express Router, request parsing, error responses
- `<domain>.service.ts` — database queries and business logic (no HTTP concerns)

Shared utilities:
- `src/shared/http.ts` — `sendApiError`, `ApiError`, `errorHandler`, `notFoundHandler`
- `src/shared/id.ts` — `makeId(prefix)` for prefixed KSUID-style IDs
- `src/db/client.ts` — singleton db handle, `bootstrapDb`, `clearAllData`, `getDbFilePath`
- `src/config.runtime.ts` — runtime config (paths, FIN_DB_FILE, FIN_DB_SEED)

## Data flow

```
CSV upload → imports.routes → parseAndImportFile → createTransaction → treatment refresh
                                                                     ↘ policy evaluation

Manual entry → transactions.routes.POST → createTransaction → treatment refresh
                                                            ↘ policy evaluation

Document upload → documents.routes.POST /upload → source_files + documents rows

Evidence link → evidence.routes.POST /links → evidence_links row
                                            → refreshTreatmentForTransaction

Review action → review.routes.POST /:id/actions → review_decisions row
                                               → update transactions.review_status
                                               → refreshTreatmentForTransaction
```

## Treatment pipeline

`refreshTreatmentForTransaction(transactionId)` in `treatment.service.ts`:
1. Fetches transaction + live `evidence_status`
2. Calls `suggestTreatment(...)` to produce a bucket + flags
3. Writes `treatment_suggested`, `treatment_confidence`, `treatment_reason`,
   `accountant_review_flag`, `mixed_use_flag`, `excluded_flag` back to the transaction

`treatment_final` is only written when an operator explicitly overrides via
`PATCH /api/treatment/transactions/:id/final`.

## Policy evaluation

`evaluatePoliciesForTransaction(transactionId, businessId)` in `policies.service.ts`:
1. Loads all active policy rules for the business
2. Checks each rule type (`amount_threshold`, `category_restriction`, `missing_evidence`)
3. Writes a JSON array of triggered flag names to `transactions.policy_flags_json`

Called automatically on `createTransaction` when a `businessId` is present.

## Evidence status derivation

`deriveEvidenceStatus(count, hasWeak)` in `evidence.service.ts`:
- `count === 0` → `missing`
- `count > 0 && hasWeak` → `weak`
- `count > 0 && !hasWeak` → `linked`

Computed on-the-fly; not stored in the database.

## Error response shape

All API errors use `sendApiError` from `src/shared/http.ts`:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

## Frontend

Single-page app with an in-memory tab switcher in `App.tsx` (no routing library).
`frontend/src/api/client.ts` wraps all backend calls with typed fetch helpers.
`frontend/src/types/index.ts` mirrors the backend's DB column names.

API base is configured via `VITE_API_BASE_URL` (defaults to `http://localhost:4000/api`).
