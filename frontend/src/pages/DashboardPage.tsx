import { useEffect, useState } from 'react';
import { getDashboard } from '../api/client';
import type { Document, SourceFile, Transaction } from '../types';
import { EmptyState, ErrorState, LoadingState, Section } from '../components/StateBlocks';

export function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setData(await getDashboard());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <EmptyState label="No dashboard data available." />;

  return (
    <Section title="Dashboard">
      <div className="stats">
        <div>Transactions: {(data.totalTransactions?.count ?? 0) as number}</div>
        <div>Documents: {(data.totalDocuments?.count ?? 0) as number}</div>
        <div>Source files: {(data.totalSourceFiles?.count ?? 0) as number}</div>
        <div>Total amount: {(data.totalTransactionAmount?.total ?? 0) as number}</div>
        <div>Linked evidence: {(data.totalLinkedEvidenceCount?.count ?? 0) as number}</div>
        <div>Pending review: {(data.pendingReviewCount?.count ?? 0) as number}</div>
        <div>Approved: {(data.approvedCount?.count ?? 0) as number}</div>
        <div>Unresolved/Unknown: {(data.unresolvedUnknownCount?.count ?? 0) as number}</div>
        <div>Missing Evidence: {(data.missingEvidenceCount?.count ?? 0) as number}</div>
        <div>Unmatched Docs: {(data.unmatchedDocumentsCount?.count ?? 0) as number}</div>
        <div>Ingestion Jobs: {(data.ingestionJobCount?.count ?? 0) as number}</div>
        <div>Ingestion Failed: {(data.ingestionFailedCount?.count ?? 0) as number}</div>
        <div>Connectors: {(data.connectorCount?.count ?? 0) as number}</div>
        <div>Pending Reconciliation: {(data.reconciliationPendingCount?.count ?? 0) as number}</div>
        <div>Businesses: {(data.businessCount?.count ?? 0) as number}</div>
        <div>Active Policies: {(data.activePolicyCount?.count ?? 0) as number}</div>
        <div>Workspaces: {(data.workspaceCount?.count ?? 0) as number}</div>
        <div>Users: {(data.userCount?.count ?? 0) as number}</div>
      </div>
      <h3>Recent transactions</h3>
      {(data.recentTransactions as Transaction[]).length === 0 ? <EmptyState label="No recent transactions." /> : (
        <ul>
          {(data.recentTransactions as Transaction[]).map((tx) => <li key={tx.id}>{tx.date} - {tx.vendor} - ${tx.amount} [{tx.review_status}]</li>)}
        </ul>
      )}
      <h3>Recent source files</h3>
      {(data.recentSourceFiles as SourceFile[]).length === 0 ? <EmptyState label="No source files yet." /> : (
        <ul>
          {(data.recentSourceFiles as SourceFile[]).map((f) => <li key={f.id}>{f.kind} - {f.original_name}</li>)}
        </ul>
      )}
      <h3>Recent documents</h3>
      {(data.recentDocuments as Document[]).length === 0 ? <EmptyState label="No recent documents." /> : (
        <ul>
          {(data.recentDocuments as Document[]).map((d) => <li key={d.id}>{d.file_name}</li>)}
        </ul>
      )}
      <h3>Recent ingestion jobs</h3>
      {(data.recentIngestionJobs as Array<{ id: string; status: string; job_type: string }>).length === 0 ? <EmptyState label="No ingestion jobs yet." /> : (
        <ul>
          {(data.recentIngestionJobs as Array<{ id: string; status: string; job_type: string }>).map((job) => <li key={job.id}>{job.job_type} - {job.status}</li>)}
        </ul>
      )}
      <button onClick={() => void load()}>Reload</button>
    </Section>
  );
}
