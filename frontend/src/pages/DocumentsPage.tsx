import { useEffect, useState } from 'react';
import { api, upload } from '../api/client';

export function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [docs, setDocs] = useState<Array<{ id: string; original_filename: string; uploaded_at: string }>>([]);

  const load = async () => setDocs(await api('/documents'));
  useEffect(() => { void load(); }, []);

  const submit = async () => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    await upload('/documents/upload', form);
    await load();
  };

  return <div>
    <h2>Evidence Vault</h2>
    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
    <button onClick={() => void submit()}>Upload</button>
    <ul>{docs.map((d) => <li key={d.id}>{d.original_filename} ({d.uploaded_at})</li>)}</ul>
  </div>;
}
