import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { bootstrapDb } from './db/client.js';
import { seedIfEmpty } from './db/seed.js';
import transactionsRoutes from './modules/transactions/transactions.routes.js';
import importsRoutes from './modules/imports/imports.routes.js';
import documentsRoutes from './modules/documents/documents.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import systemRoutes from './modules/system/system.routes.js';
import reviewRoutes from './modules/review/review.routes.js';
import evidenceRoutes from './modules/evidence/evidence.routes.js';

const ensureDirs = () => {
  fs.mkdirSync(path.join(process.cwd(), 'uploads', 'csv'), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), 'uploads', 'documents'), { recursive: true });
};

export const createApp = () => {
  ensureDirs();
  bootstrapDb();
  seedIfEmpty();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/system', systemRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/imports', importsRoutes);
  app.use('/api/documents', documentsRoutes);
  app.use('/api/review', reviewRoutes);
  app.use('/api/evidence', evidenceRoutes);

  return app;
};

export const startServer = () => {
  const port = Number(process.env.PORT ?? 4000);
  const app = createApp();
  return app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
