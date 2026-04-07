import { Router } from 'express';
import { z } from 'zod';
import { sendApiError } from '../../shared/http.js';
import { createPolicy, listPolicies, updatePolicy } from './policies.service.js';

const router = Router();

const schema = z.object({
  workspaceId: z.string(),
  businessId: z.string(),
  ruleType: z.enum(['amount_threshold', 'category_restriction', 'missing_evidence']),
  thresholdValue: z.number().optional(),
  categoryValue: z.string().optional(),
  active: z.boolean().optional(),
  config: z.record(z.unknown()).optional()
});

const updateSchema = schema.omit({ businessId: true, workspaceId: true });

router.get('/', (req, res) => {
  const workspaceId = (req.query.workspaceId as string | undefined) ?? undefined;
  const businessId = (req.query.businessId as string | undefined) ?? undefined;
  res.json(listPolicies(workspaceId, businessId));
});

router.post('/', (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid policy payload', parsed.error.flatten());
  return res.status(201).json(createPolicy(parsed.data));
});

router.patch('/:id', (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid policy payload', parsed.error.flatten());
  const updated = updatePolicy(req.params.id, parsed.data);
  if (!updated) return sendApiError(res, 404, 'POLICY_NOT_FOUND', 'Policy rule not found');
  return res.json(updated);
});

export default router;
