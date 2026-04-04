import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LookupItem } from '../types';

export function ManualEntryPage() {
  const [activities, setActivities] = useState<LookupItem[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [form, setForm] = useState({ date: '', vendor: '', amount: 0, direction: 'expense', sourceAccount: '', activityOrBusiness: '', category: '', notes: '' });

  useEffect(() => {
    void api<LookupItem[]>('/lookups/activities').then(setActivities);
    void api<LookupItem[]>('/lookups/categories').then(setCategories);
  }, []);

  const submit = async () => {
    await api('/transactions', { method: 'POST', body: JSON.stringify(form) });
    alert('Saved transaction');
  };

  return <div>
    <h2>Manual Transaction Entry</h2>
    <div className="grid">
      <input type="date" onChange={(e) => setForm({ ...form, date: e.target.value })} />
      <input placeholder="Vendor" onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
      <input type="number" placeholder="Amount" onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
      <select onChange={(e) => setForm({ ...form, direction: e.target.value })}><option value="expense">expense</option><option value="income">income</option></select>
      <input placeholder="Source account" onChange={(e) => setForm({ ...form, sourceAccount: e.target.value })} />
      <select onChange={(e) => setForm({ ...form, activityOrBusiness: e.target.value })}><option value="">Activity</option>{activities.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</select>
      <select onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Category</option>{categories.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select>
      <textarea placeholder="Notes" onChange={(e) => setForm({ ...form, notes: e.target.value })} />
    </div>
    <button onClick={() => void submit()}>Save</button>
  </div>;
}
