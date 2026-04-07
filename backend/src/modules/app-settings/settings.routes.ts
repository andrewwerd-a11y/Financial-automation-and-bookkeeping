import { Router } from 'express';
import { z } from 'zod';
import { sendApiError } from '../../shared/http.js';
import { listSettings, upsertSetting } from './settings.service.js';

const router = Router();

const schema = z.object({
  workspaceId: z.string(),
  key: z.string().min(1),
  value: z.unknown()
});

router.get('/', (req, res) => {
  const workspaceId = req.query.workspaceId as string | undefined;
  if (!workspaceId) return sendApiError(res, 400, 'WORKSPACE_REQUIRED', 'workspaceId query param is required');
  return res.json(listSettings(workspaceId));
});

router.post('/', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid settings payload', parsed.error.flatten());
  return res.status(201).json(upsertSetting(parsed.data.workspaceId, parsed.data.key, parsed.data.value));
});

export default router;
