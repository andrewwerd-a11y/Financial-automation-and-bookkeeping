import { useEffect, useState } from 'react';
import { getReportsSummary } from '../api/client';
import { ErrorState, LoadingState } from '../components/StateBlocks';

export function ReportsPage({ activeBusinessId }: { activeBusinessId: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setData(await getReportsSummary(activeBusinessId || undefined));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [activeBusinessId]);

  if (loading) return <LoadingState label="Loading reports..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <p>No report data available.</p>;

  return (
    <div>
      <h2>Reports</h2>
      <button onClick={() => void load()}>Refresh</button>
      <div className="stats">
        <div>Total transactions: {data.overall.totalTransactions.count}</div>
        <div>Total amount: {data.overall.totalTransactionAmount.total}</div>
        <div>Total documents: {data.overall.totalDocuments.count}</div>
        <div>Linked evidence: {data.overall.totalLinkedEvidenceCount.count}</div>
      </div>

      <h3>By Category</h3>
      <table><thead><tr><th>Category</th><th>Count</th><th>Total Amount</th></tr></thead><tbody>{data.byCategory.map((r: any) => <tr key={r.key}><td>{r.key}</td><td>{r.count}</td><td>{r.total_amount}</td></tr>)}</tbody></table>

      <h3>By Business Activity</h3>
      <table><thead><tr><th>Activity</th><th>Count</th><th>Total Amount</th></tr></thead><tbody>{data.byBusinessActivity.map((r: any) => <tr key={r.key}><td>{r.key}</td><td>{r.count}</td><td>{r.total_amount}</td></tr>)}</tbody></table>

      <h3>By Review Status</h3>
      <table><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>{data.byReviewStatus.map((r: any) => <tr key={r.key}><td>{r.key}</td><td>{r.count}</td></tr>)}</tbody></table>

      <h3>By Evidence Status</h3>
      <table><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>{data.byEvidenceStatus.map((r: any, idx: number) => <tr key={`${r.key}-${idx}`}><td>{r.key}</td><td>{r.count}</td></tr>)}</tbody></table>
    </div>
  );
}
