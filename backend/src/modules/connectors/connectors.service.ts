import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';
import { createTransaction } from '../transactions/transactions.service.js';

export const listConnectors = () => db.prepare('SELECT * FROM connectors ORDER BY created_at DESC').all();

export const createConnector = (input: { connectorType: string; config?: Record<string, unknown> }) => {
  const id = makeId('con');
  db.prepare(`INSERT INTO connectors
    (id, connector_type, status, config_json)
    VALUES (?, ?, 'active', ?)`)
    .run(id, input.connectorType, JSON.stringify(input.config ?? {}));

  return db.prepare('SELECT * FROM connectors WHERE id = ?').get(id);
};

export const getConnector = (id: string) =>
  db.prepare('SELECT * FROM connectors WHERE id = ?').get(id) as Record<string, unknown> | undefined;

export const listConnectorSyncJobs = () =>
  db.prepare(`SELECT s.*, c.connector_type
    FROM connector_sync_jobs s
    JOIN connectors c ON c.id = s.connector_id
    ORDER BY s.created_at DESC`).all();

export const runSimulatedConnectorSync = (connectorId: string) => {
  const connector = getConnector(connectorId);
  if (!connector) return null;

  const syncId = makeId('syn');
  db.prepare(`INSERT INTO connector_sync_jobs (id, connector_id, status, metadata_json)
    VALUES (?, ?, 'processing', ?)`)
    .run(syncId, connectorId, JSON.stringify({ mode: 'simulated_sync' }));

  try {
    const today = new Date().toISOString().slice(0, 10);
    const generated = [
      { vendor: 'Connector Fuel', amount: 58.22 },
      { vendor: 'Connector Supplies', amount: 112.9 },
      { vendor: 'Connector Meals', amount: 36.5 }
    ].map((item, idx) => createTransaction({
      date: today,
      vendor: item.vendor,
      amount: item.amount,
      descriptionRaw: 'Simulated connector import',
      sourceType: 'unknown',
      connectorId,
      externalSourceId: `${connectorId}-ext-${idx + 1}`
    }));

    db.prepare(`UPDATE connector_sync_jobs
      SET status = 'completed', metadata_json = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?`)
      .run(JSON.stringify({ mode: 'simulated_sync', generatedCount: generated.length }), syncId);

    db.prepare(`UPDATE connectors
      SET last_sync_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`)
      .run(connectorId);

    return db.prepare('SELECT * FROM connector_sync_jobs WHERE id = ?').get(syncId);
  } catch (error) {
    db.prepare(`UPDATE connector_sync_jobs
      SET status = 'failed', metadata_json = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?`)
      .run(JSON.stringify({ message: (error as Error).message, mode: 'simulated_sync' }), syncId);
    return db.prepare('SELECT * FROM connector_sync_jobs WHERE id = ?').get(syncId);
  }
};
