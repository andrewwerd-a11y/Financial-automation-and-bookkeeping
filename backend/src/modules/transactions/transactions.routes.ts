import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';
import { classifyTransaction } from '../classification/classifier.js';

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

  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
};

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ message: 'Not found' });
  res.json(row);
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
