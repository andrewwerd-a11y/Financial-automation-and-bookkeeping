import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

const router = Router();

const createSchema = z.object({
  date: z.string(),
  vendor: z.string().min(1),
  amount: z.number().positive(),
  description_raw: z.string().optional()
});

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const payload = parsed.data;
  const id = makeId('txn');
  db.prepare(`INSERT INTO transactions
    (id, date, vendor, amount, description_raw, source_type, status)
    VALUES (?, ?, ?, ?, ?, 'manual', 'active')`).run(
    id,
    payload.date,
    payload.vendor,
    payload.amount,
    payload.description_raw ?? null
  );

  const created = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  res.status(201).json(created);
});

export default router;
