import { Router } from 'express';
import { getReportSummary } from './reportService.js';

const router = Router();

router.get('/summary', (_req, res) => {
  res.json(getReportSummary());
});

export default router;
