import { Router } from 'express';
import { z } from 'zod';
import { sendApiError } from '../../shared/http.js';
import { listReconciliationCandidates, runReconciliationScan, updateCandidateStatus } from './reconciliation.service.js';

const router = Router();

const updateSchema = z.object({
  status: z.enum(['resolved', 'rejected'])
});

router.get('/candidates', (_req, res) => {
  res.json(listReconciliationCandidates());
});

router.post('/scan', (_req, res) => {
  res.json(runReconciliationScan());
});

router.patch('/candidates/:id', (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid reconciliation payload', parsed.error.flatten());

  const updated = updateCandidateStatus(req.params.id, parsed.data.status);
  if (!updated) return sendApiError(res, 404, 'CANDIDATE_NOT_FOUND', 'Reconciliation candidate not found');
  return res.json(updated);
});

export default router;
