import { db } from '../../db/client.js';


export const getOverallSummary = (businessId?: string) => {
  const totalTransactions = businessId
    ? db.prepare('SELECT COUNT(*) as count FROM transactions WHERE business_id = ?').get(businessId)
    : db.prepare('SELECT COUNT(*) as count FROM transactions').get();
  const totalTransactionAmount = businessId
    ? db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE business_id = ?').get(businessId)
    : db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM transactions').get();
  const totalDocuments = businessId
    ? db.prepare('SELECT COUNT(*) as count FROM documents WHERE business_id = ?').get(businessId)
    : db.prepare('SELECT COUNT(*) as count FROM documents').get();
  const totalLinkedEvidenceCount = businessId
    ? db.prepare(`SELECT COUNT(*) as count FROM evidence_links e
        JOIN transactions t ON t.id = e.transaction_id
        WHERE t.business_id = ?`).get(businessId)
    : db.prepare('SELECT COUNT(*) as count FROM evidence_links').get();

  return { totalTransactions, totalTransactionAmount, totalDocuments, totalLinkedEvidenceCount };
};

export const getReviewStatusSummary = (businessId?: string) =>
  businessId
    ? db.prepare(`SELECT review_status as key, COUNT(*) as count
      FROM transactions WHERE business_id = ? GROUP BY review_status ORDER BY count DESC`).all(businessId)
    : db.prepare(`SELECT review_status as key, COUNT(*) as count
      FROM transactions GROUP BY review_status ORDER BY count DESC`).all();

export const getEvidenceStatusSummary = (businessId?: string) =>
  businessId
    ? db.prepare(`SELECT
        CASE
          WHEN COUNT(e.id) = 0 THEN 'missing'
          WHEN SUM(CASE WHEN e.strength_status = 'weak' THEN 1 ELSE 0 END) > 0 THEN 'weak'
          ELSE 'linked'
        END as key,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN evidence_links e ON e.transaction_id = t.id
      WHERE t.business_id = ?
      GROUP BY t.id`).all(businessId)
    : db.prepare(`SELECT
        CASE
          WHEN COUNT(e.id) = 0 THEN 'missing'
          WHEN SUM(CASE WHEN e.strength_status = 'weak' THEN 1 ELSE 0 END) > 0 THEN 'weak'
          ELSE 'linked'
        END as key,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN evidence_links e ON e.transaction_id = t.id
      GROUP BY t.id`).all();

export const getCategorySummary = (businessId?: string) =>
  businessId
    ? db.prepare(`SELECT
        COALESCE(NULLIF(category_final, ''), category_suggested, 'unknown') as key,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM transactions WHERE business_id = ?
      GROUP BY key
      ORDER BY total_amount DESC`).all(businessId)
    : db.prepare(`SELECT
        COALESCE(NULLIF(category_final, ''), category_suggested, 'unknown') as key,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM transactions
      GROUP BY key
      ORDER BY total_amount DESC`).all();

export const getBusinessActivitySummary = (businessId?: string) =>
  businessId
    ? db.prepare(`SELECT
        COALESCE(NULLIF(business_activity_final, ''), business_activity_suggested, 'unknown') as key,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM transactions WHERE business_id = ?
      GROUP BY key
      ORDER BY total_amount DESC`).all(businessId)
    : db.prepare(`SELECT
        COALESCE(NULLIF(business_activity_final, ''), business_activity_suggested, 'unknown') as key,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM transactions
      GROUP BY key
      ORDER BY total_amount DESC`).all();

export const getFullReport = (businessId?: string) => ({
  overall: getOverallSummary(businessId),
  byReviewStatus: getReviewStatusSummary(businessId),
  byEvidenceStatus: getEvidenceStatusSummary(businessId),
  byCategory: getCategorySummary(businessId),
  byBusinessActivity: getBusinessActivitySummary(businessId)
});
