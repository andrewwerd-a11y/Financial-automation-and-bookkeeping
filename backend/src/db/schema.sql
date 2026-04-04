PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS businesses_or_activities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  vendor TEXT NOT NULL,
  amount REAL NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('income', 'expense')),
  source_account TEXT,
  source_type TEXT NOT NULL,
  raw_description TEXT,
  activity_or_business TEXT,
  category TEXT,
  tax_treatment_suggestion TEXT,
  treatment_explanation TEXT,
  confidence_score REAL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  duplicate_key TEXT,
  external_source_id TEXT,
  external_transaction_id TEXT,
  rule_version TEXT DEFAULT '2026.phase0.v1',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploaded_documents (
  id TEXT PRIMARY KEY,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_type TEXT NOT NULL,
  parsed_text_placeholder TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS evidence_links (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  link_type TEXT NOT NULL,
  confidence REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(transaction_id) REFERENCES transactions(id),
  FOREIGN KEY(document_id) REFERENCES uploaded_documents(id)
);

CREATE TABLE IF NOT EXISTS tax_treatment_suggestions (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  explanation TEXT NOT NULL,
  confidence REAL NOT NULL,
  review_recommended INTEGER NOT NULL DEFAULT 0,
  matched_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);

CREATE TABLE IF NOT EXISTS review_decisions (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  previous_category TEXT,
  new_category TEXT,
  previous_treatment TEXT,
  new_treatment TEXT,
  reviewer_note TEXT,
  decision_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);

CREATE TABLE IF NOT EXISTS vendor_memory_rules (
  id TEXT PRIMARY KEY,
  vendor_pattern TEXT NOT NULL,
  suggested_category TEXT,
  suggested_activity TEXT,
  suggested_treatment TEXT,
  confidence REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  source_name TEXT,
  original_filename TEXT,
  import_status TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  metadata_json TEXT,
  raw_row_archive_reference TEXT
);

CREATE TABLE IF NOT EXISTS import_job_raw_rows (
  id TEXT PRIMARY KEY,
  import_job_id TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  raw_row_json TEXT NOT NULL,
  normalized_hash TEXT,
  FOREIGN KEY(import_job_id) REFERENCES import_jobs(id)
);

CREATE TABLE IF NOT EXISTS export_jobs (
  id TEXT PRIMARY KEY,
  export_type TEXT NOT NULL,
  export_status TEXT NOT NULL,
  file_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  metadata_json TEXT
);
