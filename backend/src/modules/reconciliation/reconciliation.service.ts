import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

export const listReconciliationCandidates = () => db.prepare(`SELECT rc.*, 
    l.vendor as left_vendor, l.amount as left_amount, l.date as left_date,
    r.vendor as right_vendor, r.amount as right_amount, r.date as right_date
  FROM reconciliation_candidates rc
  JOIN transactions l ON l.id = rc.left_transaction_id
  JOIN transactions r ON r.id = rc.right_transaction_id
  ORDER BY rc.updated_at DESC`).all();

export const runReconciliationScan = () => {
  const rows = db.prepare(`SELECT a.id as left_id, b.id as right_id, a.amount, a.date
    FROM transactions a
    JOIN transactions b ON a.id < b.id
    WHERE ABS(a.amount - b.amount) < 0.01
      AND a.date = b.date
      AND (a.external_source_id IS NOT NULL OR b.external_source_id IS NOT NULL)`).all() as Array<{
    left_id: string; right_id: string; amount: number; date: string;
  }>;

  const insert = db.prepare(`INSERT INTO reconciliation_candidates
    (id, left_transaction_id, right_transaction_id, match_status, confidence, reason)
    VALUES (?, ?, ?, 'pending', ?, ?)`);

  let created = 0;
  for (const row of rows) {
    const existing = db.prepare(`SELECT id FROM reconciliation_candidates
      WHERE left_transaction_id = ? AND right_transaction_id = ?`).get(row.left_id, row.right_id) as { id: string } | undefined;

    if (existing) continue;
    insert.run(makeId('rec'), row.left_id, row.right_id, 0.82, 'Same date/amount with external-source overlap');
    created += 1;
  }

  return { scannedPairs: rows.length, created };
};

export const updateCandidateStatus = (id: string, status: 'resolved' | 'rejected') => {
  db.prepare(`UPDATE reconciliation_candidates
    SET match_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`).run(status, id);

  return db.prepare('SELECT * FROM reconciliation_candidates WHERE id = ?').get(id);
};
