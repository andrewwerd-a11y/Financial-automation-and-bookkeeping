import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LookupItem, Transaction } from '../types';

export function LedgerPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [activities, setActivities] = useState<LookupItem[]>([]);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [activity, setActivity] = useState('');

  const load = async () => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (category) q.set('category', category);
    if (activity) q.set('activity', activity);
    setRows(await api(`/transactions?${q.toString()}`));
  };

  useEffect(() => {
    void load();
    void api<LookupItem[]>('/lookups/categories').then(setCategories);
    void api<LookupItem[]>('/lookups/activities').then(setActivities);
  }, []);

  return (
    <div>
      <h2>Unified Ledger</h2>
      <div className="filters">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor/description" />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={activity} onChange={(e) => setActivity(e.target.value)}>
          <option value="">All activities</option>
          {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button onClick={() => void load()}>Apply</button>
      </div>
      <table>
        <thead>
          <tr><th>Date</th><th>Vendor</th><th>Amount</th><th>Category</th><th>Activity</th><th>Treatment</th><th>Confidence</th><th>Review</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.date}</td><td>{r.vendor}</td><td>{r.amount.toFixed(2)}</td>
              <td>{r.category ?? '-'}</td><td>{r.activity_or_business ?? '-'}</td>
              <td>{r.tax_treatment_suggestion ?? '-'}</td><td>{((r.confidence_score ?? 0) * 100).toFixed(0)}%</td><td>{r.review_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
