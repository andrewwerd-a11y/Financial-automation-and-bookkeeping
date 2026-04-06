import { useEffect, useState } from 'react';
import { listMissingEvidenceTransactions } from '../api/client';
import type { Transaction } from '../types';

export function MissingEvidencePage() {
  const [rows, setRows] = useState<Transaction[]>([]);

  const load = async () => setRows(await listMissingEvidenceTransactions());
  useEffect(() => { void load(); }, []);

  return (
    <div>
      <h2>Missing Evidence Queue</h2>
      <button onClick={() => void load()}>Refresh</button>
      <table>
        <thead><tr><th>Date</th><th>Vendor</th><th>Amount</th><th>Review Status</th></tr></thead>
        <tbody>
          {rows.map((tx) => <tr key={tx.id}><td>{tx.date}</td><td>{tx.vendor}</td><td>{tx.amount}</td><td>{tx.review_status}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
