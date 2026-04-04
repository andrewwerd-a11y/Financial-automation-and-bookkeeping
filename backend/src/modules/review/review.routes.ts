import { Router } from 'express';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

const router = Router();

router.get('/queue', (_req, res) => {
  const rows = db.prepare(`SELECT t.*, 
      EXISTS (SELECT 1 FROM evidence_links e WHERE e.transaction_id = t.id) as has_evidence
    FROM transactions t
    WHERE t.review_status = 'pending'
       OR t.confidence_score < 0.65
       OR t.category IN ('unclear', 'vehicle', 'meals', 'equipment_computer', 'phone_internet')
       OR t.tax_treatment_suggestion = 'needs_review'
    ORDER BY t.confidence_score ASC, t.date DESC`).all();
  res.json(rows);
});

router.post('/decision', (req, res) => {
  const { transactionId, newCategory, newTreatment, reviewerNote, decisionType } = req.body;
  const existing = db.prepare('SELECT category, tax_treatment_suggestion FROM transactions WHERE id = ?').get(transactionId) as
    | { category: string | null; tax_treatment_suggestion: string | null }
    | undefined;

  if (!existing) return res.status(404).json({ message: 'Transaction not found' });

  db.prepare(`INSERT INTO review_decisions
    (id, transaction_id, previous_category, new_category, previous_treatment, new_treatment, reviewer_note, decision_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    makeId('rvw'), transactionId, existing.category, newCategory, existing.tax_treatment_suggestion, newTreatment, reviewerNote ?? null, decisionType
  );

  db.prepare('UPDATE transactions SET category = ?, tax_treatment_suggestion = ?, review_status = ? WHERE id = ?')
    .run(newCategory ?? existing.category, newTreatment ?? existing.tax_treatment_suggestion, decisionType === 'approve' ? 'approved' : 'pending', transactionId);

  res.status(201).json({ ok: true });
});

export default router;
