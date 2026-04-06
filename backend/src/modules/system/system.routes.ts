import { Router } from 'express';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({
    ok: true,
    phase: 'phase_4_reporting_export_foundation',
    backendBaseUrl: `http://localhost:${process.env.PORT ?? 4000}`
  });
});

export default router;
