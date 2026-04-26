import { Router } from 'express';
import { z } from 'zod';
import {
  linkEvidence,
  listEvidenceForTransaction,
  listTransactionsForDocument,
  listMissingEvidenceTransactions,
  listUnmatchedDocuments,
  unlinkEvidence,
  updateEvidenceLinkNote
} from './evidence.service.js';
import { refreshTreatmentForTransaction } from '../treatment/treatment.service.js';
import { refreshPolicyFlagsForTransaction } from '../policies/policies.service.js';
import { sendApiError } from '../../shared/http.js';

const router = Router();

const linkSchema = z.object({
  transactionId: z.string(),
  documentId: z.string(),
  relationType: z.string().optional(),
  strengthStatus: z.enum(['linked', 'weak']).optional(),
  businessPurposeNote: z.string().optional()
});

router.post('/links', (req, res) => {
  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid evidence link payload', parsed.error.flatten());
  const link = linkEvidence(parsed.data);
  refreshTreatmentForTransaction(parsed.data.transactionId);
  refreshPolicyFlagsForTransaction(parsed.data.transactionId);
  res.status(201).json(link);
});

router.delete('/links/:id', (req, res) => {
  const transactionId = unlinkEvidence(req.params.id);
  if (transactionId) {
    refreshTreatmentForTransaction(transactionId);
    refreshPolicyFlagsForTransaction(transactionId);
  }
  res.json({ ok: true });
});

router.patch('/links/:id/note', (req, res) => {
  updateEvidenceLinkNote(req.params.id, req.body?.businessPurposeNote as string | undefined);
  res.json({ ok: true });
});

router.get('/transaction/:transactionId', (req, res) => {
  res.json(listEvidenceForTransaction(req.params.transactionId));
});

router.get('/document/:documentId', (req, res) => {
  res.json(listTransactionsForDocument(req.params.documentId));
});

router.get('/queues/missing-transactions', (_req, res) => {
  res.json(listMissingEvidenceTransactions());
});

router.get('/queues/unmatched-documents', (_req, res) => {
  res.json(listUnmatchedDocuments());
});

export default router;
