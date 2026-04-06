import { Router } from 'express';
import { getDbFilePath } from '../../db/client.js';
import { runtimeConfig } from '../../config.runtime.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({
    ok: true,
    phase: 'phase_6_reliability_hardening',
    backendBaseUrl: `http://localhost:${process.env.PORT ?? 4000}`,
    dbFile: getDbFilePath(),
    seedEnabled: runtimeConfig.shouldSeed
  });
});

export default router;
