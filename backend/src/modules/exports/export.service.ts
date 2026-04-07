import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';
import { paths } from '../../config.runtime.js';

fs.mkdirSync(paths.exportsDir, { recursive: true });

const csvEscape = (value: unknown) => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const toCsv = (rows: Array<Record<string, unknown>>) => {
  if (rows.length === 0) return '';

  const columns = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>())).sort();

  const header = columns.join(',');
  const body = rows
    .map((row) => columns.map((col) => csvEscape(row[col])).join(','))
    .join('\n');
  return `${header}\n${body}`;
};

const exportRows = (exportType: 'transactions' | 'documents' | 'evidence_links', businessId?: string) => {
  if (exportType === 'transactions') {
    return businessId
      ? db.prepare('SELECT * FROM transactions WHERE business_id = ? ORDER BY date DESC, id ASC').all(businessId)
      : db.prepare('SELECT * FROM transactions ORDER BY date DESC, id ASC').all() as Array<Record<string, unknown>>;
  }
  if (exportType === 'documents') {
    return businessId
      ? db.prepare('SELECT * FROM documents WHERE business_id = ? ORDER BY uploaded_at DESC, id ASC').all(businessId)
      : db.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC, id ASC').all() as Array<Record<string, unknown>>;
  }
  return businessId
    ? db.prepare(`SELECT e.* FROM evidence_links e JOIN transactions t ON t.id = e.transaction_id WHERE t.business_id = ? ORDER BY e.created_at DESC, e.id ASC`).all(businessId)
    : db.prepare('SELECT * FROM evidence_links ORDER BY created_at DESC, id ASC').all() as Array<Record<string, unknown>>;
};

export const createExportJob = (exportType: 'transactions' | 'documents' | 'evidence_links', businessId?: string) => {
  const id = makeId('exp');
  const workspaceId = businessId
    ? (db.prepare('SELECT workspace_id FROM businesses WHERE id = ?').get(businessId) as { workspace_id: string } | undefined)?.workspace_id ?? null
    : null;
  db.prepare('INSERT INTO export_jobs (id, workspace_id, business_id, export_type, status) VALUES (?, ?, ?, ?, ?)').run(id, workspaceId, businessId ?? null, exportType, 'processing');

  try {
    const rows = exportRows(exportType, businessId);
    const fileName = `${exportType}-${id}.csv`;
    const filePath = path.join(paths.exportsDir, fileName);
    fs.writeFileSync(filePath, toCsv(rows), 'utf-8');

    db.prepare('UPDATE export_jobs SET status = ?, file_path = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('completed', filePath, id);
  } catch (error) {
    console.error('[exports] createExportJob failed', { exportType, id, error });
    db.prepare('UPDATE export_jobs SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('failed', id);
  }

  return db.prepare('SELECT * FROM export_jobs WHERE id = ?').get(id);
};

export const listExportJobs = () => db.prepare('SELECT * FROM export_jobs ORDER BY created_at DESC, id DESC').all();

export const getExportJob = (id: string) => db.prepare('SELECT * FROM export_jobs WHERE id = ?').get(id) as
  | { id: string; export_type: string; status: string; file_path: string | null }
  | undefined;

export const isExportPathSafe = (filePath: string) => {
  const resolved = path.resolve(filePath);
  return resolved.startsWith(path.resolve(paths.exportsDir) + path.sep) || resolved === path.resolve(paths.exportsDir);
};
