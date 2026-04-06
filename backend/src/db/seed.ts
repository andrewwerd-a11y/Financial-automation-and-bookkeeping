import { db, bootstrapDb } from './client.js';
import { makeId } from '../shared/id.js';

export const seedIfEmpty = (): void => {
  const count = db.prepare('SELECT COUNT(*) as total FROM transactions').get() as { total: number };
  if (count.total > 0) return;

  const insert = db.prepare(`INSERT INTO transactions
    (id, date, vendor, amount, description_raw, source_type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);

  insert.run(makeId('txn'), '2026-01-15', 'Sample Vendor', 42.15, 'Seeded starter row', 'unknown', 'active');
};

if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrapDb();
  seedIfEmpty();
  console.log('Seed complete');
}
