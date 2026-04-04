import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

const router = Router();
const exportsDir = path.join(process.cwd(), 'data', 'exports');
fs.mkdirSync(exportsDir, { recursive: true });

const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')).join('\n');
  return `${headers.join(',')}\n${body}`;
};

router.post('/:type', (req, res) => {
  const type = req.params.type;
  const jobId = makeId('exp');
  db.prepare('INSERT INTO export_jobs (id, export_type, export_status, metadata_json) VALUES (?, ?, ?, ?)').run(jobId, type, 'processing', '{}');

  let rows: Record<string, unknown>[] = [];
  if (type === 'ledger') rows = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all() as Record<string, unknown>[];
  if (type === 'review-queue') rows = db.prepare("SELECT * FROM transactions WHERE review_status = 'pending'").all() as Record<string, unknown>[];
  if (type === 'summary-category') rows = db.prepare('SELECT category, SUM(amount) as total FROM transactions GROUP BY category').all() as Record<string, unknown>[];
  if (type === 'summary-activity') rows = db.prepare('SELECT activity_or_business, SUM(amount) as total FROM transactions GROUP BY activity_or_business').all() as Record<string, unknown>[];
  if (type === 'flagged-special') rows = db.prepare("SELECT * FROM transactions WHERE category IN ('startup_costs', 'organizational_costs', 'equipment_computer')").all() as Record<string, unknown>[];
  if (type === 'unresolved') rows = db.prepare("SELECT * FROM transactions WHERE review_status = 'pending' OR category = 'unclear' OR tax_treatment_suggestion = 'needs_review'").all() as Record<string, unknown>[];

  const filePath = path.join(exportsDir, `${type}-${Date.now()}.csv`);
  fs.writeFileSync(filePath, csv(rows), 'utf-8');

  db.prepare('UPDATE export_jobs SET export_status = ?, file_path = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('completed', filePath, jobId);

  res.json({ jobId, type, filePath, rowCount: rows.length });
});

export default router;
