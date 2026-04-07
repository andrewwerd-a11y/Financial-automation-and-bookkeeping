import { Router } from 'express';
import { z } from 'zod';
import { sendApiError } from '../../shared/http.js';
import { createWorkspace, listWorkspaces } from './workspaces.service.js';

const router = Router();

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1)
});

router.get('/', (_req, res) => {
  res.json(listWorkspaces());
});

router.post('/', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid workspace payload', parsed.error.flatten());
  return res.status(201).json(createWorkspace(parsed.data));
});

export default router;
