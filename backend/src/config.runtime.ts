import path from 'node:path';

const resolveFromCwd = (...parts: string[]) => path.resolve(process.cwd(), ...parts);

export const runtimeConfig = {
  appRoot: process.cwd(),
  dataDir: process.env.FIN_DATA_DIR ? path.resolve(process.env.FIN_DATA_DIR) : resolveFromCwd('data'),
  uploadsDir: process.env.FIN_UPLOADS_DIR ? path.resolve(process.env.FIN_UPLOADS_DIR) : resolveFromCwd('uploads'),
  dbFile: process.env.FIN_DB_FILE
    ? process.env.FIN_DB_FILE
    : path.join(process.env.FIN_DATA_DIR ? path.resolve(process.env.FIN_DATA_DIR) : resolveFromCwd('data'), 'phase3.db'),
  shouldSeed: process.env.FIN_DB_SEED === '1'
};

export const paths = {
  schemaFile: resolveFromCwd('src', 'db', 'schema.sql'),
  exportsDir: path.join(runtimeConfig.dataDir, 'exports'),
  uploadsCsvDir: path.join(runtimeConfig.uploadsDir, 'csv'),
  uploadsDocumentsDir: path.join(runtimeConfig.uploadsDir, 'documents')
};
