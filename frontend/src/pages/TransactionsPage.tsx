import { useEffect, useState } from 'react';
import { applyReviewAction, createTransaction, getTransaction, listTransactions } from '../api/client';
import type { Transaction } from '../types';

export function TransactionsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ date: '', vendor: '', amount: '', description_raw: '' });
  const [action, setAction] = useState({ actionType: 'approve_suggestion', categoryFinal: '', businessActivityFinal: '', note: '' });

  const load = async () => {
    try {
      setError('');
      setRows(await listTransactions());
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => { void load(); }, []);

  const openDetail = async (id: string) => {
    try {
      setSelected(await getTransaction(id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const submit = async () => {
    try {
      await createTransaction({
        date: form.date,
        vendor: form.vendor,
        amount: Number(form.amount),
        description_raw: form.description_raw
      });
      setForm({ date: '', vendor: '', amount: '', description_raw: '' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const runAction = async () => {
    if (!selected) return;
    await applyReviewAction(selected.id, {
      actionType: action.actionType,
      categoryFinal: action.categoryFinal || undefined,
      businessActivityFinal: action.businessActivityFinal || undefined,
      note: action.note || undefined
    });
    await openDetail(selected.id);
    await load();
  };

  return (
    <div>
      <h2>Transactions</h2>
      {error && <p>Error: {error}</p>}

      <div className="form-grid">
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <input placeholder="Vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
        <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input placeholder="Raw description" value={form.description_raw} onChange={(e) => setForm({ ...form, description_raw: e.target.value })} />
      </div>

      <button onClick={() => void submit()}>Create Manual Transaction</button>
      <button onClick={() => void load()}>Refresh</button>

      {rows.length === 0 ? <p>No transactions yet.</p> : (
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Vendor</th><th>Amount</th><th>Suggested Category</th><th>Final Category</th>
              <th>Suggested Activity</th><th>Confidence</th><th>Review Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.date}</td>
                <td>{tx.vendor}</td>
                <td>{tx.amount}</td>
                <td>{tx.category_suggested}</td>
                <td>{tx.category_final ?? '-'}</td>
                <td>{tx.business_activity_suggested}</td>
                <td>{tx.confidence_score ?? '-'}</td>
                <td>{tx.review_status}</td>
                <td><button onClick={() => void openDetail(tx.id)}>Open</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="panel">
          <h3>Transaction Detail</h3>
          <p><strong>Vendor:</strong> {selected.vendor}</p>
          <p><strong>Date:</strong> {selected.date}</p>
          <p><strong>Amount:</strong> {selected.amount}</p>
          <p><strong>Source:</strong> {selected.source_type}</p>
          <p><strong>Description:</strong> {selected.description_raw}</p>
          <p><strong>Suggested category/activity:</strong> {selected.category_suggested} / {selected.business_activity_suggested}</p>
          <p><strong>Final category/activity:</strong> {selected.category_final ?? '-'} / {selected.business_activity_final ?? '-'}</p>
          <p><strong>Confidence:</strong> {selected.confidence_score ?? '-'}</p>
          <p><strong>Review status:</strong> {selected.review_status}</p>
          <p><strong>Duplicate:</strong> {selected.duplicate_status ?? '-'}</p>

          <h4>Review Action</h4>
          <select value={action.actionType} onChange={(e) => setAction({ ...action, actionType: e.target.value })}>
            <option value="approve_suggestion">approve_suggestion</option>
            <option value="reclassify">reclassify</option>
            <option value="change_activity">change_activity</option>
            <option value="mark_personal">mark_personal</option>
            <option value="hold">hold</option>
            <option value="reject">reject</option>
          </select>
          <input placeholder="categoryFinal (optional)" value={action.categoryFinal} onChange={(e) => setAction({ ...action, categoryFinal: e.target.value })} />
          <input placeholder="businessActivityFinal (optional)" value={action.businessActivityFinal} onChange={(e) => setAction({ ...action, businessActivityFinal: e.target.value })} />
          <input placeholder="note (optional)" value={action.note} onChange={(e) => setAction({ ...action, note: e.target.value })} />
          <button onClick={() => void runAction()}>Apply Review Action</button>
        </div>
      )}
    </div>
  );
}
