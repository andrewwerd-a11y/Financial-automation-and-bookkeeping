import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

export type IngestionJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export const createIngestionJob = (params: {
  jobType: string;
  sourceFileId?: string | null;
  metadata?: Record<string, unknown>;
}) => {
  const id = makeId('ing');
  db.prepare(`INSERT INTO ingestion_jobs
    (id, job_type, status, source_file_id, metadata_json)
    VALUES (?, ?, 'processing', ?, ?)`)
    .run(id, params.jobType, params.sourceFileId ?? null, JSON.stringify(params.metadata ?? {}));
  return id;
};

export const completeIngestionJob = (id: string, metadata?: Record<string, unknown>) => {
  db.prepare(`UPDATE ingestion_jobs
    SET status = 'completed', metadata_json = ?, completed_at = CURRENT_TIMESTAMP
    WHERE id = ?`)
    .run(JSON.stringify(metadata ?? {}), id);
};

export const failIngestionJob = (id: string, metadata?: Record<string, unknown>) => {
  db.prepare(`UPDATE ingestion_jobs
    SET status = 'failed', metadata_json = ?, completed_at = CURRENT_TIMESTAMP
    WHERE id = ?`)
    .run(JSON.stringify(metadata ?? {}), id);
};

export const listIngestionJobs = () => db.prepare('SELECT * FROM ingestion_jobs ORDER BY created_at DESC, id DESC').all();

export const getIngestionJob = (id: string) =>
  db.prepare('SELECT * FROM ingestion_jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined;

export type ImportTemplateConfig = {
  dateColumn: string;
  vendorColumn: string;
  amountColumn: string;
  descriptionColumn?: string;
};

export const listImportTemplates = () => db.prepare('SELECT * FROM import_templates ORDER BY updated_at DESC').all();

export const getImportTemplate = (id: string) =>
  db.prepare('SELECT * FROM import_templates WHERE id = ?').get(id) as
    | { id: string; name: string; mapping_json: string }
    | undefined;

export const createImportTemplate = (name: string, mapping: ImportTemplateConfig) => {
  const id = makeId('tpl');
  db.prepare(`INSERT INTO import_templates (id, name, mapping_json)
    VALUES (?, ?, ?)`)
    .run(id, name, JSON.stringify(mapping));

  return db.prepare('SELECT * FROM import_templates WHERE id = ?').get(id);
};

export const updateImportTemplate = (id: string, name: string, mapping: ImportTemplateConfig) => {
  db.prepare(`UPDATE import_templates
    SET name = ?, mapping_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`)
    .run(name, JSON.stringify(mapping), id);

  return db.prepare('SELECT * FROM import_templates WHERE id = ?').get(id);
};
