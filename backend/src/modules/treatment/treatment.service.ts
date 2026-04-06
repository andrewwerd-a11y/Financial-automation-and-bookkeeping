import { db } from '../../db/client.js';

export type TreatmentResult = {
  treatmentSuggested: string;
  treatmentConfidence: number;
  treatmentReason: string;
  accountantReviewFlag: number;
  mixedUseFlag: number;
  excludedFlag: number;
};

export const suggestTreatment = (input: {
  categorySuggested?: string | null;
  categoryFinal?: string | null;
  businessActivitySuggested?: string | null;
  businessActivityFinal?: string | null;
  reviewStatus?: string | null;
  evidenceStatus?: 'missing' | 'linked' | 'weak';
  confidenceScore?: number | null;
}): TreatmentResult => {
  const category = (input.categoryFinal || input.categorySuggested || 'unknown').toLowerCase();
  const activity = (input.businessActivityFinal || input.businessActivitySuggested || 'unknown').toLowerCase();
  const reviewStatus = input.reviewStatus || 'needs_review';

  let suggested = 'unknown';
  let confidence = 0.5;
  let reason = 'No direct treatment rule matched.';
  let accountant = 0;
  let mixedUse = 0;
  let excluded = 0;

  if (category.includes('office_equipment') || category.includes('equipment')) {
    suggested = 'asset_candidate';
    confidence = 0.76;
    reason = 'Equipment-like category mapped to asset candidate.';
  } else if (category.includes('inventory')) {
    suggested = 'inventory_candidate';
    confidence = 0.8;
    reason = 'Inventory-like category mapped to inventory candidate.';
  } else if (category.includes('meals')) {
    suggested = 'meals_candidate';
    confidence = 0.62;
    reason = 'Meals are typically special-case and review-sensitive.';
    accountant = 1;
    mixedUse = 1;
  } else if (category.includes('vehicle') || category.includes('fuel') || category.includes('vehicle_repair')) {
    suggested = 'vehicle_candidate';
    confidence = 0.6;
    reason = 'Vehicle-related expense can involve mixed-use allocation.';
    accountant = 1;
    mixedUse = 1;
  } else if (category.includes('shipping') || category.includes('fees') || category.includes('software') || category.includes('office')) {
    suggested = 'current_expense';
    confidence = 0.78;
    reason = 'Operational expense category mapped to current expense.';
  } else if (category.includes('personal')) {
    suggested = 'personal_or_excluded';
    confidence = 0.85;
    reason = 'Personal-marked category likely excluded from business treatment.';
    excluded = 1;
    accountant = 1;
  } else if (activity.includes('startup') || category.includes('startup')) {
    suggested = 'startup_candidate';
    confidence = 0.7;
    reason = 'Startup-like signal detected from category/activity.';
    accountant = 1;
  } else if (activity.includes('organizational') || category.includes('organizational')) {
    suggested = 'organizational_candidate';
    confidence = 0.7;
    reason = 'Organizational-like signal detected from category/activity.';
    accountant = 1;
  }

  if (reviewStatus === 'personal') {
    suggested = 'personal_or_excluded';
    excluded = 1;
    accountant = 1;
    reason = 'Review status marked as personal.';
  }

  if (input.evidenceStatus === 'missing' || input.evidenceStatus === 'weak' || (input.confidenceScore ?? 1) < 0.6 || suggested === 'unknown') {
    accountant = 1;
  }

  if (accountant && suggested === 'unknown') {
    suggested = 'needs_accountant_review';
    reason = 'Insufficient signal or risk flags require accountant review.';
    confidence = Math.min(confidence, 0.5);
  }

  return {
    treatmentSuggested: suggested,
    treatmentConfidence: Number(confidence.toFixed(2)),
    treatmentReason: reason,
    accountantReviewFlag: accountant,
    mixedUseFlag: mixedUse,
    excludedFlag: excluded
  };
};

const evidenceStatusForTransaction = (transactionId: string): 'missing' | 'linked' | 'weak' => {
  const stats = db.prepare(`SELECT COUNT(*) as count,
      SUM(CASE WHEN strength_status = 'weak' THEN 1 ELSE 0 END) as weak_count
    FROM evidence_links WHERE transaction_id = ?`).get(transactionId) as { count: number; weak_count: number | null };

  if ((stats.count ?? 0) === 0) return 'missing';
  if ((stats.weak_count ?? 0) > 0) return 'weak';
  return 'linked';
};

export const refreshTreatmentForTransaction = (transactionId: string) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId) as Record<string, unknown> | undefined;
  if (!tx) return null;

  const treatment = suggestTreatment({
    categorySuggested: (tx.category_suggested as string | null) ?? null,
    categoryFinal: (tx.category_final as string | null) ?? null,
    businessActivitySuggested: (tx.business_activity_suggested as string | null) ?? null,
    businessActivityFinal: (tx.business_activity_final as string | null) ?? null,
    reviewStatus: (tx.review_status as string | null) ?? null,
    confidenceScore: (tx.confidence_score as number | null) ?? null,
    evidenceStatus: evidenceStatusForTransaction(transactionId)
  });

  db.prepare(`UPDATE transactions
    SET treatment_suggested = ?, treatment_confidence = ?, treatment_reason = ?,
        accountant_review_flag = ?, mixed_use_flag = ?, excluded_flag = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`).run(
    treatment.treatmentSuggested,
    treatment.treatmentConfidence,
    treatment.treatmentReason,
    treatment.accountantReviewFlag,
    treatment.mixedUseFlag,
    treatment.excludedFlag,
    transactionId
  );

  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);
};

export const updateTransactionTreatment = (transactionId: string, treatmentFinal: string, note?: string) => {
  db.prepare(`UPDATE transactions
    SET treatment_final = ?, notes_internal = COALESCE(?, notes_internal), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`).run(treatmentFinal, note ?? null, transactionId);

  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);
};

export const treatmentSummary = () => db.prepare(`SELECT
    COALESCE(NULLIF(treatment_final, ''), treatment_suggested, 'unknown') as key,
    COUNT(*) as count,
    COALESCE(SUM(amount), 0) as total_amount
  FROM transactions
  GROUP BY key
  ORDER BY total_amount DESC`).all();

export const accountantQueue = () => db.prepare(`SELECT * FROM transactions
  WHERE accountant_review_flag = 1
     OR mixed_use_flag = 1
     OR excluded_flag = 1
     OR treatment_suggested = 'needs_accountant_review'
  ORDER BY updated_at DESC`).all();

export const treatmentBucketItems = (bucket?: string) => {
  if (!bucket || bucket === 'all') {
    return db.prepare('SELECT * FROM transactions ORDER BY updated_at DESC').all();
  }
  return db.prepare(`SELECT * FROM transactions
    WHERE COALESCE(NULLIF(treatment_final, ''), treatment_suggested, 'unknown') = ?
    ORDER BY updated_at DESC`).all(bucket);
};
