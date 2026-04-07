import { useEffect, useState } from 'react';
import { createBusiness, listBusinesses } from '../api/client';
import type { Business } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

export function BusinessesPage({ activeWorkspaceId, activeBusinessId, onSelectBusiness }: { activeWorkspaceId: string; activeBusinessId: string; onSelectBusiness: (id: string) => void }) {
  const [rows, setRows] = useState<Business[]>([]);
  const [form, setForm] = useState({ name: '', labelType: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const businesses = await listBusinesses(activeWorkspaceId || undefined);
      setRows(businesses);
      if (!activeBusinessId && businesses[0]) onSelectBusiness(businesses[0].id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [activeWorkspaceId]);

  const submit = async () => {
    if (!form.name) return;
    try {
      if (!activeWorkspaceId) return;
      await createBusiness({ workspaceId: activeWorkspaceId, name: form.name, labelType: form.labelType || undefined });
      setForm({ name: '', labelType: '' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <h2>Businesses / Entities</h2>
      {!activeWorkspaceId && <p>Select a workspace first.</p>}
      <input placeholder="Business name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Type/Label" value={form.labelType} onChange={(e) => setForm({ ...form, labelType: e.target.value })} />
      <button onClick={() => void submit()} disabled={!form.name || !activeWorkspaceId}>Create Business</button>
      <button onClick={() => void load()}>Refresh</button>

      {loading && <LoadingState label="Loading businesses..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!loading && !error && rows.length === 0 ? <EmptyState label="No businesses yet." /> : (
        <table>
          <thead><tr><th>Name</th><th>Label</th><th>Created</th><th>Active</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.label_type ?? '-'}</td>
                <td>{row.created_at}</td>
                <td><button onClick={() => onSelectBusiness(row.id)}>{activeBusinessId === row.id ? 'Selected' : 'Select'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
