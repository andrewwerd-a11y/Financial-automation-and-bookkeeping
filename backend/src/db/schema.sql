PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS source_files (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('csv', 'document')),
  original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  vendor TEXT NOT NULL,
  amount REAL NOT NULL,
  description_raw TEXT,
  source_type TEXT NOT NULL CHECK(source_type IN ('manual', 'csv_import', 'document_linked', 'unknown')),
  source_file_id TEXT,
  workspace_id TEXT,
  business_id TEXT,
  connector_id TEXT,
  external_source_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  category_suggested TEXT,
  category_final TEXT,
  business_activity_suggested TEXT,
  business_activity_final TEXT,
  confidence_score REAL,
  review_status TEXT NOT NULL DEFAULT 'needs_review',
  duplicate_status TEXT,
  notes_internal TEXT,
  business_purpose_note TEXT,
  treatment_suggested TEXT,
  treatment_final TEXT,
  treatment_confidence REAL,
  treatment_reason TEXT,
  accountant_review_flag INTEGER NOT NULL DEFAULT 0,
  mixed_use_flag INTEGER NOT NULL DEFAULT 0,
  excluded_flag INTEGER NOT NULL DEFAULT 0,
  policy_flags_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(source_file_id) REFERENCES source_files(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  business_id TEXT,
  source_file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY(source_file_id) REFERENCES source_files(id)
);

CREATE TABLE IF NOT EXISTS import_rows_raw (
  id TEXT PRIMARY KEY,
  source_file_id TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  raw_payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(source_file_id) REFERENCES source_files(id)
);

CREATE TABLE IF NOT EXISTS evidence_links (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  relation_type TEXT,
  strength_status TEXT NOT NULL DEFAULT 'linked',
  business_purpose_note TEXT,
  treatment_suggested TEXT,
  treatment_final TEXT,
  treatment_confidence REAL,
  treatment_reason TEXT,
  accountant_review_flag INTEGER NOT NULL DEFAULT 0,
  mixed_use_flag INTEGER NOT NULL DEFAULT 0,
  excluded_flag INTEGER NOT NULL DEFAULT 0,
  policy_flags_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(transaction_id) REFERENCES transactions(id),
  FOREIGN KEY(document_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS review_decisions (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  previous_values TEXT NOT NULL,
  new_values TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);

CREATE TABLE IF NOT EXISTS export_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  business_id TEXT,
  export_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  file_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);


CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source_file_id TEXT,
  workspace_id TEXT,
  business_id TEXT,
  connector_id TEXT,
  external_source_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY(source_file_id) REFERENCES source_files(id)
);

CREATE TABLE IF NOT EXISTS import_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mapping_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS connectors (
  id TEXT PRIMARY KEY,
  connector_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  config_json TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS connector_sync_jobs (
  id TEXT PRIMARY KEY,
  connector_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY(connector_id) REFERENCES connectors(id)
);

CREATE TABLE IF NOT EXISTS reconciliation_candidates (
  id TEXT PRIMARY KEY,
  left_transaction_id TEXT NOT NULL,
  right_transaction_id TEXT NOT NULL,
  match_status TEXT NOT NULL DEFAULT 'pending',
  confidence REAL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(left_transaction_id) REFERENCES transactions(id),
  FOREIGN KEY(right_transaction_id) REFERENCES transactions(id)
);


CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  label_type TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS policy_rules (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  business_id TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  threshold_value REAL,
  category_value TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  config_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(business_id) REFERENCES businesses(id)
);


CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'operator',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);

-- Performance indexes for frequently-queried FK columns
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_id ON transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_review_status ON transactions(review_status);
CREATE INDEX IF NOT EXISTS idx_documents_business_id ON documents(business_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_evidence_links_transaction_id ON evidence_links(transaction_id);
CREATE INDEX IF NOT EXISTS idx_evidence_links_document_id ON evidence_links(document_id);
CREATE INDEX IF NOT EXISTS idx_policy_rules_business_id ON policy_rules(business_id);
CREATE INDEX IF NOT EXISTS idx_policy_rules_workspace_id ON policy_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_raw_source_file_id ON import_rows_raw(source_file_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_source_file_id ON ingestion_jobs(source_file_id);
CREATE INDEX IF NOT EXISTS idx_connector_sync_jobs_connector_id ON connector_sync_jobs(connector_id);
CREATE INDEX IF NOT EXISTS idx_review_decisions_transaction_id ON review_decisions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_workspace_id ON app_settings(workspace_id);
