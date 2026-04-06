import { useEffect, useState } from 'react';
import { listImports, uploadCsv } from '../api/client';
import type { SourceFile } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

export function ImportsPage() {
  const [rows, setRows] = useState<SourceFile[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setRows(await listImports());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const submit = async () => {
    if (!file) return;
    try {
      setError('');
      const result = await uploadCsv(file);
      setMessage(`Imported ${result.importedCount} rows, skipped ${result.skippedCount}.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <h2>Imports (CSV)</h2>
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button onClick={() => void submit()} disabled={!file}>Upload CSV</button>
      <button onClick={() => void load()}>Refresh</button>
      {loading && <LoadingState label="Loading imports..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {message && <p>{message}</p>}
      {!loading && !error && rows.length === 0 ? <EmptyState label="No CSV imports yet." /> : (
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Uploaded</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td>{row.original_name}</td><td>{row.mime_type}</td><td>{row.size_bytes}</td><td>{row.uploaded_at}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
