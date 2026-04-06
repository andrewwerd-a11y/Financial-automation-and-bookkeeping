import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';
import { normalizeCsvRow, normalizeCsvRowWithMapping } from './importHelpers.js';
import { createTransaction } from '../transactions/transactions.service.js';
import { paths } from '../../config.runtime.js';
import { sendApiError } from '../../shared/http.js';
import {
  completeIngestionJob,
  createImportTemplate,
  createIngestionJob,
  failIngestionJob,
  getImportTemplate,
  getIngestionJob,
  listImportTemplates,
  listIngestionJobs,
  updateImportTemplate
} from './ingestion.service.js';

const upload = multer({ storage: multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, paths.uploadsCsvDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
}) });

const router = Router();

const templateSchema = z.object({
  name: z.string().min(1),
  mapping: z.object({
    dateColumn: z.string().min(1),
    vendorColumn: z.string().min(1),
    amountColumn: z.string().min(1),
    descriptionColumn: z.string().optional()
  })
});

const parseAndImportFile = (file: Express.Multer.File, opts: { templateId?: string; saveTemplateName?: string }) => {
  const sourceFileId = makeId('src');
  const storedPath = path.resolve(file.path);
  db.prepare(`INSERT INTO source_files
    (id, kind, original_name, stored_path, mime_type, size_bytes)
    VALUES (?, 'csv', ?, ?, ?, ?)`).run(
    sourceFileId,
    file.originalname,
    storedPath,
    file.mimetype || 'text/csv',
    file.size
  );

  const jobId = createIngestionJob({
    jobType: 'csv_import',
    sourceFileId,
    metadata: { fileName: file.originalname, templateId: opts.templateId ?? null }
  });

  try {
    const csvText = fs.readFileSync(storedPath, 'utf-8');
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true
    });

    const insertRaw = db.prepare('INSERT INTO import_rows_raw (id, source_file_id, row_index, raw_payload_json) VALUES (?, ?, ?, ?)');

    let importedCount = 0;
    let skippedCount = 0;

    let mapping: { dateColumn: string; vendorColumn: string; amountColumn: string; descriptionColumn?: string } | null = null;
    if (opts.templateId) {
      const template = getImportTemplate(opts.templateId);
      if (!template) {
        throw new Error(`Template ${opts.templateId} not found`);
      }
      mapping = JSON.parse(template.mapping_json) as typeof mapping;
    }

    parsed.data.forEach((row, idx) => {
      insertRaw.run(makeId('raw'), sourceFileId, idx, JSON.stringify(row));

      const normalized = mapping ? normalizeCsvRowWithMapping(row, mapping) : normalizeCsvRow(row);
      if (!normalized) {
        skippedCount += 1;
        return;
      }

      createTransaction({
        date: normalized.date,
        vendor: normalized.vendor,
        amount: normalized.amount,
        descriptionRaw: normalized.descriptionRaw || undefined,
        sourceType: 'csv_import',
        sourceFileId
      });
      importedCount += 1;
    });

    if (opts.saveTemplateName && parsed.meta.fields?.length) {
      const generatedMapping = {
        dateColumn: parsed.meta.fields.find((f) => f.toLowerCase().includes('date')) ?? parsed.meta.fields[0],
        vendorColumn: parsed.meta.fields.find((f) => ['vendor', 'merchant', 'payee', 'description'].includes(f.toLowerCase())) ?? parsed.meta.fields[1] ?? parsed.meta.fields[0],
        amountColumn: parsed.meta.fields.find((f) => ['amount', 'debit', 'credit'].includes(f.toLowerCase())) ?? parsed.meta.fields[2] ?? parsed.meta.fields[0],
        descriptionColumn: parsed.meta.fields.find((f) => ['description', 'memo', 'notes'].includes(f.toLowerCase()))
      };
      createImportTemplate(opts.saveTemplateName, generatedMapping);
    }

    const metadata = {
      fileName: file.originalname,
      sourceFileId,
      templateId: opts.templateId ?? null,
      importedCount,
      skippedCount,
      totalRows: parsed.data.length
    };

    completeIngestionJob(jobId, metadata);
    return { jobId, ...metadata };
  } catch (error) {
    failIngestionJob(jobId, { message: (error as Error).message, fileName: file.originalname, sourceFileId });
    throw error;
  }
};

router.get('/', (_req, res) => {
  const rows = db.prepare("SELECT * FROM source_files WHERE kind = 'csv' ORDER BY uploaded_at DESC").all();
  res.json(rows);
});

router.get('/jobs', (_req, res) => {
  res.json(listIngestionJobs());
});

router.get('/jobs/:id', (req, res) => {
  const job = getIngestionJob(req.params.id);
  if (!job) return sendApiError(res, 404, 'INGESTION_JOB_NOT_FOUND', 'Ingestion job not found');
  return res.json(job);
});

router.get('/templates', (_req, res) => {
  res.json(listImportTemplates());
});

router.post('/templates', (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid import template payload', parsed.error.flatten());
  return res.status(201).json(createImportTemplate(parsed.data.name, parsed.data.mapping));
});

router.patch('/templates/:id', (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid import template payload', parsed.error.flatten());
  const updated = updateImportTemplate(req.params.id, parsed.data.name, parsed.data.mapping);
  if (!updated) return sendApiError(res, 404, 'IMPORT_TEMPLATE_NOT_FOUND', 'Import template not found');
  return res.json(updated);
});

router.post('/csv', upload.single('file'), (req, res) => {
  if (!req.file) return sendApiError(res, 400, 'MISSING_FILE', 'Missing csv file');

  try {
    const result = parseAndImportFile(req.file, {
      templateId: (req.body?.templateId as string | undefined) || undefined,
      saveTemplateName: (req.body?.saveTemplateName as string | undefined) || undefined
    });
    return res.status(201).json(result);
  } catch (error) {
    return sendApiError(res, 400, 'IMPORT_FAILED', (error as Error).message);
  }
});

router.post('/csv/bulk', upload.array('files', 20), (req, res) => {
  const files = (req.files ?? []) as Express.Multer.File[];
  if (!files.length) return sendApiError(res, 400, 'MISSING_FILES', 'Missing csv files');

  const templateId = (req.body?.templateId as string | undefined) || undefined;
  const results = files.map((file) => {
    try {
      return { fileName: file.originalname, ok: true, result: parseAndImportFile(file, { templateId }) };
    } catch (error) {
      return { fileName: file.originalname, ok: false, error: (error as Error).message };
    }
  });

  return res.status(201).json({
    totalFiles: files.length,
    completed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results
  });
});

export default router;
