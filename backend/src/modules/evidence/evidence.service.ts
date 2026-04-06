import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

export const deriveEvidenceStatus = (count: number, hasWeak: boolean): 'missing' | 'linked' | 'weak' => {
  if (count === 0) return 'missing';
  if (hasWeak) return 'weak';
  return 'linked';
};

export const linkEvidence = (input: {
  transactionId: string;
  documentId: string;
  relationType?: string;
  strengthStatus?: 'linked' | 'weak';
  businessPurposeNote?: string;
}) => {
  const id = makeId('evl');
  db.prepare(`INSERT INTO evidence_links
    (id, transaction_id, document_id, relation_type, strength_status, business_purpose_note)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(
      id,
      input.transactionId,
      input.documentId,
      input.relationType ?? null,
      input.strengthStatus ?? 'linked',
      input.businessPurposeNote ?? null
    );

  return db.prepare('SELECT * FROM evidence_links WHERE id = ?').get(id);
};

export const unlinkEvidence = (linkId: string) => db.prepare('DELETE FROM evidence_links WHERE id = ?').run(linkId);

export const listEvidenceForTransaction = (transactionId: string) => db.prepare(`SELECT e.*, d.file_name, d.mime_type, d.uploaded_at
  FROM evidence_links e
  JOIN documents d ON d.id = e.document_id
  WHERE e.transaction_id = ?
  ORDER BY e.created_at DESC`).all(transactionId);

export const listTransactionsForDocument = (documentId: string) => db.prepare(`SELECT e.*, t.vendor, t.date, t.amount, t.review_status
  FROM evidence_links e
  JOIN transactions t ON t.id = e.transaction_id
  WHERE e.document_id = ?
  ORDER BY e.created_at DESC`).all(documentId);

export const listMissingEvidenceTransactions = () => db.prepare(`SELECT t.*
  FROM transactions t
  LEFT JOIN evidence_links e ON e.transaction_id = t.id
  GROUP BY t.id
  HAVING COUNT(e.id) = 0
  ORDER BY t.created_at DESC`).all();

export const listUnmatchedDocuments = () => db.prepare(`SELECT d.*, s.original_name,
    COUNT(e.id) as linked_transaction_count
  FROM documents d
  JOIN source_files s ON s.id = d.source_file_id
  LEFT JOIN evidence_links e ON e.document_id = d.id
  GROUP BY d.id
  HAVING COUNT(e.id) = 0
  ORDER BY d.uploaded_at DESC`).all();

export const getTransactionEvidenceSummary = (transactionId: string) => {
  const stats = db.prepare(`SELECT COUNT(*) as count,
    SUM(CASE WHEN strength_status = 'weak' THEN 1 ELSE 0 END) as weak_count
    FROM evidence_links WHERE transaction_id = ?`).get(transactionId) as { count: number; weak_count: number | null };

  const count = stats.count ?? 0;
  const hasWeak = (stats.weak_count ?? 0) > 0;
  return { evidence_count: count, evidence_status: deriveEvidenceStatus(count, hasWeak) };
};

export const getDocumentMatchSummary = (documentId: string) => {
  const stats = db.prepare('SELECT COUNT(*) as count FROM evidence_links WHERE document_id = ?').get(documentId) as { count: number };
  const linkedCount = stats.count ?? 0;
  return {
    linked_transaction_count: linkedCount,
    matched_status: linkedCount > 0 ? 'matched' : 'unmatched'
  };
};

export const updateEvidenceLinkNote = (linkId: string, businessPurposeNote?: string) =>
  db.prepare('UPDATE evidence_links SET business_purpose_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(businessPurposeNote ?? null, linkId);
