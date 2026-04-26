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

  return db.prepare('SELECT * FROM policy_rules WHERE id = ?').get(id);
};

export const updatePolicy = (id: string, input: {
  ruleType: 'amount_threshold' | 'category_restriction' | 'missing_evidence';
  thresholdValue?: number;
  categoryValue?: string;
  active?: boolean;
  config?: Record<string, unknown>;
}) => {
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

  return db.prepare('SELECT * FROM policy_rules WHERE id = ?').get(id);
};

export const evaluateTransactionPolicies = (input: {
  businessId?: string | null;
  amount: number;
  categorySuggested?: string | null;
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

    if (rule.rule_type === 'category_restriction' && rule.category_value && (input.categorySuggested ?? '').toLowerCase() === rule.category_value.toLowerCase()) {
      flags.push(`restricted_category:${rule.category_value}`);
    }

    if (rule.rule_type === 'missing_evidence' && input.evidenceStatus === 'missing') {
      flags.push('missing_evidence_rule');
    }
  }

  return { flags } satisfies PolicyEvaluation;
};
