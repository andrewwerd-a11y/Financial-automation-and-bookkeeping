import { Router } from 'express';
import { z } from 'zod';
import { sendApiError } from '../../shared/http.js';
import { createBusiness, listBusinesses } from './businesses.service.js';

const router = Router();

const createSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1),
  labelType: z.string().optional()
});

router.get('/', (req, res) => {
  const workspaceId = (req.query.workspaceId as string | undefined) ?? undefined;
  res.json(listBusinesses(workspaceId));
});

router.post('/', (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid business payload', parsed.error.flatten());
  return res.status(201).json(createBusiness(parsed.data));
});

export default router;
