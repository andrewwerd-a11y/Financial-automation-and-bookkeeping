import { useEffect, useState } from 'react';
import { listMissingEvidenceTransactions } from '../api/client';
import type { Transaction } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

export function MissingEvidencePage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setRows(await listMissingEvidenceTransactions());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  return (
    <div>
      <h2>Missing Evidence Queue</h2>
      <button onClick={() => void load()}>Refresh</button>
      {loading && <LoadingState label="Loading queue..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && rows.length === 0 ? <EmptyState label="No transactions in the missing-evidence queue." /> : (
        <table>
          <thead><tr><th>Date</th><th>Vendor</th><th>Amount</th><th>Review Status</th></tr></thead>
          <tbody>
            {rows.map((tx) => <tr key={tx.id}><td>{tx.date}</td><td>{tx.vendor}</td><td>{tx.amount}</td><td>{tx.review_status}</td></tr>)}
          </tbody>
        </table>
      )}
    </div>
  );
}
