import { useEffect, useState } from 'react';
import { getIngestionJob, listIngestionJobs } from '../api/client';
import type { IngestionJob } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

export function IngestionJobsPage() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setJobs(await listIngestionJobs());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openJob = async (id: string) => {
    try {
      setError('');
      setSelected(await getIngestionJob(id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <h2>Ingestion Jobs</h2>
      <button onClick={() => void load()}>Refresh</button>
      {loading && <LoadingState label="Loading ingestion jobs..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && jobs.length === 0 ? <EmptyState label="No ingestion jobs yet." /> : (
        <table>
          <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Created</th><th>Completed</th><th>Details</th></tr></thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.id}</td>
                <td>{job.job_type}</td>
                <td>{job.status}</td>
                <td>{job.created_at}</td>
                <td>{job.completed_at ?? '-'}</td>
                <td><button onClick={() => void openJob(job.id)}>Open</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="panel">
          <h3>Ingestion Job Detail</h3>
          <pre>{JSON.stringify(selected, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
