import { db } from '../../db/client.js';

export const getReportSummary = () => {
  const totalsByCategory = db.prepare('SELECT category, SUM(amount) as total FROM transactions GROUP BY category ORDER BY total DESC').all();
  const totalsByActivity = db.prepare('SELECT activity_or_business, SUM(amount) as total FROM transactions GROUP BY activity_or_business ORDER BY total DESC').all();
  const unresolvedCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE review_status = 'pending'").get();
  const evidenceLinkedCount = db.prepare('SELECT COUNT(DISTINCT transaction_id) as count FROM evidence_links').get();
  const reviewNeededCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE confidence_score < 0.65 OR tax_treatment_suggestion = 'needs_review'").get();

  return { totalsByCategory, totalsByActivity, unresolvedCount, evidenceLinkedCount, reviewNeededCount };
};
