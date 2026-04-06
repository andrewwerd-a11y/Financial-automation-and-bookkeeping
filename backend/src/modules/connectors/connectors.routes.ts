import { Router } from 'express';
import { z } from 'zod';
import { sendApiError } from '../../shared/http.js';
import { createConnector, listConnectorSyncJobs, listConnectors, runSimulatedConnectorSync } from './connectors.service.js';

const router = Router();

const createSchema = z.object({
  connectorType: z.enum(['simulated_csv_feed', 'manual_external_file']),
  config: z.record(z.unknown()).optional()
});

router.get('/', (_req, res) => {
  res.json(listConnectors());
});

router.post('/', (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid connector payload', parsed.error.flatten());
  return res.status(201).json(createConnector(parsed.data));
});

router.get('/sync-jobs', (_req, res) => {
  res.json(listConnectorSyncJobs());
});

router.post('/:id/sync', (req, res) => {
  const job = runSimulatedConnectorSync(req.params.id);
  if (!job) return sendApiError(res, 404, 'CONNECTOR_NOT_FOUND', 'Connector not found');
  return res.status(201).json(job);
});

export default router;
