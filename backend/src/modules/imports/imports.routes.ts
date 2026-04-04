import { Router } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';
import { evaluateRules } from '../rules/rulesEngine.js';
import { normalizeCsvRow, type CsvMapping } from './importHelpers.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/csv/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Missing file' });
  const text = req.file.buffer.toString('utf-8');
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  res.json({ columns: parsed.meta.fields ?? [], sampleRows: parsed.data.slice(0, 20) });
});

router.post('/csv/process', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Missing file' });

  const mapping = JSON.parse((req.body.mapping as string) ?? '{}') as CsvMapping;
  const mapperPresetName = (req.body.mapperPresetName as string | undefined) ?? null;

  const importId = makeId('imp');
  db.prepare(`INSERT INTO import_jobs
    (id, job_type, source_name, original_filename, import_status, metadata_json, raw_row_archive_reference)
    VALUES (?, 'csv_upload', ?, ?, 'processing', ?, ?)`)
    .run(importId, 'manual_upload', req.file.originalname, JSON.stringify({ mapping, mapperPresetName }), `import_job_raw_rows:${importId}`);

  const parsed = Papa.parse<Record<string, string>>(req.file.buffer.toString('utf-8'), { header: true, skipEmptyLines: true });

  const txInsert = db.prepare(`INSERT INTO transactions (
      id, date, vendor, amount, direction, source_account, source_type, raw_description,
      activity_or_business, category, tax_treatment_suggestion, treatment_explanation,
      confidence_score, review_status, duplicate_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const rawInsert = db.prepare('INSERT INTO import_job_raw_rows (id, import_job_id, row_index, raw_row_json, normalized_hash) VALUES (?, ?, ?, ?, ?)');

  let imported = 0;
  let duplicates = 0;

  parsed.data.forEach((row, idx) => {
    rawInsert.run(makeId('raw'), importId, idx, JSON.stringify(row), null);

    const normalized = normalizeCsvRow(row, mapping);
    if (!normalized) return;

    const existing = db.prepare('SELECT id FROM transactions WHERE duplicate_key = ?').get(normalized.duplicateKey) as { id: string } | undefined;
    if (existing) {
      duplicates += 1;
      return;
    }

    const rule = evaluateRules({
      vendor: normalized.vendor,
      rawDescription: normalized.rawDescription,
      amount: normalized.amount,
      direction: normalized.direction,
      activity: undefined,
      category: undefined
    });

    txInsert.run(
      makeId('txn'),
      normalized.date,
      normalized.vendor,
      normalized.amount,
      normalized.direction,
      normalized.sourceAccount,
      'csv',
      normalized.rawDescription ?? null,
      null,
      rule.categorySuggestion ?? null,
      rule.suggestion,
      rule.explanation,
      rule.confidence,
      rule.reviewFlag ? 'pending' : 'approved',
      normalized.duplicateKey
    );
    imported += 1;
  });

  db.prepare('UPDATE import_jobs SET import_status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', importId);

  res.json({ importId, imported, duplicates, totalRows: parsed.data.length });
});

export default router;
