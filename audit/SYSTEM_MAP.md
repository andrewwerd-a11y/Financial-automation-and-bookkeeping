# System Map

Generated during Phase 0 orientation audit of `audit/full-sweep`.

---

## 1 — Backend route → service → tables

| Method | Route | Handler file | Service functions | Tables written | Tables read |
|--------|-------|-------------|-------------------|----------------|-------------|
| GET | /health | server.ts inline | — | — | — |
| GET | /api/system/status | system/system.routes.ts | — | — | — |
| GET | /api/dashboard | dashboard/dashboard.routes.ts | inline SQL | — | transactions, documents, source_files, evidence_links, ingestion_jobs, connectors, reconciliation_candidates, businesses, policy_rules, workspaces, users |
| GET | /api/transactions | transactions/transactions.routes.ts | listTransactions, enrichTransaction | — | transactions, evidence_links |
| GET | /api/transactions?businessId | transactions/transactions.routes.ts | enrichTransaction (after cherry-pick) | — | transactions, evidence_links |
| GET | /api/transactions/:id | transactions/transactions.routes.ts | getTransactionById, enrichTransaction, listEvidenceForTransaction | — | transactions, evidence_links, documents |
| POST | /api/transactions | transactions/transactions.routes.ts | createTransaction | transactions | transactions, businesses, evidence_links |
| PATCH | /api/transactions/:id/business-purpose-note | transactions/transactions.routes.ts | updateTransactionBusinessPurpose | transactions | transactions, evidence_links |
| GET | /api/imports | imports/imports.routes.ts | inline | — | source_files |
| GET | /api/imports/jobs | imports/imports.routes.ts | listIngestionJobs | — | ingestion_jobs |
| GET | /api/imports/jobs/:id | imports/imports.routes.ts | getIngestionJob | — | ingestion_jobs |
| GET | /api/imports/templates | imports/imports.routes.ts | listImportTemplates | — | import_templates |
| POST | /api/imports/templates | imports/imports.routes.ts | createImportTemplate | import_templates | — |
| PATCH | /api/imports/templates/:id | imports/imports.routes.ts | updateImportTemplate | import_templates | import_templates |
| POST | /api/imports/csv | imports/imports.routes.ts | parseAndImportFile → createTransaction | source_files, import_rows_raw, ingestion_jobs, transactions | source_files, import_templates |
| POST | /api/imports/csv/bulk | imports/imports.routes.ts | parseAndImportFile (×N) | same as above ×N | — |
| GET | /api/documents | documents/documents.routes.ts | getDocumentMatchSummary | — | documents, source_files, evidence_links |
| GET | /api/documents/:id | documents/documents.routes.ts | getDocumentMatchSummary, listTransactionsForDocument | — | documents, source_files, evidence_links, transactions |
| POST | /api/documents/upload | documents/documents.routes.ts | inline | source_files, documents | businesses |
| POST | /api/evidence/links | evidence/evidence.routes.ts | linkEvidence, refreshTreatmentForTransaction | evidence_links, transactions(treatment) | — |
| DELETE | /api/evidence/links/:id | evidence/evidence.routes.ts | unlinkEvidence, refreshTreatmentForTransaction | evidence_links, transactions(treatment) | evidence_links |
| PATCH | /api/evidence/links/:id/note | evidence/evidence.routes.ts | updateEvidenceLinkNote | evidence_links | — |
| GET | /api/evidence/transaction/:id | evidence/evidence.routes.ts | listEvidenceForTransaction | — | evidence_links, documents |
| GET | /api/evidence/document/:id | evidence/evidence.routes.ts | listTransactionsForDocument | — | evidence_links, transactions |
| GET | /api/evidence/queues/missing-transactions | evidence/evidence.routes.ts | listMissingEvidenceTransactions | — | transactions, evidence_links |
| GET | /api/evidence/queues/unmatched-documents | evidence/evidence.routes.ts | listUnmatchedDocuments | — | documents, source_files, evidence_links |
| GET | /api/review/queue | review/review.routes.ts | getReviewQueue | — | transactions |
| POST | /api/review/actions/:transactionId | review/review.routes.ts | applyReviewAction, refreshTreatmentForTransaction | transactions, review_decisions | transactions |
| GET | /api/reports/summary | reports/reports.routes.ts | getFullReport | — | transactions, evidence_links |
| GET | /api/reports/overall | reports/reports.routes.ts | getOverallSummary | — | transactions, documents, evidence_links |
| GET | /api/reports/categories | reports/reports.routes.ts | getCategorySummary | — | transactions |
| GET | /api/reports/business-activities | reports/reports.routes.ts | getBusinessActivitySummary | — | transactions |
| GET | /api/reports/review-status | reports/reports.routes.ts | getReviewStatusSummary | — | transactions |
| GET | /api/reports/evidence-status | reports/reports.routes.ts | getEvidenceStatusSummary | — | transactions, evidence_links |
| POST | /api/exports | exports/exports.routes.ts | createExportJob | export_jobs | transactions/documents/evidence_links, businesses |
| GET | /api/exports | exports/exports.routes.ts | listExportJobs | — | export_jobs |
| GET | /api/exports/:id/download | exports/exports.routes.ts | getExportJob, isExportPathSafe | — | export_jobs |
| GET | /api/treatment/summary | treatment/treatment.routes.ts | treatmentSummary | — | transactions |
| GET | /api/treatment/transactions | treatment/treatment.routes.ts | treatmentBucketItems | — | transactions |
| GET | /api/treatment/accountant-queue | treatment/treatment.routes.ts | accountantQueue | — | transactions |
| PATCH | /api/treatment/transactions/:id/final | treatment/treatment.routes.ts | updateTransactionTreatment | transactions | transactions |
| GET | /api/connectors | connectors/connectors.routes.ts | listConnectors | — | connectors |
| POST | /api/connectors | connectors/connectors.routes.ts | createConnector | connectors | — |
| GET | /api/connectors/sync-jobs | connectors/connectors.routes.ts | listConnectorSyncJobs | — | connector_sync_jobs, connectors |
| POST | /api/connectors/:id/sync | connectors/connectors.routes.ts | runSimulatedConnectorSync → createTransaction | connector_sync_jobs, connectors, transactions | connectors |
| GET | /api/reconciliation/candidates | reconciliation/reconciliation.routes.ts | listReconciliationCandidates | — | reconciliation_candidates, transactions |
| POST | /api/reconciliation/scan | reconciliation/reconciliation.routes.ts | runReconciliationScan | reconciliation_candidates | transactions |
| PATCH | /api/reconciliation/candidates/:id | reconciliation/reconciliation.routes.ts | updateCandidateStatus | reconciliation_candidates | — |
| GET | /api/businesses | businesses/businesses.routes.ts | listBusinesses | — | businesses |
| POST | /api/businesses | businesses/businesses.routes.ts | createBusiness | businesses | — |
| GET | /api/policies | policies/policies.routes.ts | listPolicies | — | policy_rules |
| POST | /api/policies | policies/policies.routes.ts | createPolicy | policy_rules | — |
| PATCH | /api/policies/:id | policies/policies.routes.ts | updatePolicy | policy_rules | policy_rules |
| GET | /api/workspaces | workspaces/workspaces.routes.ts | listWorkspaces | — | workspaces |
| POST | /api/workspaces | workspaces/workspaces.routes.ts | createWorkspace | workspaces | — |
| GET | /api/users | users/users.routes.ts | listUsers | — | users |
| POST | /api/users | users/users.routes.ts | createUser | users | — |
| GET | /api/users/workspace-members | users/users.routes.ts | listWorkspaceMembers | — | workspace_members, users |
| POST | /api/users/workspace-members | users/users.routes.ts | addWorkspaceMember | workspace_members | workspaces, users |
| GET | /api/settings | app-settings/settings.routes.ts | listSettings | — | app_settings |
| POST | /api/settings | app-settings/settings.routes.ts | upsertSetting | app_settings | app_settings |

