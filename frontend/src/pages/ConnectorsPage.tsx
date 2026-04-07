import { useEffect, useState } from 'react';
import { createConnector, listConnectors, listConnectorSyncJobs, runConnectorSync } from '../api/client';
import type { Connector, ConnectorSyncJob } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

export function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [jobs, setJobs] = useState<ConnectorSyncJob[]>([]);
  const [connectorType, setConnectorType] = useState<'simulated_csv_feed' | 'manual_external_file'>('simulated_csv_feed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [connectorRows, syncRows] = await Promise.all([listConnectors(), listConnectorSyncJobs()]);
      setConnectors(connectorRows);
      setJobs(syncRows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    try {
      setError('');
      await createConnector({ connectorType });
      setMessage('Connector created.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const sync = async (id: string) => {
    try {
      setError('');
      await runConnectorSync(id);
      setMessage('Sync job created.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <h2>Connectors</h2>
      <select value={connectorType} onChange={(e) => setConnectorType(e.target.value as typeof connectorType)}>
        <option value="simulated_csv_feed">simulated_csv_feed</option>
        <option value="manual_external_file">manual_external_file</option>
      </select>
      <button onClick={() => void create()}>Create Connector</button>
      <button onClick={() => void load()}>Refresh</button>

      {loading && <LoadingState label="Loading connectors..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {message && <p>{message}</p>}

      {!loading && !error && connectors.length === 0 ? <EmptyState label="No connectors configured." /> : (
        <table>
          <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Last Sync</th><th>Action</th></tr></thead>
          <tbody>
            {connectors.map((connector) => (
              <tr key={connector.id}>
                <td>{connector.id}</td>
                <td>{connector.connector_type}</td>
                <td>{connector.status}</td>
                <td>{connector.last_sync_at ?? '-'}</td>
                <td><button onClick={() => void sync(connector.id)}>Run Sync</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Recent Connector Sync Jobs</h3>
      {jobs.length === 0 ? <EmptyState label="No sync jobs yet." /> : (
        <table>
          <thead><tr><th>ID</th><th>Connector</th><th>Status</th><th>Created</th><th>Completed</th></tr></thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.id}</td>
                <td>{job.connector_id}</td>
                <td>{job.status}</td>
                <td>{job.created_at}</td>
                <td>{job.completed_at ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
