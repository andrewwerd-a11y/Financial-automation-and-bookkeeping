import { useEffect, useState } from 'react';
import { listDocuments, uploadDocument } from '../api/client';
import type { Document } from '../types';

export function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => setDocs(await listDocuments());
  useEffect(() => { void load(); }, []);

  const submit = async () => {
    if (!file) return;
    await uploadDocument(file, notes);
    setMessage('Document uploaded.');
    setNotes('');
    await load();
  };

  return (
    <div>
      <h2>Documents</h2>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button onClick={() => void submit()}>Upload Document</button>
      <button onClick={() => void load()}>Refresh</button>
      {message && <p>{message}</p>}
      <table>
        <thead><tr><th>File</th><th>Type</th><th>Uploaded</th><th>Notes</th></tr></thead>
        <tbody>{docs.map((doc) => <tr key={doc.id}><td>{doc.file_name}</td><td>{doc.mime_type}</td><td>{doc.uploaded_at}</td><td>{doc.notes}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
