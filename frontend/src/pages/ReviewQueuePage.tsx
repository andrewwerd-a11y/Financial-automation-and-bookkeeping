import { useEffect, useState } from 'react';
import { applyReviewAction, listReviewQueue } from '../api/client';
import type { Transaction } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

export function ReviewQueuePage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setRows(await listReviewQueue());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const runQuickAction = async (id: string, actionType: string) => {
    try {
      setError('');
      await applyReviewAction(id, { actionType });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const filtered = rows.filter((row) => {
    if (filter === 'all') return true;
    if (filter === 'low_confidence') return (row.confidence_score ?? 1) < 0.6;
    if (filter === 'unknown_category') return row.category_suggested === 'unknown';
    if (filter === 'suspected_duplicate') return row.duplicate_status === 'suspected_duplicate';
    if (filter === 'pending_review') return row.review_status === 'needs_review';
    return true;
  });

  return (
    <div>
      <h2>Review Queue</h2>
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">all</option>
        <option value="low_confidence">low_confidence</option>
        <option value="unknown_category">unknown_category</option>
        <option value="suspected_duplicate">suspected_duplicate</option>
        <option value="pending_review">pending_review</option>
      </select>
      <button onClick={() => void load()}>Refresh</button>
      {loading && <LoadingState label="Loading review queue..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!loading && !error && filtered.length === 0 ? <EmptyState label="No transactions match this filter." /> : (
        <table>
          <thead><tr><th>Date</th><th>Vendor</th><th>Amount</th><th>Suggested Category</th><th>Activity</th><th>Confidence</th><th>Status</th><th>Duplicate</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.vendor}</td>
                <td>{row.amount}</td>
                <td>{row.category_suggested}</td>
                <td>{row.business_activity_suggested}</td>
                <td>{row.confidence_score}</td>
                <td>{row.review_status}</td>
                <td>{row.duplicate_status ?? '-'}</td>
                <td>
                  <button onClick={() => void runQuickAction(row.id, 'approve_suggestion')}>Approve</button>
                  <button onClick={() => void runQuickAction(row.id, 'hold')}>Hold</button>
                  <button onClick={() => void runQuickAction(row.id, 'mark_personal')}>Mark personal</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
