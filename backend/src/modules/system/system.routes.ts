import { Router } from 'express';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({
    ok: true,
    phase: 'phase_2_classification_review_foundation',
    backendBaseUrl: `http://localhost:${process.env.PORT ?? 4000}`
  });
});

export default router;
