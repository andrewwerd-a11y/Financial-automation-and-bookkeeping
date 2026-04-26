import { Router } from 'express';
import { z } from 'zod';
import { applyReviewAction, getReviewQueue } from './review.service.js';
import { refreshTreatmentForTransaction } from '../treatment/treatment.service.js';
import { sendApiError } from '../../shared/http.js';

const router = Router();

const actionSchema = z.object({
  actionType: z.enum(['approve_suggestion', 'reclassify', 'change_activity', 'mark_personal', 'hold', 'reject']),
  categoryFinal: z.string().optional(),
  businessActivityFinal: z.string().optional(),
  note: z.string().optional()
});

router.get('/queue', (req, res) => {
  const businessId = (req.query.businessId as string | undefined) ?? undefined;
  res.json(getReviewQueue(businessId));
});

router.post('/actions/:transactionId', (req, res) => {
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid review action payload', parsed.error.flatten());

  const updated = applyReviewAction({
    transactionId: req.params.transactionId,
    ...parsed.data
  });

  if (!updated) return sendApiError(res, 404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  refreshTreatmentForTransaction(req.params.transactionId);
  res.status(201).json(updated);
});

export default router;
