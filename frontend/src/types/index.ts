export type Transaction = {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  description_raw?: string;
  source_type: 'manual' | 'csv_import' | 'document_linked' | 'unknown';
  source_file_id?: string | null;
  status: string;
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
};
