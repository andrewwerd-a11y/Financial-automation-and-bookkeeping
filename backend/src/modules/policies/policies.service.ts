import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

export type PolicyEvaluation = {
  flags: string[];
};

export const listPolicies = (workspaceId?: string, businessId?: string) => {
  if (businessId) {
    return db.prepare('SELECT * FROM policy_rules WHERE business_id = ? ORDER BY updated_at DESC').all(businessId);
  }
  if (workspaceId) {
    return db.prepare('SELECT * FROM policy_rules WHERE workspace_id = ? ORDER BY updated_at DESC').all(workspaceId);
  }
  return db.prepare('SELECT * FROM policy_rules ORDER BY updated_at DESC').all();
};

export const createPolicy = (input: {
  workspaceId: string;
  businessId: string;
  ruleType: 'amount_threshold' | 'category_restriction' | 'missing_evidence';
  thresholdValue?: number;
  categoryValue?: string;
  active?: boolean;
  config?: Record<string, unknown>;
}) => {
  const id = makeId('pol');
  db.prepare(`INSERT INTO policy_rules
    (id, workspace_id, business_id, rule_type, threshold_value, category_value, active, config_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id,
    input.workspaceId,
    input.businessId,
    input.ruleType,
    input.thresholdValue ?? null,
    input.categoryValue ?? null,
    input.active === false ? 0 : 1,
    JSON.stringify(input.config ?? {})
  );

  const created = db.prepare('SELECT * FROM policy_rules WHERE id = ?').get(id);
  // DECISION: auto-backfill on policy create/update. For large datasets, consider deferring to a job.
  backfillPolicyFlagsForBusiness(input.businessId);
  return created;
};

export const updatePolicy = (id: string, input: {
  ruleType: 'amount_threshold' | 'category_restriction' | 'missing_evidence';
  thresholdValue?: number;
  categoryValue?: string;
  active?: boolean;
  config?: Record<string, unknown>;
}) => {
  const existing = db.prepare('SELECT business_id FROM policy_rules WHERE id = ?').get(id) as { business_id: string } | undefined;
  if (!existing) return null;

  if (input.config !== undefined) {
    db.prepare(`UPDATE policy_rules
      SET rule_type = ?, threshold_value = ?, category_value = ?, active = ?, config_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`).run(
      input.ruleType,
      input.thresholdValue ?? null,
      input.categoryValue ?? null,
      input.active === false ? 0 : 1,
      JSON.stringify(input.config),
      id
    );
  } else {
    db.prepare(`UPDATE policy_rules
      SET rule_type = ?, threshold_value = ?, category_value = ?, active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`).run(
      input.ruleType,
      input.thresholdValue ?? null,
      input.categoryValue ?? null,
      input.active === false ? 0 : 1,
      id
    );
  }

  const updated = db.prepare('SELECT * FROM policy_rules WHERE id = ?').get(id);
  // DECISION: auto-backfill on policy create/update. For large datasets, consider deferring to a job.
  backfillPolicyFlagsForBusiness(existing.business_id);
  return updated;
};

export const evaluateTransactionPolicies = (input: {
  businessId?: string | null;
  amount: number;
  categoryValue?: string | null;
  evidenceStatus?: 'missing' | 'linked' | 'weak';
}) => {
  if (!input.businessId) return { flags: [] } satisfies PolicyEvaluation;

  const rules = db.prepare('SELECT * FROM policy_rules WHERE business_id = ? AND active = 1').all(input.businessId) as Array<{
    rule_type: string;
    threshold_value: number | null;
    category_value: string | null;
  }>;

  const flags: string[] = [];

  for (const rule of rules) {
    if (rule.rule_type === 'amount_threshold' && typeof rule.threshold_value === 'number' && input.amount > rule.threshold_value) {
      flags.push(`amount_over_threshold:${rule.threshold_value}`);
    }

    if (rule.rule_type === 'category_restriction' && rule.category_value && (input.categoryValue ?? '').toLowerCase() === rule.category_value.toLowerCase()) {
      flags.push(`restricted_category:${rule.category_value}`);
    }

    if (rule.rule_type === 'missing_evidence' && input.evidenceStatus === 'missing') {
      flags.push('missing_evidence_rule');
    }
  }

  return { flags } satisfies PolicyEvaluation;
};

export const refreshPolicyFlagsForTransaction = (transactionId: string) => {
  const tx = db.prepare(`SELECT id, business_id, amount, category_suggested, category_final
    FROM transactions
    WHERE id = ?`).get(transactionId) as {
      id: string;
      business_id: string | null;
      amount: number;
      category_suggested: string | null;
      category_final: string | null;
    } | undefined;

  if (!tx) return null;

  const evidence = db.prepare(`SELECT COUNT(*) as count,
      SUM(CASE WHEN strength_status = 'weak' THEN 1 ELSE 0 END) as weak_count
    FROM evidence_links
    WHERE transaction_id = ?`).get(transactionId) as { count: number; weak_count: number | null };

  const evidenceStatus = (evidence.count ?? 0) === 0
    ? 'missing'
    : (evidence.weak_count ?? 0) > 0
      ? 'weak'
      : 'linked';

  const policyEvaluation = evaluateTransactionPolicies({
    businessId: tx.business_id,
    amount: tx.amount,
    categoryValue: tx.category_final || tx.category_suggested,
    evidenceStatus
  });

  db.prepare(`UPDATE transactions
    SET policy_flags_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`).run(JSON.stringify(policyEvaluation.flags), transactionId);

  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);
};

export const backfillPolicyFlagsForBusiness = (businessId: string): { updated: number } => {
  const transactions = db.prepare('SELECT * FROM transactions WHERE business_id = ?').all(businessId) as Array<Record<string, unknown>>;

  let updated = 0;
  for (const tx of transactions) {
    const evidenceStats = db.prepare(`SELECT COUNT(*) as count,
        SUM(CASE WHEN strength_status = 'weak' THEN 1 ELSE 0 END) as weak_count
      FROM evidence_links WHERE transaction_id = ?`)
      .get(tx.id) as { count: number; weak_count: number | null };

    const evidenceStatus = (evidenceStats.count ?? 0) === 0
      ? 'missing'
      : (evidenceStats.weak_count ?? 0) > 0 ? 'weak' : 'linked';

    const evaluation = evaluateTransactionPolicies({
      businessId,
      amount: tx.amount as number,
      categoryValue: (tx.category_final as string | null) ?? (tx.category_suggested as string | null),
      evidenceStatus
    });

    db.prepare('UPDATE transactions SET policy_flags_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(evaluation.flags), tx.id);

    updated += 1;
  }

  return { updated };
};
