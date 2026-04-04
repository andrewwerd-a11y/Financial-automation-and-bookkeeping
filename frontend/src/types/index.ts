export type Transaction = {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  direction: 'income' | 'expense';
  source_account?: string;
  source_type: string;
  raw_description?: string;
  activity_or_business?: string;
  category?: string;
  tax_treatment_suggestion?: string;
  confidence_score?: number;
  review_status: string;
  notes?: string;
};

export type LookupItem = { id: string; name: string };
