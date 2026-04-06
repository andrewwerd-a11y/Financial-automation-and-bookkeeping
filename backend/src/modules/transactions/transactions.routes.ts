import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';
import { classifyTransaction } from '../classification/classifier.js';
import { getTransactionEvidenceSummary, listEvidenceForTransaction } from '../evidence/evidence.service.js';

const router = Router();

const createSchema = z.object({
  date: z.string(),
  vendor: z.string().min(1),
  amount: z.number().positive(),
  description_raw: z.string().optional()
});

const insertTransaction = (params: {
  date: string;
  vendor: string;
  amount: number;
  descriptionRaw?: string;
  sourceType: 'manual' | 'csv_import' | 'document_linked' | 'unknown';
  sourceFileId?: string;
}) => {
  const duplicate = db.prepare('SELECT id FROM transactions WHERE date = ? AND vendor = ? AND amount = ? LIMIT 1')
    .get(params.date, params.vendor, params.amount) as { id: string } | undefined;
  const duplicateStatus = duplicate ? 'suspected_duplicate' : null;

  const suggestion = classifyTransaction(params.vendor, params.descriptionRaw, duplicateStatus ?? undefined);

  const id = makeId('txn');
  db.prepare(`INSERT INTO transactions
    (id, date, vendor, amount, description_raw, source_type, source_file_id, status,
      category_suggested, business_activity_suggested, confidence_score, review_status, duplicate_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`)
    .run(
      id,
      params.date,
      params.vendor,
      params.amount,
      params.descriptionRaw ?? null,
      params.sourceType,
      params.sourceFileId ?? null,
      suggestion.categorySuggested,
      suggestion.businessActivitySuggested,
      suggestion.confidenceScore,
      suggestion.reviewStatus,
      duplicateStatus
    );

  const created = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Record<string, unknown>;
  return { ...created, ...getTransactionEvidenceSummary(id) };
};

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC').all() as Array<Record<string, unknown>>;
  const enriched = rows.map((row) => ({ ...row, ...getTransactionEvidenceSummary(String(row.id)) }));
  res.json(enriched);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ message: 'Not found' });

  res.json({
    ...row,
    ...getTransactionEvidenceSummary(req.params.id),
    linked_evidence: listEvidenceForTransaction(req.params.id)
  });
});

router.patch('/:id/business-purpose-note', (req, res) => {
  db.prepare('UPDATE transactions SET business_purpose_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(req.body?.businessPurposeNote ?? null, req.params.id);

  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ message: 'Not found' });
  res.json({ ...row, ...getTransactionEvidenceSummary(req.params.id) });
});

router.post('/', (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const payload = parsed.data;
  const created = insertTransaction({
    date: payload.date,
    vendor: payload.vendor,
    amount: payload.amount,
    descriptionRaw: payload.description_raw,
    sourceType: 'manual'
  });

  res.status(201).json(created);
});

export { insertTransaction };
export default router;
