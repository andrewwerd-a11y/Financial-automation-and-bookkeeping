import { Router } from 'express';
import { db } from '../../db/client.js';

const router = Router();

router.get('/', (_req, res) => {
  const totalTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
  const totalDocuments = db.prepare('SELECT COUNT(*) as count FROM documents').get();
  const totalSourceFiles = db.prepare('SELECT COUNT(*) as count FROM source_files').get();
  const totalTransactionAmount = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM transactions').get();
  const totalLinkedEvidenceCount = db.prepare('SELECT COUNT(*) as count FROM evidence_links').get();

  const pendingReviewCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE review_status = 'needs_review'").get();
  const approvedCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE review_status = 'approved'").get();
  const unresolvedUnknownCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE category_suggested = 'unknown' OR category_final IS NULL").get();

  const missingEvidenceCount = db.prepare(`SELECT COUNT(*) as count FROM (
      SELECT t.id
      FROM transactions t LEFT JOIN evidence_links e ON e.transaction_id = t.id
      GROUP BY t.id
      HAVING COUNT(e.id) = 0
    )`).get();

  const unmatchedDocumentsCount = db.prepare(`SELECT COUNT(*) as count FROM (
      SELECT d.id
      FROM documents d LEFT JOIN evidence_links e ON e.document_id = d.id
      GROUP BY d.id
      HAVING COUNT(e.id) = 0
    )`).get();

  const recentTransactions = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10').all();
  const recentDocuments = db.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC LIMIT 10').all();
  const recentSourceFiles = db.prepare('SELECT * FROM source_files ORDER BY uploaded_at DESC LIMIT 10').all();

  const recentIngestionJobs = db.prepare('SELECT * FROM ingestion_jobs ORDER BY created_at DESC LIMIT 8').all();
  const ingestionJobCount = db.prepare('SELECT COUNT(*) as count FROM ingestion_jobs').get();
  const ingestionFailedCount = db.prepare("SELECT COUNT(*) as count FROM ingestion_jobs WHERE status = 'failed'").get();
  const connectorCount = db.prepare('SELECT COUNT(*) as count FROM connectors').get();
  const reconciliationPendingCount = db.prepare("SELECT COUNT(*) as count FROM reconciliation_candidates WHERE match_status = 'pending'").get();

  res.json({
    totalTransactions,
    totalDocuments,
    totalSourceFiles,
    totalTransactionAmount,
    totalLinkedEvidenceCount,
    pendingReviewCount,
    approvedCount,
    unresolvedUnknownCount,
    missingEvidenceCount,
    unmatchedDocumentsCount,
    recentTransactions,
    recentDocuments,
    recentSourceFiles,
    ingestionJobCount,
    ingestionFailedCount,
    recentIngestionJobs,
    connectorCount,
    reconciliationPendingCount
  });
});

export default router;
