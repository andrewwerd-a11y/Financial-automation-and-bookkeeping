import { useEffect, useState } from 'react';
import { listUnmatchedDocuments } from '../api/client';
import type { Document } from '../types';

export function UnmatchedDocumentsPage() {
  const [rows, setRows] = useState<Document[]>([]);

  const load = async () => setRows(await listUnmatchedDocuments());
  useEffect(() => { void load(); }, []);

  return (
    <div>
      <h2>Unmatched Documents Queue</h2>
      <button onClick={() => void load()}>Refresh</button>
      <table>
        <thead><tr><th>File</th><th>Type</th><th>Uploaded</th><th>Linked Count</th></tr></thead>
        <tbody>
          {rows.map((doc) => <tr key={doc.id}><td>{doc.file_name}</td><td>{doc.mime_type}</td><td>{doc.uploaded_at}</td><td>{doc.linked_transaction_count ?? 0}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
