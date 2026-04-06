import { useEffect, useState } from 'react';
import { listImports, uploadCsv } from '../api/client';
import type { SourceFile } from '../types';

export function ImportsPage() {
  const [rows, setRows] = useState<SourceFile[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => setRows(await listImports());
  useEffect(() => { void load(); }, []);

  const submit = async () => {
    if (!file) return;
    const result = await uploadCsv(file);
    setMessage(`Imported ${result.importedCount} rows, skipped ${result.skippedCount}.`);
    await load();
  };

  return (
    <div>
      <h2>Imports (CSV)</h2>
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button onClick={() => void submit()}>Upload CSV</button>
      <button onClick={() => void load()}>Refresh</button>
      {message && <p>{message}</p>}
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Uploaded</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}><td>{row.original_name}</td><td>{row.mime_type}</td><td>{row.size_bytes}</td><td>{row.uploaded_at}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