---

## 2 — Frontend page → API endpoints → App.tsx state

| Page | Primary API endpoints called | App.tsx state consumed |
|------|------------------------------|------------------------|
| SetupPage | (none — placeholder) | — |
| WorkspacePage | listWorkspaces, createWorkspace, listUsers, createUser, listWorkspaceMembers, addWorkspaceMember | activeWorkspaceId (writes via onSelectWorkspace) |
| DashboardPage | getDashboard | — |
| BusinessesPage | listBusinesses, createBusiness | activeWorkspaceId (passes to create), activeBusinessId (writes via onSelectBusiness) |
| PoliciesPage | listPolicies, createPolicy, updatePolicy | activeWorkspaceId, activeBusinessId |
| TransactionsPage | listTransactions(businessId), getTransaction, linkEvidence, unlinkEvidence, applyReviewAction | activeBusinessId |
| ConnectorsPage | listConnectors, createConnector, listConnectorSyncJobs, runConnectorSync | — |
| ReconciliationPage | listReconciliationCandidates, runReconciliationScan, updateReconciliationCandidate | — |
| ReviewQueuePage | listReviewQueue(businessId), applyReviewAction | activeBusinessId |
| MissingEvidencePage | listMissingEvidenceTransactions | — |
| UnmatchedDocumentsPage | listUnmatchedDocuments | — |
| ReportsPage | getReportsSummary(businessId) | activeBusinessId |
| ExportsPage | listExportJobs, createExportJob(businessId) | activeBusinessId |
| ImportsPage | listImports, listImportTemplates, uploadCsv, uploadCsvBulk | activeBusinessId |
| IngestionJobsPage | listIngestionJobs, getIngestionJob | — |
| ImportTemplatesPage | listImportTemplates, createImportTemplate, updateImportTemplate | — |
| DocumentsPage | listDocuments(businessId), uploadDocument, listDocumentLinks, unlinkEvidence | activeBusinessId |
| SettingsPage | getHealth, getSystemStatus | — |

