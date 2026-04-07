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

const bid = (value: unknown) => (value as string | undefined) ?? undefined;

router.get('/summary', (req, res) => res.json(getFullReport(bid(req.query.businessId))));
router.get('/overall', (req, res) => res.json(getOverallSummary(bid(req.query.businessId))));
router.get('/categories', (req, res) => res.json(getCategorySummary(bid(req.query.businessId))));
router.get('/business-activities', (req, res) => res.json(getBusinessActivitySummary(bid(req.query.businessId))));
router.get('/review-status', (req, res) => res.json(getReviewStatusSummary(bid(req.query.businessId))));
router.get('/evidence-status', (req, res) => res.json(getEvidenceStatusSummary(bid(req.query.businessId))));

export default router;
