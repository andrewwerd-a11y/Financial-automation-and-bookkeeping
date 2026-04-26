import { useEffect, useState } from 'react';
import { backfillPolicies, createPolicy, listPolicies, updatePolicy } from '../api/client';
import type { PolicyRule } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

export function PoliciesPage({ activeWorkspaceId, activeBusinessId }: { activeWorkspaceId: string; activeBusinessId: string }) {
  const [rows, setRows] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ ruleType: 'amount_threshold', thresholdValue: '100', categoryValue: '', active: true });

  const load = async () => {
    if (!activeBusinessId) {
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      setMessage('');
      setRows(await listPolicies({ workspaceId: activeWorkspaceId || undefined, businessId: activeBusinessId || undefined }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [activeBusinessId, activeWorkspaceId]);

  const submit = async () => {
    if (!activeBusinessId) return;
    try {
      setError('');
      setMessage('');
      await createPolicy({
        workspaceId: activeWorkspaceId,
        businessId: activeBusinessId,
        ruleType: form.ruleType as 'amount_threshold' | 'category_restriction' | 'missing_evidence',
        thresholdValue: form.ruleType === 'amount_threshold' ? Number(form.thresholdValue) : undefined,
        categoryValue: form.ruleType === 'category_restriction' ? form.categoryValue : undefined,
        active: form.active
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggle = async (row: PolicyRule) => {
    try {
      setError('');
      setMessage('');
      await updatePolicy(row.id, {
        ruleType: row.rule_type,
        thresholdValue: row.threshold_value ?? undefined,
        categoryValue: row.category_value ?? undefined,
        active: row.active === 0
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const runBackfill = async () => {
    if (!activeBusinessId) return;
    try {
      setError('');
      const result = await backfillPolicies(activeBusinessId);
      setMessage(`Backfilled ${result.updated} transactions.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <h2>Policy Rules</h2>
      {!activeWorkspaceId && <p>Select a workspace first.</p>}
      {activeWorkspaceId && !activeBusinessId && <p>Select a business first.</p>}
      <select value={form.ruleType} onChange={(e) => setForm({ ...form, ruleType: e.target.value })}>
        <option value="amount_threshold">amount_threshold</option>
        <option value="category_restriction">category_restriction</option>
        <option value="missing_evidence">missing_evidence</option>
      </select>
      {form.ruleType === 'amount_threshold' && <input type="number" value={form.thresholdValue} onChange={(e) => setForm({ ...form, thresholdValue: e.target.value })} placeholder="Threshold" />}
      {form.ruleType === 'category_restriction' && <input value={form.categoryValue} onChange={(e) => setForm({ ...form, categoryValue: e.target.value })} placeholder="Restricted category" />}
      <label><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Active</label>
      <button onClick={() => void submit()} disabled={!activeWorkspaceId || !activeBusinessId}>Create Rule</button>
      <button onClick={() => void runBackfill()} disabled={!activeBusinessId}>Backfill Existing Transactions</button>
      <button onClick={() => void load()}>Refresh</button>

      {loading && <LoadingState label="Loading policies..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {message && <p>{message}</p>}

      {!loading && !error && rows.length === 0 ? <EmptyState label="No policy rules for this business." /> : (
        <table>
          <thead><tr><th>Type</th><th>Threshold</th><th>Category</th><th>Active</th><th>Action</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.rule_type}</td>
                <td>{row.threshold_value ?? '-'}</td>
                <td>{row.category_value ?? '-'}</td>
                <td>{row.active ? 'yes' : 'no'}</td>
                <td><button onClick={() => void toggle(row)}>{row.active ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
