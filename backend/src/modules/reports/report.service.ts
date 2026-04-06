import { db } from '../../db/client.js';

export const getOverallSummary = () => {
  const totalTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
  const totalTransactionAmount = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM transactions').get();
  const totalDocuments = db.prepare('SELECT COUNT(*) as count FROM documents').get();
  const totalLinkedEvidenceCount = db.prepare('SELECT COUNT(*) as count FROM evidence_links').get();

  return { totalTransactions, totalTransactionAmount, totalDocuments, totalLinkedEvidenceCount };
};

export const getReviewStatusSummary = () => db.prepare(`SELECT review_status as key, COUNT(*) as count
  FROM transactions GROUP BY review_status ORDER BY count DESC`).all();

export const getEvidenceStatusSummary = () => db.prepare(`SELECT
    CASE
      WHEN COUNT(e.id) = 0 THEN 'missing'
      WHEN SUM(CASE WHEN e.strength_status = 'weak' THEN 1 ELSE 0 END) > 0 THEN 'weak'
      ELSE 'linked'
    END as key,
    COUNT(*) as count
  FROM transactions t
  LEFT JOIN evidence_links e ON e.transaction_id = t.id
  GROUP BY t.id`).all();

export const getCategorySummary = () => db.prepare(`SELECT
    COALESCE(NULLIF(category_final, ''), category_suggested, 'unknown') as key,
    COUNT(*) as count,
    COALESCE(SUM(amount), 0) as total_amount
  FROM transactions
  GROUP BY key
  ORDER BY total_amount DESC`).all();

export const getBusinessActivitySummary = () => db.prepare(`SELECT
    COALESCE(NULLIF(business_activity_final, ''), business_activity_suggested, 'unknown') as key,
    COUNT(*) as count,
    COALESCE(SUM(amount), 0) as total_amount
  FROM transactions
  GROUP BY key
  ORDER BY total_amount DESC`).all();

export const getFullReport = () => ({
  overall: getOverallSummary(),
  byReviewStatus: getReviewStatusSummary(),
  byEvidenceStatus: getEvidenceStatusSummary(),
  byCategory: getCategorySummary(),
  byBusinessActivity: getBusinessActivitySummary()
});
