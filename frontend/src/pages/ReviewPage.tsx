import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Transaction } from '../types';

export function ReviewPage() {
  const [rows, setRows] = useState<(Transaction & { has_evidence: number })[]>([]);
  const load = async () => setRows(await api('/review/queue'));
  useEffect(() => { void load(); }, []);

  const approve = async (id: string, category?: string, treatment?: string) => {
    await api('/review/decision', { method: 'POST', body: JSON.stringify({ transactionId: id, newCategory: category, newTreatment: treatment, decisionType: 'approve' }) });
    await load();
  };

  return <div>
    <h2>Review Queue</h2>
    {rows.map((r) => (
      <div key={r.id} className="card">
        <strong>{r.vendor}</strong> - ${r.amount.toFixed(2)} ({r.date})
        <p>Suggested Category: {r.category ?? 'unclear'} | Suggested Treatment: {r.tax_treatment_suggestion ?? 'needs_review'}</p>
        <p>Confidence: {((r.confidence_score ?? 0) * 100).toFixed(0)}% | Evidence: {r.has_evidence ? 'linked' : 'missing'}</p>
        <button onClick={() => void approve(r.id, r.category, r.tax_treatment_suggestion)}>Approve</button>
      </div>
    ))}
  </div>;
}
