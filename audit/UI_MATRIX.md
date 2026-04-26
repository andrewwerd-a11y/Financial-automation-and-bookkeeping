# UI Matrix Verification

Date: 2026-04-26

Scope: every page under `frontend/src/pages/`, verified by code inspection against `frontend/src/api/client.ts` and backend route wiring. Where behavior depended on backend state transitions, it was cross-checked against backend integration tests and route implementations.

## Matrix

| Page | Endpoint(s) called | Loading | Empty | Error | Buttons / forms | Real backend APIs | Refresh after successful action | Known issues | Status |
|---|---|---|---|---|---|---|---|---|---|
| `SetupPage` | none | no | no | no | none | n/a | n/a | Placeholder only; no onboarding flow | deferred |
| `WorkspacePage` | `GET /api/workspaces`, `POST /api/workspaces`, `GET /api/users`, `POST /api/users`, `GET /api/users/workspace-members`, `POST /api/users/workspace-members` | yes | yes (`workspaces`, `members`) | yes | create workspace, create user, add member, select workspace | yes | yes, `load()` after create/add | No success message; member creation has no business/workspace guard beyond current selection | deferred |
| `DashboardPage` | `GET /api/dashboard` | yes | yes | yes | reload | yes | yes | No filters by workspace/business | deferred |
| `BusinessesPage` | `GET /api/businesses?workspaceId=...`, `POST /api/businesses` | yes | yes | yes | create business, select business, refresh | yes | yes | When switching workspaces, existing `activeBusinessId` can point at a business from a prior workspace until a new selection is made | deferred |
| `PoliciesPage` | `GET /api/policies?workspaceId=...&businessId=...`, `POST /api/policies`, `PATCH /api/policies/:id` | yes | yes | yes | create rule, activate/deactivate, refresh | yes | yes | Toggle preserves backend `config_json` because PATCH omits `config`; existing transactions are not recomputed when a rule is created/toggled | mixed: verified + deferred recompute gap |
| `TransactionsPage` | `GET /api/transactions[?businessId=...]`, `GET /api/transactions/:id`, `POST /api/transactions`, `PATCH /api/transactions/:id/business-purpose-note`, `POST /api/evidence/links`, `DELETE /api/evidence/links/:id`, `POST /api/review/actions/:transactionId`, `GET /api/documents[?businessId=...]` | yes | yes | partial (`Error:` text only) | create manual transaction, refresh, open detail, save business purpose note, link document, unlink, apply review action | yes | yes, detail reload + list reload after save/link/unlink/review | Business-filtered list does show `evidence_status` / `evidence_count` because backend enriches filtered rows; treatment fields were not rendered in detail before this pass | fixed now for treatment display |
| `ConnectorsPage` | `GET /api/connectors`, `POST /api/connectors`, `GET /api/connectors/sync-jobs`, `POST /api/connectors/:id/sync` | yes | yes (`connectors`, `jobs`) | yes | create connector, run sync, refresh | yes | yes | No connector configuration editor; both connector types are still simulated | deferred |
| `ReconciliationPage` | `GET /api/reconciliation/candidates`, `POST /api/reconciliation/scan`, `PATCH /api/reconciliation/candidates/:id` | yes | yes | yes | run scan, resolve, reject, refresh | yes | yes | Scan is global same-date/same-amount matching; no business/workspace scoping or richer heuristics | deferred |
| `ReviewQueuePage` | `GET /api/review/queue[?businessId=...]`, `POST /api/review/actions/:transactionId` | yes | yes | yes | filter select, approve, hold, mark personal, refresh | yes | yes | No per-row detail panel, so full review history and treatment changes are not visible here | deferred |
| `MissingEvidencePage` | `GET /api/evidence/queues/missing-transactions` | yes | yes | yes | refresh | yes | yes | Read-only queue | deferred |
| `UnmatchedDocumentsPage` | `GET /api/evidence/queues/unmatched-documents` | yes | yes | yes | refresh | yes | yes | Read-only queue | deferred |
| `ReportsPage` | `GET /api/reports/summary[?businessId=...]` | yes | fallback `No report data available.` | yes | refresh | yes | yes | Evidence-status table renders aggregate rows from `summary.byEvidenceStatus`; there is no direct UI for `/api/reports/evidence-status` | verified |
| `ExportsPage` | `GET /api/exports`, `POST /api/exports`, browser GET to `/api/exports/:id/download` | yes | yes | yes | create three export types, refresh, download link | yes | yes, list reload after create | Download link was hardcoded to `http://localhost:4000/...` instead of using configured API base URL | fixed now |
| `ImportsPage` | `GET /api/imports`, `GET /api/imports/templates`, `POST /api/imports/csv`, `POST /api/imports/csv/bulk` | yes | yes | yes | single CSV upload, bulk upload, template select, save-template-name input, refresh | yes | yes | Upload errors surface through shared error state; success reloads import list but does not reset selected files/template inputs | deferred |
| `IngestionJobsPage` | `GET /api/imports/jobs`, `GET /api/imports/jobs/:id` | yes | yes | yes | refresh, open job | yes | yes | Read-only detail shown as raw JSON | deferred |
| `ImportTemplatesPage` | `GET /api/imports/templates`, `POST /api/imports/templates`, `PATCH /api/imports/templates/:id` | yes | yes | yes | create/edit template, clear form | yes | yes | Editing parses `mapping_json` client-side without guarding malformed saved JSON | deferred |
| `DocumentsPage` | `GET /api/documents[?businessId=...]`, `GET /api/documents/:id`, `POST /api/documents/upload`, `GET /api/transactions[?businessId=...]`, `POST /api/evidence/links`, `DELETE /api/evidence/links/:id` | yes | yes | yes | upload document, refresh, open detail, link transaction, unlink | yes | yes, detail reload + list reload after upload/link/unlink | Unlink uses `row.link_id` from backend evidence data, not transaction id; this wiring is correct after `e64e208` | verified |
| `SettingsPage` | `GET /health`, `GET /api/system/status` | yes | no | yes | refresh status | yes, but only health/system APIs | yes | Backend has `/api/settings` GET/POST client wrappers, but this page does not expose settings CRUD and only shows health/status | deferred |

## Focus Notes

- `SettingsPage`: confirmed gap. `frontend/src/api/client.ts` exposes `listSettings` and `upsertSetting`, but `SettingsPage` only calls `getHealth` and `getSystemStatus`.
- Treatment UI: confirmed missing. Backend mounts `/api/treatment`, but there is no page under `frontend/src/pages/` and no navigation entry for treatment workflows.
- `DocumentsPage` unlink behavior: verified correct. The detail list uses `row.link_id`, and `unlinkEvidence` expects a link id, not a transaction id.
- `ReportsPage` evidence status display: verified. The UI renders `data.byEvidenceStatus`, which comes from backend aggregate report output rather than one row per transaction.
- `TransactionsPage` business filtering: verified. The backend enriches filtered rows with `evidence_status` and `evidence_count`, and the page renders both columns.
- `PoliciesPage` toggle behavior: verified. The frontend PATCH omits `config`, and backend preserves `config_json` when it is omitted.
- `ReconciliationPage` resolve/reject flow: verified. Both buttons PATCH the candidate and then reload the list.
- `ImportsPage` CSV upload errors and success refresh: verified. Failed uploads set `error`; successful uploads set `message` and call `load()`.
- `ExportsPage` export creation and download: verified after fix. Create buttons POST real export jobs, reload the list, and completed jobs now download from the configured API base URL instead of a hardcoded localhost URL.
