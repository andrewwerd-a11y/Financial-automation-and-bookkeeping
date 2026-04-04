import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';
import { evaluateRules } from '../rules/rulesEngine.js';

const router = Router();

const txSchema = z.object({
  date: z.string(),
  vendor: z.string(),
  amount: z.number().positive(),
  direction: z.enum(['income', 'expense']),
  sourceAccount: z.string().optional(),
  sourceType: z.string().default('manual'),
  rawDescription: z.string().optional(),
  activityOrBusiness: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional()
});

router.get('/', (req, res) => {
  const { search, category, activity, reviewStatus, evidence } = req.query;
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (search) {
    clauses.push('(vendor LIKE ? OR raw_description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    clauses.push('category = ?');
    params.push(category);
  }
  if (activity) {
    clauses.push('activity_or_business = ?');
    params.push(activity);
  }
  if (reviewStatus) {
    clauses.push('review_status = ?');
    params.push(reviewStatus);
  }
  if (evidence === 'yes') {
    clauses.push('EXISTS (SELECT 1 FROM evidence_links e WHERE e.transaction_id = transactions.id)');
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM transactions ${where} ORDER BY date DESC, created_at DESC`).all(...params);
  res.json(rows);
});

router.post('/', (req, res) => {
  const parsed = txSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const payload = parsed.data;
  const rule = evaluateRules({
    vendor: payload.vendor,
    rawDescription: payload.rawDescription,
    amount: payload.amount,
    direction: payload.direction,
    category: payload.category,
    activity: payload.activityOrBusiness
  });

  const id = makeId('txn');
  db.prepare(`INSERT INTO transactions (
      id, date, vendor, amount, direction, source_account, source_type, raw_description,
      activity_or_business, category, tax_treatment_suggestion, treatment_explanation,
      confidence_score, review_status, notes, duplicate_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      id,
      payload.date,
      payload.vendor,
      payload.amount,
      payload.direction,
      payload.sourceAccount ?? null,
      payload.sourceType,
      payload.rawDescription ?? null,
      payload.activityOrBusiness ?? null,
      payload.category ?? rule.categorySuggestion ?? null,
      rule.suggestion,
      rule.explanation,
      rule.confidence,
      rule.reviewFlag ? 'pending' : 'approved',
      payload.notes ?? null,
      `${payload.date}|${payload.vendor}|${payload.amount}`
    );

  db.prepare(`INSERT INTO tax_treatment_suggestions
    (id, transaction_id, suggestion, explanation, confidence, review_recommended, matched_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(makeId('tts'), id, rule.suggestion, rule.explanation, rule.confidence, rule.reviewFlag ? 1 : 0, rule.matchedReason);

  return res.status(201).json({ id, ...payload, rule });
});

router.patch('/:id', (req, res) => {
  const updates = req.body as Record<string, unknown>;
  const fields = ['activity_or_business', 'category', 'review_status', 'notes', 'tax_treatment_suggestion'];
  const set: string[] = [];
  const values: unknown[] = [];

  fields.forEach((field) => {
    const key = field.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
    if (updates[key] !== undefined) {
      set.push(`${field} = ?`);
      values.push(updates[key]);
    }
  });

  if (!set.length) return res.status(400).json({ message: 'No valid fields to update' });

  values.push(new Date().toISOString(), req.params.id);
  db.prepare(`UPDATE transactions SET ${set.join(', ')}, updated_at = ? WHERE id = ?`).run(...values);
  return res.json({ ok: true });
});

export default router;
