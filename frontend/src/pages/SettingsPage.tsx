import { useEffect, useState } from 'react';
import { getHealth, getSystemStatus } from '../api/client';

export function SettingsPage() {
  const [health, setHealth] = useState<string>('loading');
  const [system, setSystem] = useState<any>(null);

  const load = async () => {
    const h = await getHealth();
    setHealth(h.ok ? 'ok' : 'down');
    setSystem(await getSystemStatus());
  };

  useEffect(() => { void load(); }, []);

  return (
    <div>
      <h2>System / Settings</h2>
      <p>Backend health: {health}</p>
      <pre>{JSON.stringify(system, null, 2)}</pre>
      <button onClick={() => void load()}>Refresh Status</button>
    </div>
  );
}
