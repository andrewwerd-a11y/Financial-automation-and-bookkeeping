import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { bootstrapDb, getDbFilePath } from './db/client.js';
import { seedIfEmpty } from './db/seed.js';
import transactionsRoutes from './modules/transactions/transactions.routes.js';
import importsRoutes from './modules/imports/imports.routes.js';
import documentsRoutes from './modules/documents/documents.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import systemRoutes from './modules/system/system.routes.js';
import reviewRoutes from './modules/review/review.routes.js';
import evidenceRoutes from './modules/evidence/evidence.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import exportsRoutes from './modules/exports/exports.routes.js';
import treatmentRoutes from './modules/treatment/treatment.routes.js';
import connectorsRoutes from './modules/connectors/connectors.routes.js';
import reconciliationRoutes from './modules/reconciliation/reconciliation.routes.js';
import { errorHandler, notFoundHandler } from './shared/http.js';
import { paths, runtimeConfig } from './config.runtime.js';

export const initializeRuntime = () => {
  fs.mkdirSync(paths.uploadsCsvDir, { recursive: true });
  fs.mkdirSync(paths.uploadsDocumentsDir, { recursive: true });
  fs.mkdirSync(paths.exportsDir, { recursive: true });

  bootstrapDb();
  if (runtimeConfig.shouldSeed) {
    seedIfEmpty();
    console.log('[startup] seedIfEmpty enabled via FIN_DB_SEED=1');
  }
  console.log(`[startup] db=${getDbFilePath()}`);
};

export const createApp = (options?: { initialize?: boolean }) => {
  if (options?.initialize ?? true) {
    initializeRuntime();
  }

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(runtimeConfig.uploadsDir));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/system', systemRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/imports', importsRoutes);
  app.use('/api/documents', documentsRoutes);
  app.use('/api/review', reviewRoutes);
  app.use('/api/evidence', evidenceRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/exports', exportsRoutes);
  app.use('/api/treatment', treatmentRoutes);
  app.use('/api/connectors', connectorsRoutes);
  app.use('/api/reconciliation', reconciliationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const startServer = () => {
  initializeRuntime();
  const port = Number(process.env.PORT ?? 4000);
  const app = createApp({ initialize: false });
  return app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
