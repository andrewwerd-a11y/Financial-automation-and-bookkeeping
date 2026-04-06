import { Router } from 'express';
import { z } from 'zod';
import { createExportJob, getExportJob, listExportJobs } from './export.service.js';

const router = Router();

const createSchema = z.object({
  exportType: z.enum(['transactions', 'documents', 'evidence_links'])
});

router.post('/', (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  res.status(201).json(createExportJob(parsed.data.exportType));
});

router.get('/', (_req, res) => {
  res.json(listExportJobs());
});

router.get('/:id/download', (req, res) => {
  const job = getExportJob(req.params.id);
  if (!job) return res.status(404).json({ message: 'Export job not found' });
  if (job.status !== 'completed' || !job.file_path) return res.status(400).json({ message: 'Export not ready' });
  res.download(job.file_path);
});

export default router;
