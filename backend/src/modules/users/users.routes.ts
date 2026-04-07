import { Router } from 'express';
import { z } from 'zod';
import { sendApiError } from '../../shared/http.js';
import { addWorkspaceMember, createUser, listUsers, listWorkspaceMembers } from './users.service.js';

const router = Router();

const userSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email().optional(),
  role: z.string().optional()
});

const memberSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  role: z.string().optional()
});

router.get('/', (_req, res) => {
  res.json(listUsers());
});

router.post('/', (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid user payload', parsed.error.flatten());
  return res.status(201).json(createUser(parsed.data));
});

router.get('/workspace-members', (req, res) => {
  const workspaceId = (req.query.workspaceId as string | undefined) ?? undefined;
  return res.json(listWorkspaceMembers(workspaceId));
});

router.post('/workspace-members', (req, res) => {
  const parsed = memberSchema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid membership payload', parsed.error.flatten());
  return res.status(201).json(addWorkspaceMember(parsed.data));
});

export default router;
