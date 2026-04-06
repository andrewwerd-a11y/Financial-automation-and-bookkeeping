import { useEffect, useState } from 'react';
import { listReconciliationCandidates, runReconciliationScan, updateReconciliationCandidate } from '../api/client';
import type { ReconciliationCandidate } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

export function ReconciliationPage() {
  const [rows, setRows] = useState<ReconciliationCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setRows(await listReconciliationCandidates());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const scan = async () => {
    try {
      setError('');
      const result = await runReconciliationScan();
      setMessage(`Scan complete: created ${result.created} candidates from ${result.scannedPairs} scanned pairs.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const setStatus = async (id: string, status: 'resolved' | 'rejected') => {
    try {
      setError('');
      await updateReconciliationCandidate(id, status);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <h2>Reconciliation</h2>
      <button onClick={() => void scan()}>Run Reconciliation Scan</button>
      <button onClick={() => void load()}>Refresh</button>
      {loading && <LoadingState label="Loading reconciliation candidates..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {message && <p>{message}</p>}

      {!loading && !error && rows.length === 0 ? <EmptyState label="No reconciliation candidates." /> : (
        <table>
          <thead><tr><th>Status</th><th>Left Tx</th><th>Right Tx</th><th>Confidence</th><th>Reason</th><th>Action</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.match_status}</td>
                <td>{row.left_date} | {row.left_vendor} | ${row.left_amount}</td>
                <td>{row.right_date} | {row.right_vendor} | ${row.right_amount}</td>
                <td>{row.confidence ?? '-'}</td>
                <td>{row.reason ?? '-'}</td>
                <td>
                  <button onClick={() => void setStatus(row.id, 'resolved')}>Resolve</button>
                  <button onClick={() => void setStatus(row.id, 'rejected')}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
