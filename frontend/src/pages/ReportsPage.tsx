import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function ReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  useEffect(() => { void api('/reports/summary').then(setSummary); }, []);

  const runExport = async (type: string) => {
    const result = await api(`/exports/${type}`, { method: 'POST' });
    alert(JSON.stringify(result));
  };

  return <div>
    <h2>Reports & Exports</h2>
    <pre>{summary ? JSON.stringify(summary, null, 2) : 'Loading...'}</pre>
    {['ledger', 'review-queue', 'summary-category', 'summary-activity', 'flagged-special', 'unresolved'].map((e) => (
      <button key={e} onClick={() => void runExport(e)}>{e}</button>
    ))}
  </div>;
}
