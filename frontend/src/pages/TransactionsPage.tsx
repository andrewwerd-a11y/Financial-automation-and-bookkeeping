import { useEffect, useState } from 'react';
import { createTransaction, listTransactions } from '../api/client';
import type { Transaction } from '../types';

export function TransactionsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ date: '', vendor: '', amount: '', description_raw: '' });

  const load = async () => {
    try {
      setError('');
      setRows(await listTransactions());
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => { void load(); }, []);

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
          <thead><tr><th>Date</th><th>Vendor</th><th>Amount</th><th>Source</th><th>Status</th><th>Description</th></tr></thead>
          <tbody>
            {rows.map((tx) => <tr key={tx.id}><td>{tx.date}</td><td>{tx.vendor}</td><td>{tx.amount}</td><td>{tx.source_type}</td><td>{tx.status}</td><td>{tx.description_raw}</td></tr>)}
          </tbody>
        </table>
      )}
    </div>
  );
}
