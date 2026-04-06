import fs from 'node:fs';
import { Router } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';
import { normalizeCsvRow } from './importHelpers.js';
import { insertTransaction } from '../transactions/transactions.routes.js';

const upload = multer({ storage: multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/csv'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
}) });

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare("SELECT * FROM source_files WHERE kind = 'csv' ORDER BY uploaded_at DESC").all();
  res.json(rows);
});

router.post('/csv', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Missing csv file' });

  const sourceFileId = makeId('src');
  db.prepare(`INSERT INTO source_files
    (id, kind, original_name, stored_path, mime_type, size_bytes)
    VALUES (?, 'csv', ?, ?, ?, ?)`).run(
    sourceFileId,
    req.file.originalname,
    req.file.path,
    req.file.mimetype || 'text/csv',
    req.file.size
  );

  const csvText = fs.readFileSync(req.file.path, 'utf-8');
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true
  });

  let importedCount = 0;
  let skippedCount = 0;

  const insertRaw = db.prepare('INSERT INTO import_rows_raw (id, source_file_id, row_index, raw_payload_json) VALUES (?, ?, ?, ?)');

  parsed.data.forEach((row, idx) => {
    insertRaw.run(makeId('raw'), sourceFileId, idx, JSON.stringify(row));

    const normalized = normalizeCsvRow(row);
    if (!normalized) {
      skippedCount += 1;
      return;
    }

    insertTransaction({
      date: normalized.date,
      vendor: normalized.vendor,
      amount: normalized.amount,
      descriptionRaw: normalized.descriptionRaw || undefined,
      sourceType: 'csv_import',
      sourceFileId
    });

    importedCount += 1;
  });

  res.status(201).json({ sourceFileId, importedCount, skippedCount, totalRows: parsed.data.length });
});

export default router;
