import { Router } from 'express';
import { db, getDbFilePath } from '../../db/client.js';
import { runtimeConfig } from '../../config.runtime.js';

const router = Router();

router.get('/status', (_req, res) => {
  let dbOk = true;
  let transactionCount = 0;

  try {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
    transactionCount = countRow.count ?? 0;
  } catch {
    dbOk = false;
  }

  res.json({
    ok: true,
    dbOk,
    transactionCount,
    phase: 'phase_10_productization',
    backendBaseUrl: `http://localhost:${process.env.PORT ?? 4000}`,
    dbFile: getDbFilePath(),
    seedEnabled: runtimeConfig.shouldSeed
  });
});

export default router;
