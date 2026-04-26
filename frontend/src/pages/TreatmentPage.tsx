import { useEffect, useState } from 'react';
import { getAccountantQueue, getTreatmentBucket, getTreatmentSummary, setTreatmentFinal } from '../api/client';
import { EmptyState, ErrorState, LoadingState, Section } from '../components/StateBlocks';
import type { Transaction, TreatmentSummaryRow } from '../types';

const TREATMENT_BUCKETS = [
  'current_expense',
  'asset_candidate',
  'inventory_candidate',
  'vehicle_candidate',
  'meals_candidate',
  'startup_candidate',
  'organizational_candidate',
  'personal_or_excluded',
  'needs_accountant_review',
  'unknown'
] as const;

type TreatmentBucket = (typeof TREATMENT_BUCKETS)[number];

export function TreatmentPage() {
  const [summary, setSummary] = useState<TreatmentSummaryRow[]>([]);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [queueMode, setQueueMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<Record<string, TreatmentBucket>>({});

  const loadSummary = async () => {
    setSummary(await getTreatmentSummary());
  };

  const loadRows = async (bucket: string, showQueue: boolean) => {
    const nextRows = showQueue ? await getAccountantQueue() : await getTreatmentBucket(bucket);
    setRows(nextRows);
    setDrafts(Object.fromEntries(
      nextRows.map((row) => [
        row.id,
        // DECISION: default the inline editor to the effective treatment bucket so the UI reflects current backend grouping.
        ((row.treatment_final ?? row.treatment_suggested ?? 'unknown') as TreatmentBucket)
      ])
    ));
  };

  const load = async (bucket = selectedBucket, showQueue = queueMode) => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      const [nextSummary] = await Promise.all([
        getTreatmentSummary(),
        loadRows(bucket, showQueue)
      ]);
      setSummary(nextSummary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selectBucket = async (bucket: string) => {
    setSelectedBucket(bucket);
    setQueueMode(false);
    await load(bucket, false);
  };

  const toggleQueueMode = async () => {
    const nextQueueMode = !queueMode;
    setQueueMode(nextQueueMode);
    await load(selectedBucket, nextQueueMode);
  };

  const saveFinal = async (transactionId: string) => {
    try {
      setError('');
      setMessage('');
      await setTreatmentFinal(transactionId, drafts[transactionId]);
      setMessage('Treatment updated.');
      await loadSummary();
      await loadRows(selectedBucket, queueMode);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const totalCount = summary.reduce((acc, row) => acc + row.count, 0);
  const totalAmount = summary.reduce((acc, row) => acc + row.total_amount, 0);

  if (loading) return <LoadingState label="Loading treatment buckets..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <Section title="Treatment">
      <div>
        <button onClick={() => void selectBucket('all')} className={selectedBucket === 'all' && !queueMode ? 'active' : ''}>
          All ({totalCount}) ${totalAmount.toFixed(2)}
        </button>
        {summary.map((row) => (
          <button
            key={row.key}
            onClick={() => void selectBucket(row.key)}
            className={selectedBucket === row.key && !queueMode ? 'active' : ''}
          >
            {row.key} ({row.count}) ${row.total_amount.toFixed(2)}
          </button>
        ))}
      </div>

      <div>
        <button onClick={() => void toggleQueueMode()}>
          {queueMode ? 'Show Bucket View' : 'Show Accountant Queue'}
        </button>
        <button onClick={() => void load()}>Refresh</button>
      </div>

      {queueMode ? <p>WARNING: {rows.length} transactions require accountant review</p> : null}
      {message ? <p>{message}</p> : null}

      {rows.length === 0 ? <EmptyState label={queueMode ? 'No accountant-review transactions.' : 'No transactions for this treatment bucket.'} /> : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Suggested Treatment</th>
              <th>Final Treatment</th>
              <th>Confidence</th>
              <th>Accountant Flag</th>
              <th>Mixed Use</th>
              <th>Excluded</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.vendor}</td>
                <td>{row.amount}</td>
                <td>{row.treatment_suggested ?? '-'}</td>
                <td>{row.treatment_final ?? '-'}</td>
                <td>{row.treatment_confidence ?? '-'}</td>
                <td>{row.accountant_review_flag ? 'yes' : 'no'}</td>
                <td>{row.mixed_use_flag ? 'yes' : 'no'}</td>
                <td>{row.excluded_flag ? 'yes' : 'no'}</td>
                <td>
                  <select
                    value={drafts[row.id] ?? 'unknown'}
                    onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value as TreatmentBucket }))}
                  >
                    {TREATMENT_BUCKETS.map((bucket) => (
                      <option key={bucket} value={bucket}>{bucket}</option>
                    ))}
                  </select>
                  <button onClick={() => void saveFinal(row.id)}>Save</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
