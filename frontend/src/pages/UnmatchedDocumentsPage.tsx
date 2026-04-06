import { useEffect, useState } from 'react';
import { listUnmatchedDocuments } from '../api/client';
import type { Document } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

export function UnmatchedDocumentsPage() {
  const [rows, setRows] = useState<Document[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setRows(await listUnmatchedDocuments());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  return (
    <div>
      <h2>Unmatched Documents Queue</h2>
      <button onClick={() => void load()}>Refresh</button>
      {loading && <LoadingState label="Loading queue..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && rows.length === 0 ? <EmptyState label="No unmatched documents." /> : (
        <table>
          <thead><tr><th>File</th><th>Type</th><th>Uploaded</th><th>Linked Count</th></tr></thead>
          <tbody>
            {rows.map((doc) => <tr key={doc.id}><td>{doc.file_name}</td><td>{doc.mime_type}</td><td>{doc.uploaded_at}</td><td>{doc.linked_transaction_count ?? 0}</td></tr>)}
          </tbody>
        </table>
      )}
    </div>
  );
}
