import { Router } from 'express';
import {
  getBusinessActivitySummary,
  getCategorySummary,
  getEvidenceStatusSummary,
  getFullReport,
  getOverallSummary,
  getReviewStatusSummary
} from './report.service.js';

const router = Router();

router.get('/summary', (_req, res) => res.json(getFullReport()));
router.get('/overall', (_req, res) => res.json(getOverallSummary()));
router.get('/categories', (_req, res) => res.json(getCategorySummary()));
router.get('/business-activities', (_req, res) => res.json(getBusinessActivitySummary()));
router.get('/review-status', (_req, res) => res.json(getReviewStatusSummary()));
router.get('/evidence-status', (_req, res) => res.json(getEvidenceStatusSummary()));

export default router;
