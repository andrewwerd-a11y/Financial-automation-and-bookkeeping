import { Router } from 'express';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({
    ok: true,
    phase: 'phase_1_core_intake_backbone',
    backendBaseUrl: `http://localhost:${process.env.PORT ?? 4000}`
  });
});

export default router;
