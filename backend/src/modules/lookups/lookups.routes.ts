import { Router } from 'express';
import { db } from '../../db/client.js';

const router = Router();

router.get('/activities', (_req, res) => {
  res.json(db.prepare('SELECT * FROM businesses_or_activities WHERE is_active = 1 ORDER BY name').all());
});

router.get('/categories', (_req, res) => {
  res.json(db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY name').all());
});

export default router;
