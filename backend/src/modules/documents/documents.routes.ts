import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

const uploadsDir = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});

const upload = multer({ storage });
const router = Router();

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Missing file' });
  const id = makeId('doc');
  db.prepare(`INSERT INTO uploaded_documents
    (id, original_filename, storage_path, mime_type, source_type, parsed_text_placeholder, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.file.originalname, req.file.path, req.file.mimetype, 'manual_upload', null, req.body.notes ?? null);
  res.status(201).json({ id, filename: req.file.originalname });
});

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM uploaded_documents ORDER BY uploaded_at DESC').all();
  res.json(rows);
});

router.post('/link', (req, res) => {
  const { transactionId, documentId, notes } = req.body as { transactionId: string; documentId: string; notes?: string };
  db.prepare('INSERT INTO evidence_links (id, transaction_id, document_id, link_type, confidence, notes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(makeId('evl'), transactionId, documentId, 'manual', 1, notes ?? null);
  res.status(201).json({ ok: true });
});

export default router;
