import { Router } from 'express';
import multer from 'multer';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';
import { getDocumentMatchSummary, listTransactionsForDocument } from '../evidence/evidence.service.js';

const upload = multer({ storage: multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/documents'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
}) });

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare(`SELECT d.*, s.original_name, s.size_bytes
    FROM documents d
    JOIN source_files s ON s.id = d.source_file_id
    ORDER BY d.uploaded_at DESC`).all() as Array<Record<string, unknown>>;

  res.json(rows.map((row) => ({ ...row, ...getDocumentMatchSummary(String(row.id)) })));
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`SELECT d.*, s.original_name, s.size_bytes
    FROM documents d
    JOIN source_files s ON s.id = d.source_file_id
    WHERE d.id = ?`).get(req.params.id) as Record<string, unknown> | undefined;

  if (!row) return res.status(404).json({ message: 'Not found' });

  res.json({
    ...row,
    ...getDocumentMatchSummary(req.params.id),
    linked_transactions: listTransactionsForDocument(req.params.id)
  });
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Missing document file' });

  const sourceFileId = makeId('src');
  db.prepare(`INSERT INTO source_files
    (id, kind, original_name, stored_path, mime_type, size_bytes)
    VALUES (?, 'document', ?, ?, ?, ?)`).run(
    sourceFileId,
    req.file.originalname,
    req.file.path,
    req.file.mimetype || 'application/octet-stream',
    req.file.size
  );

  const documentId = makeId('doc');
  db.prepare(`INSERT INTO documents
    (id, source_file_id, file_name, mime_type, notes)
    VALUES (?, ?, ?, ?, ?)`).run(
    documentId,
    sourceFileId,
    req.file.originalname,
    req.file.mimetype || 'application/octet-stream',
    req.body.notes ?? null
  );

  res.status(201).json({ documentId, sourceFileId });
});

export default router;
