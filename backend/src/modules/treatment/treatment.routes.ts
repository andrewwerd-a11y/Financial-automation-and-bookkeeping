import { Router } from 'express';
import { z } from 'zod';
import { accountantQueue, treatmentBucketItems, treatmentSummary, updateTransactionTreatment } from './treatment.service.js';

const router = Router();

const updateSchema = z.object({
  treatmentFinal: z.string(),
  note: z.string().optional()
});

router.get('/summary', (_req, res) => {
  res.json(treatmentSummary());
});

router.get('/transactions', (req, res) => {
  res.json(treatmentBucketItems((req.query.bucket as string | undefined) ?? 'all'));
});

router.get('/accountant-queue', (_req, res) => {
  res.json(accountantQueue());
});

router.patch('/transactions/:id/final', (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const updated = updateTransactionTreatment(req.params.id, parsed.data.treatmentFinal, parsed.data.note);
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json(updated);
});

export default router;