**Missing from nav:** `/api/treatment/*` endpoints — no frontend page exists for Treatment.

---

## 3 — Schema FK map

```
source_files (id PK)
  ← transactions.source_file_id  [FK ✓]
  ← documents.source_file_id     [FK ✓]
  ← import_rows_raw.source_file_id [FK ✓]
  ← ingestion_jobs.source_file_id  [FK ✓]

transactions (id PK)
  .source_file_id → source_files [FK ✓]
  .workspace_id → workspaces     [FK ✗ MISSING]
  .business_id → businesses      [FK ✗ MISSING]
  .connector_id → connectors     [FK ✗ MISSING]
  ← evidence_links.transaction_id [FK ✓]
  ← review_decisions.transaction_id [FK ✓]
  ← reviews.transaction_id        [FK ✓]
  ← reconciliation_candidates.left_transaction_id  [FK ✓]
  ← reconciliation_candidates.right_transaction_id [FK ✓]

documents (id PK)
  .source_file_id → source_files [FK ✓]
  .workspace_id → workspaces     [FK ✗ MISSING]
  .business_id → businesses      [FK ✗ MISSING]
  ← evidence_links.document_id   [FK ✓]

evidence_links (id PK)
  .transaction_id → transactions [FK ✓]
  .document_id → documents       [FK ✓]

review_decisions (id PK)
  .transaction_id → transactions [FK ✓]

reviews (id PK)
  .transaction_id → transactions [FK ✓]

export_jobs (id PK)
  .workspace_id → workspaces     [FK ✗ MISSING]
  .business_id → businesses      [FK ✗ MISSING]

ingestion_jobs (id PK)
  .source_file_id → source_files [FK ✓]
  .workspace_id → workspaces     [FK ✗ MISSING]
  .business_id → businesses      [FK ✗ MISSING]
  .connector_id → connectors     [FK ✗ MISSING]

connector_sync_jobs (id PK)
  .connector_id → connectors     [FK ✓]

reconciliation_candidates (id PK)
  .left_transaction_id → transactions  [FK ✓]
  .right_transaction_id → transactions [FK ✓]

businesses (id PK)
  .workspace_id → workspaces     [FK ✗ MISSING]
  ← policy_rules.business_id     [FK ✓]
  ← transactions.business_id     [FK ✗ MISSING]
  ← documents.business_id        [FK ✗ MISSING]

policy_rules (id PK)
  .workspace_id → workspaces     [FK ✗ MISSING]
  .business_id → businesses      [FK ✓]

workspaces (id PK)
  ← workspace_members.workspace_id [FK ✓]
  ← app_settings.workspace_id      [FK ✓]

users (id PK)
  ← workspace_members.user_id      [FK ✓]
```

**Summary of missing FKs (12 total):**
- transactions: workspace_id, business_id, connector_id
- documents: workspace_id, business_id
- export_jobs: workspace_id, business_id
- ingestion_jobs: workspace_id, business_id, connector_id
- businesses: workspace_id
- policy_rules: workspace_id

---

## 4 — CSV import request lifecycle (2-sentence summary)

A POST to `/api/imports/csv` lands on `parseAndImportFile`, which saves a `source_files` row and an `ingestion_jobs` row, then reads the uploaded file synchronously with PapaParse; each valid row calls `createTransaction` (which runs the classifier, computes treatment flags, evaluates policy rules, and inserts into `transactions`), raw rows go into `import_rows_raw`, and the ingestion job is marked completed before the HTTP response is sent. The entire parse-and-insert loop runs synchronously inside the request handler, blocking the event loop for the duration.
