export type Transaction = {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  description_raw?: string;
  source_type: 'manual' | 'csv_import' | 'document_linked' | 'unknown';
  source_file_id?: string | null;
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
  evidence_status?: 'missing' | 'linked' | 'weak';
  evidence_count?: number;
  created_at: string;
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
