export type Transaction = {
  id: string;
  workspace_id?: string | null;
  date: string;
  vendor: string;
  amount: number;
  description_raw?: string;
  source_type: 'manual' | 'csv_import' | 'document_linked' | 'unknown';
  source_file_id?: string | null;
  business_id?: string | null;
  connector_id?: string | null;
  external_source_id?: string | null;
  status: string;
  category_suggested?: string | null;
  category_final?: string | null;
  business_activity_suggested?: string | null;
  business_activity_final?: string | null;
  confidence_score?: number | null;
  review_status: string;
  duplicate_status?: string | null;
  notes_internal?: string | null;
  business_purpose_note?: string | null;
  policy_flags_json?: string | null;
  evidence_status?: 'missing' | 'linked' | 'weak';
  evidence_count?: number;
  treatment_suggested?: string | null;
  treatment_final?: string | null;
  treatment_confidence?: number | null;
  treatment_reason?: string | null;
  accountant_review_flag?: number | null;
  mixed_use_flag?: number | null;
  excluded_flag?: number | null;
  created_at: string;
  updated_at?: string | null;
};

export type SourceFile = {
  id: string;
  kind: 'csv' | 'document';
  original_name: string;
  stored_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
};

export type Document = {
  id: string;
  workspace_id?: string | null;
  business_id?: string | null;
  source_file_id: string;
  file_name: string;
  mime_type: string;
  uploaded_at: string;
  notes?: string;
  matched_status?: 'matched' | 'unmatched';
  linked_transaction_count?: number;
};

export type EvidenceLink = {
  id: string;
  transaction_id: string;
  document_id: string;
  relation_type?: string;
  strength_status: 'linked' | 'weak';
  business_purpose_note?: string | null;
  created_at: string;
};

export type IngestionJob = {
  id: string;
  job_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  source_file_id?: string | null;
  metadata_json?: string | null;
  created_at: string;
  completed_at?: string | null;
};

export type ImportTemplate = {
  id: string;
  name: string;
  mapping_json: string;
  created_at: string;
  updated_at: string;
};


export type Connector = {
  id: string;
  connector_type: string;
  status: string;
  config_json?: string | null;
  last_sync_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ConnectorSyncJob = {
  id: string;
  connector_id: string;
  status: string;
  metadata_json?: string | null;
  created_at: string;
  completed_at?: string | null;
};

export type ReconciliationCandidate = {
  id: string;
  left_transaction_id: string;
  right_transaction_id: string;
  match_status: 'pending' | 'resolved' | 'rejected';
  confidence?: number | null;
  reason?: string | null;
  left_vendor?: string;
  right_vendor?: string;
  left_amount?: number;
  right_amount?: number;
  left_date?: string;
  right_date?: string;
  created_at: string;
  updated_at: string;
};

export type Business = {
  id: string;
  name: string;
  label_type?: string | null;
  created_at: string;
  updated_at: string;
};

export type PolicyRule = {
  id: string;
  business_id: string;
  rule_type: 'amount_threshold' | 'category_restriction' | 'missing_evidence';
  threshold_value?: number | null;
  category_value?: string | null;
  active: number;
  config_json?: string | null;
  created_at: string;
  updated_at: string;
};


export type Workspace = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  display_name: string;
  email?: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type AppSetting = {
  id: string;
  workspace_id: string;
  key: string;
  value_json: string;
  created_at: string;
  updated_at: string;
};
