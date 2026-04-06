import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';
import { classifyTransaction } from '../classification/classifier.js';
import { getTransactionEvidenceSummary } from '../evidence/evidence.service.js';
import { suggestTreatment } from '../treatment/treatment.service.js';

export const enrichTransaction = (row: Record<string, unknown>) => {
  const evidence = getTransactionEvidenceSummary(String(row.id));
  return { ...row, ...evidence };
};

export const listTransactions = () => {
  const rows = db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC').all() as Array<Record<string, unknown>>;
  return rows.map(enrichTransaction);
};

export const getTransactionById = (id: string) => {
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return enrichTransaction(row);
};

export const updateTransactionBusinessPurpose = (id: string, businessPurposeNote: string | null) => {
  db.prepare('UPDATE transactions SET business_purpose_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(businessPurposeNote, id);
  return getTransactionById(id);
};

export const createTransaction = (params: {
  date: string;
  vendor: string;
  amount: number;
  descriptionRaw?: string;
  sourceType: 'manual' | 'csv_import' | 'document_linked' | 'unknown';
  sourceFileId?: string;
  connectorId?: string;
  externalSourceId?: string;
}) => {
  const duplicate = db.prepare('SELECT id FROM transactions WHERE date = ? AND vendor = ? AND amount = ? LIMIT 1')
    .get(params.date, params.vendor, params.amount) as { id: string } | undefined;
  const duplicateStatus = duplicate ? 'suspected_duplicate' : null;

  const suggestion = classifyTransaction(params.vendor, params.descriptionRaw, duplicateStatus ?? undefined);
  const treatment = suggestTreatment({
    categorySuggested: suggestion.categorySuggested,
    businessActivitySuggested: suggestion.businessActivitySuggested,
    reviewStatus: suggestion.reviewStatus,
    evidenceStatus: 'missing',
    confidenceScore: suggestion.confidenceScore
  });

  const id = makeId('txn');
  db.prepare(`INSERT INTO transactions
    (id, date, vendor, amount, description_raw, source_type, source_file_id, connector_id, external_source_id, status,
      category_suggested, business_activity_suggested, confidence_score, review_status, duplicate_status,
      treatment_suggested, treatment_confidence, treatment_reason, accountant_review_flag, mixed_use_flag, excluded_flag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`) 
    .run(
      id,
      params.date,
      params.vendor,
      params.amount,
      params.descriptionRaw ?? null,
      params.sourceType,
      params.sourceFileId ?? null,
      params.connectorId ?? null,
      params.externalSourceId ?? null,
      suggestion.categorySuggested,
      suggestion.businessActivitySuggested,
      suggestion.confidenceScore,
      suggestion.reviewStatus,
      duplicateStatus,
      treatment.treatmentSuggested,
      treatment.treatmentConfidence,
      treatment.treatmentReason,
      treatment.accountantReviewFlag,
      treatment.mixedUseFlag,
      treatment.excludedFlag
    );

  return getTransactionById(id);
};
