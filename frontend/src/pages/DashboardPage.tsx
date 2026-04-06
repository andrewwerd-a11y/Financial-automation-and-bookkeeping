import { useEffect, useState } from 'react';
import { getDashboard } from '../api/client';
import type { Document, SourceFile, Transaction } from '../types';

export function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      setData(await getDashboard());
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => { void load(); }, []);

  if (error) return <p>Error loading dashboard: {error}</p>;
  if (!data) return <p>Loading dashboard...</p>;

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="stats">
        <div>Transactions: {(data.totalTransactions?.count ?? 0) as number}</div>
        <div>Documents: {(data.totalDocuments?.count ?? 0) as number}</div>
        <div>Source files: {(data.totalSourceFiles?.count ?? 0) as number}</div>
        <div>Pending review: {(data.pendingReviewCount?.count ?? 0) as number}</div>
        <div>Approved: {(data.approvedCount?.count ?? 0) as number}</div>
        <div>Unresolved/Unknown: {(data.unresolvedUnknownCount?.count ?? 0) as number}</div>
      </div>
      <h3>Recent transactions</h3>
      <ul>
        {(data.recentTransactions as Transaction[]).map((tx) => <li key={tx.id}>{tx.date} - {tx.vendor} - ${tx.amount} [{tx.review_status}]</li>)}
      </ul>
      <h3>Recent source files</h3>
      <ul>
        {(data.recentSourceFiles as SourceFile[]).map((f) => <li key={f.id}>{f.kind} - {f.original_name}</li>)}
      </ul>
      <h3>Recent documents</h3>
      <ul>
        {(data.recentDocuments as Document[]).map((d) => <li key={d.id}>{d.file_name}</li>)}
      </ul>
      <button onClick={() => void load()}>Reload</button>
    </div>
  );
}
