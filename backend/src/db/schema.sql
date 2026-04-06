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
  status TEXT NOT NULL DEFAULT 'active',
  category_suggested TEXT,
  category_final TEXT,
  business_activity_suggested TEXT,
  business_activity_final TEXT,
  confidence_score REAL,
  review_status TEXT NOT NULL DEFAULT 'needs_review',
  duplicate_status TEXT,
  notes_internal TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(source_file_id) REFERENCES source_files(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
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
  export_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
