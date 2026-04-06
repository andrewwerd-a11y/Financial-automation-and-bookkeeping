import { Router } from 'express';
import { db } from '../../db/client.js';

const router = Router();

router.get('/', (_req, res) => {
  const totalTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
  const totalDocuments = db.prepare('SELECT COUNT(*) as count FROM documents').get();
  const totalSourceFiles = db.prepare('SELECT COUNT(*) as count FROM source_files').get();

  const pendingReviewCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE review_status = 'needs_review'").get();
  const approvedCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE review_status = 'approved'").get();
  const unresolvedUnknownCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE category_suggested = 'unknown' OR category_final IS NULL").get();

  const recentTransactions = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10').all();
  const recentDocuments = db.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC LIMIT 10').all();
  const recentSourceFiles = db.prepare('SELECT * FROM source_files ORDER BY uploaded_at DESC LIMIT 10').all();

  res.json({
    totalTransactions,
    totalDocuments,
    totalSourceFiles,
    pendingReviewCount,
    approvedCount,
    unresolvedUnknownCount,
    recentTransactions,
    recentDocuments,
    recentSourceFiles
  });
});

export default router;
