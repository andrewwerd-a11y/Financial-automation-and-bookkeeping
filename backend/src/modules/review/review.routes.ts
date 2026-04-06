import { Router } from 'express';
import { z } from 'zod';
import { applyReviewAction, getReviewQueue } from './review.service.js';

const router = Router();

const actionSchema = z.object({
  actionType: z.enum(['approve_suggestion', 'reclassify', 'change_activity', 'mark_personal', 'hold', 'reject']),
  categoryFinal: z.string().optional(),
  businessActivityFinal: z.string().optional(),
  note: z.string().optional()
});

router.get('/queue', (_req, res) => {
  res.json(getReviewQueue());
});

router.post('/actions/:transactionId', (req, res) => {
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const updated = applyReviewAction({
    transactionId: req.params.transactionId,
    ...parsed.data
  });

  if (!updated) return res.status(404).json({ message: 'Transaction not found' });
  res.status(201).json(updated);
});

export default router;
