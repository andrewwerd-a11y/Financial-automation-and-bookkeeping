import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dbFile = process.env.FIN_DB_FILE ?? path.join(process.cwd(), 'data', 'phase3.db');

if (dbFile !== ':memory:') {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
}

export const db = new Database(dbFile);
db.pragma('foreign_keys = ON');

export const bootstrapDb = (): void => {
  const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
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
  `);
};
