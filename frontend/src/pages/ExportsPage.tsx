import { useEffect, useState } from 'react';
import { createExportJob, listExportJobs } from '../api/client';

export function ExportsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const load = async () => setJobs(await listExportJobs());
  useEffect(() => { void load(); }, []);

  const createJob = async (exportType: 'transactions' | 'documents' | 'evidence_links') => {
    const job = await createExportJob(exportType);
    setMessage(`Created export job ${job.id} (${job.export_type})`);
    await load();
  };

  return (
    <div>
      <h2>Exports</h2>
      <button onClick={() => void createJob('transactions')}>Export Transactions CSV</button>
      <button onClick={() => void createJob('documents')}>Export Documents CSV</button>
      <button onClick={() => void createJob('evidence_links')}>Export Evidence Links CSV</button>
      <button onClick={() => void load()}>Refresh</button>
      {message && <p>{message}</p>}

      <table>
        <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Created</th><th>Completed</th><th>Download</th></tr></thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>{job.id}</td><td>{job.export_type}</td><td>{job.status}</td><td>{job.created_at}</td><td>{job.completed_at ?? '-'}</td>
              <td>{job.status === 'completed' ? <a href={`http://localhost:4000/api/exports/${job.id}/download`} target="_blank" rel="noreferrer">Download</a> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
