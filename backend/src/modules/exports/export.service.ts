import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

const exportDir = path.join(process.cwd(), 'data', 'exports');
fs.mkdirSync(exportDir, { recursive: true });

const csvEscape = (value: unknown) => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCsv = (rows: Array<Record<string, unknown>>) => {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  const header = columns.join(',');
  const body = rows
    .map((row) => columns.map((col) => csvEscape(row[col])).join(','))
    .join('\n');
  return `${header}\n${body}`;
};

const exportRows = (exportType: 'transactions' | 'documents' | 'evidence_links') => {
  if (exportType === 'transactions') {
    return db.prepare('SELECT * FROM transactions ORDER BY created_at DESC').all() as Array<Record<string, unknown>>;
  }
  if (exportType === 'documents') {
    return db.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC').all() as Array<Record<string, unknown>>;
  }
  return db.prepare('SELECT * FROM evidence_links ORDER BY created_at DESC').all() as Array<Record<string, unknown>>;
};

export const createExportJob = (exportType: 'transactions' | 'documents' | 'evidence_links') => {
  const id = makeId('exp');
  db.prepare('INSERT INTO export_jobs (id, export_type, status) VALUES (?, ?, ?)').run(id, exportType, 'processing');

  const rows = exportRows(exportType);
  const fileName = `${exportType}-${id}.csv`;
  const filePath = path.join(exportDir, fileName);
  fs.writeFileSync(filePath, toCsv(rows), 'utf-8');

  db.prepare('UPDATE export_jobs SET status = ?, file_path = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('completed', filePath, id);

  return db.prepare('SELECT * FROM export_jobs WHERE id = ?').get(id);
};

export const listExportJobs = () => db.prepare('SELECT * FROM export_jobs ORDER BY created_at DESC').all();

export const getExportJob = (id: string) => db.prepare('SELECT * FROM export_jobs WHERE id = ?').get(id) as
  | { id: string; export_type: string; status: string; file_path: string | null }
  | undefined;
