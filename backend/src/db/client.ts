import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { paths, runtimeConfig } from '../config.runtime.js';

const dbFile = runtimeConfig.dbFile;

if (dbFile !== ':memory:') {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
}

export const db = new Database(dbFile);
db.pragma('foreign_keys = ON');

export const bootstrapDb = (): void => {
  const schema = fs.readFileSync(paths.schemaFile, 'utf-8');
  db.exec(schema);
};

export const clearAllData = (): void => {
  db.exec(`
    DELETE FROM import_rows_raw;
    DELETE FROM documents;
    DELETE FROM review_decisions;
    DELETE FROM evidence_links;
    DELETE FROM transactions;
    DELETE FROM source_files;
    DELETE FROM reviews;
    DELETE FROM export_jobs;
    DELETE FROM ingestion_jobs;
    DELETE FROM import_templates;
    DELETE FROM connector_sync_jobs;
    DELETE FROM reconciliation_candidates;
    DELETE FROM connectors;
    DELETE FROM policy_rules;
    DELETE FROM businesses;
    DELETE FROM app_settings;
    DELETE FROM workspace_members;
    DELETE FROM users;
    DELETE FROM workspaces;
  `);
};

export const getDbFilePath = () => dbFile;
