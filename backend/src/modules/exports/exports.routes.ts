import fs from 'node:fs';
import { Router } from 'express';
import { z } from 'zod';
import { createExportJob, getExportJob, isExportPathSafe, listExportJobs } from './export.service.js';
import { sendApiError } from '../../shared/http.js';

const router = Router();

const createSchema = z.object({
  exportType: z.enum(['transactions', 'documents', 'evidence_links']),
  businessId: z.string().optional()
});

router.post('/', (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid export request', parsed.error.flatten());
  return res.status(201).json(createExportJob(parsed.data.exportType, parsed.data.businessId));
});

router.get('/', (_req, res) => {
  res.json(listExportJobs());
});

router.get('/:id/download', (req, res) => {
  const job = getExportJob(req.params.id);
  if (!job) return sendApiError(res, 404, 'EXPORT_NOT_FOUND', 'Export job not found');
  if (job.status !== 'completed' || !job.file_path) return sendApiError(res, 400, 'EXPORT_NOT_READY', 'Export not ready');
  if (!isExportPathSafe(job.file_path)) return sendApiError(res, 400, 'EXPORT_PATH_INVALID', 'Export path is not valid');
  if (!fs.existsSync(job.file_path)) return sendApiError(res, 404, 'EXPORT_FILE_MISSING', 'Export file is missing');
  return res.download(job.file_path);
});

export default router;
