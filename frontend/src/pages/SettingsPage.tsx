import { useEffect, useState } from 'react';
import { getHealth, getSystemStatus } from '../api/client';
import { ErrorState, LoadingState } from '../components/StateBlocks';

export function SettingsPage() {
  const [health, setHealth] = useState<string>('loading');
  const [system, setSystem] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const h = await getHealth();
      setHealth(h.ok ? 'ok' : 'down');
      setSystem(await getSystemStatus());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div>
      <h2>System / Settings</h2>
      {loading && <LoadingState label="Checking system status..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && (
        <>
          <p>Backend health: {health}</p>
          <pre>{JSON.stringify(system, null, 2)}</pre>
        </>
      )}
      <button onClick={() => void load()}>Refresh Status</button>
    </div>
  );
}
