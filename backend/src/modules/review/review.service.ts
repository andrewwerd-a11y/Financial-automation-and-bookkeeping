import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

export type ReviewActionInput = {
  transactionId: string;
  actionType: 'approve_suggestion' | 'reclassify' | 'change_activity' | 'mark_personal' | 'hold' | 'reject';
  categoryFinal?: string | null;
  businessActivityFinal?: string | null;
  note?: string;
};

export const applyReviewAction = (input: ReviewActionInput) => {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(input.transactionId) as Record<string, unknown> | undefined;
  if (!existing) return null;

  const previous = {
    category_final: existing.category_final,
    business_activity_final: existing.business_activity_final,
    review_status: existing.review_status,
    notes_internal: existing.notes_internal
  };

  const next = { ...previous };
  if (input.actionType === 'approve_suggestion') {
    next.category_final = existing.category_suggested;
    next.business_activity_final = existing.business_activity_suggested;
    next.review_status = 'approved';
  }
  if (input.actionType === 'reclassify') {
    next.category_final = input.categoryFinal ?? existing.category_final;
    next.review_status = 'approved';
  }
  if (input.actionType === 'change_activity') {
    next.business_activity_final = input.businessActivityFinal ?? existing.business_activity_final;
    next.review_status = 'approved';
  }
  if (input.actionType === 'mark_personal') {
    next.category_final = 'personal';
    next.review_status = 'personal';
  }
  if (input.actionType === 'hold') {
    next.review_status = 'held';
  }
  if (input.actionType === 'reject') {
    next.review_status = 'rejected';
  }
  if (input.note) {
    next.notes_internal = input.note;
  }

  db.prepare(`UPDATE transactions
    SET category_final = ?, business_activity_final = ?, review_status = ?, notes_internal = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`).run(
    next.category_final,
    next.business_activity_final,
    next.review_status,
    next.notes_internal,
    input.transactionId
  );

  db.prepare(`INSERT INTO review_decisions
    (id, transaction_id, action_type, previous_values, new_values, note)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(
      makeId('rvd'),
      input.transactionId,
      input.actionType,
      JSON.stringify(previous),
      JSON.stringify(next),
      input.note ?? null
    );

  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(input.transactionId);
};

export const getReviewQueue = () => db.prepare(`SELECT * FROM transactions
  WHERE review_status = 'needs_review'
     OR category_suggested = 'unknown'
     OR confidence_score < 0.6
     OR duplicate_status = 'suspected_duplicate'
  ORDER BY confidence_score ASC, created_at DESC`).all();
