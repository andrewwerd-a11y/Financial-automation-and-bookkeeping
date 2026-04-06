import { useEffect, useState } from 'react';
import { getReportsSummary } from '../api/client';

export function ReportsPage() {
  const [data, setData] = useState<any>(null);

  const load = async () => setData(await getReportsSummary());
  useEffect(() => { void load(); }, []);

  if (!data) return <p>Loading reports...</p>;

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
