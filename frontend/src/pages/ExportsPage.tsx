import { useEffect, useState } from 'react';
import { createExportJob, getExportDownloadUrl, listExportJobs } from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

export function ExportsPage({ activeBusinessId }: { activeBusinessId: string }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setJobs(await listExportJobs());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const createJob = async (exportType: 'transactions' | 'documents' | 'evidence_links') => {
    try {
      setError('');
      const job = await createExportJob(exportType, activeBusinessId || undefined);
      setMessage(`Created export job ${job.id} (${job.export_type})`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <h2>Exports</h2>
      <button onClick={() => void createJob('transactions')}>Export Transactions CSV</button>
      <button onClick={() => void createJob('documents')}>Export Documents CSV</button>
      <button onClick={() => void createJob('evidence_links')}>Export Evidence Links CSV</button>
      <button onClick={() => void load()}>Refresh</button>
      {loading && <LoadingState label="Loading exports..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {message && <p>{message}</p>}

      {!loading && !error && jobs.length === 0 ? <EmptyState label="No export jobs yet." /> : (
        <table>
          <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Created</th><th>Completed</th><th>Download</th></tr></thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.id}</td><td>{job.export_type}</td><td>{job.status}</td><td>{job.created_at}</td><td>{job.completed_at ?? '-'}</td>
                <td>{job.status === 'completed' ? <a href={getExportDownloadUrl(job.id)} target="_blank" rel="noreferrer">Download</a> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
