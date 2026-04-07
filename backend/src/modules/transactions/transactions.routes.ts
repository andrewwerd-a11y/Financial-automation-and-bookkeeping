import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { listEvidenceForTransaction } from '../evidence/evidence.service.js';
import { createTransaction, getTransactionById, listTransactions, updateTransactionBusinessPurpose } from './transactions.service.js';
import { sendApiError } from '../../shared/http.js';

const router = Router();

const createSchema = z.object({
  date: z.string(),
  vendor: z.string().min(1),
  amount: z.number().positive(),
  description_raw: z.string().optional(),
  businessId: z.string().optional(),
  workspaceId: z.string().optional()
});

router.get('/', (req, res) => {
  const businessId = (req.query.businessId as string | undefined) ?? undefined;
  if (!businessId) return res.json(listTransactions());

  const rows = db.prepare('SELECT * FROM transactions WHERE business_id = ? ORDER BY date DESC, created_at DESC').all(businessId) as Array<Record<string, unknown>>;
  return res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = getTransactionById(req.params.id);
  if (!row) return sendApiError(res, 404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');

  return res.json({
    ...row,
    linked_evidence: listEvidenceForTransaction(req.params.id)
  });
});

router.patch('/:id/business-purpose-note', (req, res) => {
  const row = updateTransactionBusinessPurpose(req.params.id, req.body?.businessPurposeNote ?? null);
  if (!row) return sendApiError(res, 404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  return res.json(row);
});

router.post('/', (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid transaction payload', parsed.error.flatten());
  }

  const payload = parsed.data;
  const created = createTransaction({
    date: payload.date,
    vendor: payload.vendor,
    amount: payload.amount,
    descriptionRaw: payload.description_raw,
    sourceType: 'manual',
    businessId: payload.businessId,
    workspaceId: payload.workspaceId
  });

  return res.status(201).json(created);
});

export default router;
