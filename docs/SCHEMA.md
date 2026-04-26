# Database Schema Reference

SQLite, WAL mode. All IDs are prefixed strings (e.g. `txn_`, `doc_`, `evl_`).
Timestamps are ISO-8601 strings via `CURRENT_TIMESTAMP`.

## Core tables

### `transactions`
Central entity. One row per financial event.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | prefix `txn_` |
| date | TEXT | ISO date |
| vendor | TEXT | |
| amount | REAL | |
| description_raw | TEXT | |
| source_type | TEXT | `manual`, `csv_import`, `document_linked`, `unknown` |
| source_file_id | TEXT FK | → source_files |
| workspace_id | TEXT | |
| business_id | TEXT | |
| connector_id | TEXT | |
| external_source_id | TEXT | dedup key for connector imports |
| status | TEXT | default `active` |
| category_suggested | TEXT | classifier output |
| category_final | TEXT | operator override |
| business_activity_suggested | TEXT | |
| business_activity_final | TEXT | |
| confidence_score | REAL | classifier confidence |
| review_status | TEXT | `needs_review`, `approved`, `rejected` |
| duplicate_status | TEXT | `suspected_duplicate`, `resolved`, `rejected` |
| notes_internal | TEXT | |
| business_purpose_note | TEXT | |
| treatment_suggested | TEXT | treatment pipeline output |
| treatment_final | TEXT | operator override |
| treatment_confidence | REAL | |
| treatment_reason | TEXT | |
| accountant_review_flag | INTEGER | 0/1 |
| mixed_use_flag | INTEGER | 0/1 |
| excluded_flag | INTEGER | 0/1 |
| policy_flags_json | TEXT | JSON array of triggered flag names |
| created_at | TEXT | |
| updated_at | TEXT | |

### `documents`
Uploaded receipts, invoices, statements.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | prefix `doc_` |
| workspace_id | TEXT | |
| business_id | TEXT | |
| source_file_id | TEXT FK | → source_files |
| file_name | TEXT | original filename |
| mime_type | TEXT | |
| uploaded_at | TEXT | |
| notes | TEXT | |

### `evidence_links`
Many-to-many join between transactions and documents.

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | prefix `evl_` |
| transaction_id | TEXT FK | → transactions |
| document_id | TEXT FK | → documents |
| relation_type | TEXT | free-form label |
| strength_status | TEXT | `linked` or `weak` |
| business_purpose_note | TEXT | |
| created_at | TEXT | |
| updated_at | TEXT | |

### `source_files`
Raw file metadata for every uploaded file (CSV or document).

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | prefix `src_` |
| kind | TEXT | `csv` or `document` |
| original_name | TEXT | |
| stored_path | TEXT | absolute disk path |
| mime_type | TEXT | |
| size_bytes | INTEGER | |
| uploaded_at | TEXT | |

## Supporting tables

| Table | Purpose |
|---|---|
| `import_rows_raw` | Raw CSV row JSON, one row per parsed line |
| `ingestion_jobs` | Job tracking for CSV imports and connector syncs |
| `import_templates` | Saved column-mapping templates for CSV imports |
| `review_decisions` | Audit log of every review action on a transaction |
| `reviews` | Lightweight review status tracker |
| `export_jobs` | Tracks CSV export requests and file paths |
| `connectors` | Registered external data connectors |
| `connector_sync_jobs` | Per-sync job tracking |
| `reconciliation_candidates` | Pairs of potentially duplicate transactions |
| `businesses` | Business entities within a workspace |
| `policy_rules` | Per-business policy rules evaluated on transaction create |
| `workspaces` | Top-level organizational containers |
| `users` | Operator/user accounts |
| `workspace_members` | Workspace ↔ user membership with role |
| `app_settings` | Workspace-scoped key/value settings |

## Indexes

All FK columns used in WHERE filters have `CREATE INDEX IF NOT EXISTS` entries
at the bottom of `schema.sql`. Indexes are created on first `bootstrapDb()` call
and are idempotent (`IF NOT EXISTS`).

## FK delete order

`clearAllData()` in `db/client.ts` deletes in this order to satisfy FK constraints
(with `foreign_keys = ON`):

1. `import_rows_raw`
2. `evidence_links`
3. `documents`
4. `review_decisions`
5. `reviews`
6. `reconciliation_candidates`
7. `connector_sync_jobs`
8. `export_jobs`
9. `ingestion_jobs`
10. `transactions`
11. `source_files`
12. `workspace_members`
13. `app_settings`
14. `policy_rules`
15. `businesses`
16. `import_templates`
17. `connectors`
18. `users`
19. `workspaces`
