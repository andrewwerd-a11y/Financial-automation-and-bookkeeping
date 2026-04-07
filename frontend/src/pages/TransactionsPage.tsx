import { useEffect, useState } from 'react';
import {
  applyReviewAction,
  createTransaction,
  getTransaction,
  linkEvidence,
  listDocuments,
  listTransactions,
  unlinkEvidence,
  updateTransactionBusinessPurpose
} from '../api/client';
import type { Document, Transaction } from '../types';
import { EmptyState, LoadingState } from '../components/StateBlocks';

export function TransactionsPage({ activeBusinessId }: { activeBusinessId: string }) {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ date: '', vendor: '', amount: '', description_raw: '' });
  const [action, setAction] = useState({ actionType: 'approve_suggestion', categoryFinal: '', businessActivityFinal: '', note: '' });
  const [linkForm, setLinkForm] = useState({ documentId: '', relationType: '', strengthStatus: 'linked', businessPurposeNote: '' });

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [txRows, docs] = await Promise.all([listTransactions(activeBusinessId || undefined), listDocuments(activeBusinessId || undefined)]);
      setRows(txRows);
      setDocuments(docs);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [activeBusinessId]);

  const openDetail = async (id: string) => {
    try {
      setSelected(await getTransaction(id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const submit = async () => {
    try {
      await createTransaction({
        date: form.date,
        vendor: form.vendor,
        amount: Number(form.amount),
        description_raw: form.description_raw,
        businessId: activeBusinessId || undefined
      });
      setForm({ date: '', vendor: '', amount: '', description_raw: '' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const runAction = async () => {
    if (!selected) return;
    await applyReviewAction(selected.id, {
      actionType: action.actionType,
      categoryFinal: action.categoryFinal || undefined,
      businessActivityFinal: action.businessActivityFinal || undefined,
      note: action.note || undefined
    });
    await openDetail(selected.id);
    await load();
  };

  const runLink = async () => {
    if (!selected || !linkForm.documentId) return;
    await linkEvidence({
      transactionId: selected.id,
      documentId: linkForm.documentId,
      relationType: linkForm.relationType || undefined,
      strengthStatus: linkForm.strengthStatus as 'linked' | 'weak',
      businessPurposeNote: linkForm.businessPurposeNote || undefined
    });
    setLinkForm({ documentId: '', relationType: '', strengthStatus: 'linked', businessPurposeNote: '' });
    await openDetail(selected.id);
    await load();
  };

  const runUnlink = async (linkId: string) => {
    if (!selected) return;
    if (!window.confirm('Unlink this evidence item from the transaction?')) return;
    await unlinkEvidence(linkId);
    await openDetail(selected.id);
    await load();
  };

  const saveTransactionPurpose = async () => {
    if (!selected) return;
    await updateTransactionBusinessPurpose(selected.id, selected.business_purpose_note ?? '');
    await openDetail(selected.id);
    await load();
  };

  return (
    <div>
      <h2>Transactions</h2>
      {error && <p>Error: {error}</p>}

      <div className="form-grid">
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <input placeholder="Vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
        <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input placeholder="Raw description" value={form.description_raw} onChange={(e) => setForm({ ...form, description_raw: e.target.value })} />
      </div>

      <button onClick={() => void submit()}>Create Manual Transaction</button>
      <button onClick={() => void load()}>Refresh</button>

      {loading ? <LoadingState label="Loading transactions..." /> : rows.length === 0 ? <EmptyState label="No transactions yet." /> : (
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Vendor</th><th>Amount</th><th>Suggested Category</th><th>Final Category</th>
              <th>Suggested Activity</th><th>Confidence</th><th>Review Status</th><th>Evidence Status</th><th>Evidence Count</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.date}</td>
                <td>{tx.vendor}</td>
                <td>{tx.amount}</td>
                <td>{tx.category_suggested}</td>
                <td>{tx.category_final ?? '-'}</td>
                <td>{tx.business_activity_suggested}</td>
                <td>{tx.confidence_score ?? '-'}</td>
                <td>{tx.review_status}</td>
                <td>{tx.evidence_status ?? 'missing'}</td>
                <td>{tx.evidence_count ?? 0}</td>
                <td><button onClick={() => void openDetail(tx.id)}>Open</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="panel">
          <h3>Transaction Detail</h3>
          <p><strong>Vendor:</strong> {selected.vendor}</p>
          <p><strong>Date:</strong> {selected.date}</p>
          <p><strong>Amount:</strong> {selected.amount}</p>
          <p><strong>Source:</strong> {selected.source_type}</p>
          <p><strong>Description:</strong> {selected.description_raw}</p>
          <p><strong>Suggested category/activity:</strong> {selected.category_suggested} / {selected.business_activity_suggested}</p>
          <p><strong>Final category/activity:</strong> {selected.category_final ?? '-'} / {selected.business_activity_final ?? '-'}</p>
          <p><strong>Confidence:</strong> {selected.confidence_score ?? '-'}</p>
          <p><strong>Review status:</strong> {selected.review_status}</p>
          <p><strong>Policy flags:</strong> {selected.policy_flags_json ?? '[]'}</p>
          <p><strong>Evidence status:</strong> {selected.evidence_status} ({selected.evidence_count})</p>

          <h4>Transaction Business Purpose Note</h4>
          <textarea
            value={selected.business_purpose_note ?? ''}
            onChange={(e) => setSelected({ ...selected, business_purpose_note: e.target.value })}
            rows={3}
          />
          <button onClick={() => void saveTransactionPurpose()}>Save Business Purpose Note</button>

          <h4>Linked Evidence</h4>
          {selected.linked_evidence?.length ? (
            <ul>
              {selected.linked_evidence.map((ev: any) => (
                <li key={ev.id}>
                  {ev.file_name} ({ev.strength_status})
                  {ev.business_purpose_note ? ` - ${ev.business_purpose_note}` : ''}
                  <button onClick={() => void runUnlink(ev.id)}>Unlink</button>
                </li>
              ))}
            </ul>
          ) : <p>No evidence linked.</p>}

          <h4>Link Document</h4>
          <select value={linkForm.documentId} onChange={(e) => setLinkForm({ ...linkForm, documentId: e.target.value })}>
            <option value="">Select document</option>
            {documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.file_name}</option>)}
          </select>
          <input placeholder="relation type (optional)" value={linkForm.relationType} onChange={(e) => setLinkForm({ ...linkForm, relationType: e.target.value })} />
          <select value={linkForm.strengthStatus} onChange={(e) => setLinkForm({ ...linkForm, strengthStatus: e.target.value })}>
            <option value="linked">linked</option>
            <option value="weak">weak</option>
          </select>
          <input placeholder="business purpose note" value={linkForm.businessPurposeNote} onChange={(e) => setLinkForm({ ...linkForm, businessPurposeNote: e.target.value })} />
          <button onClick={() => void runLink()}>Link Document</button>

          <h4>Review Action</h4>
          <select value={action.actionType} onChange={(e) => setAction({ ...action, actionType: e.target.value })}>
            <option value="approve_suggestion">approve_suggestion</option>
            <option value="reclassify">reclassify</option>
            <option value="change_activity">change_activity</option>
            <option value="mark_personal">mark_personal</option>
            <option value="hold">hold</option>
            <option value="reject">reject</option>
          </select>
          <input placeholder="categoryFinal (optional)" value={action.categoryFinal} onChange={(e) => setAction({ ...action, categoryFinal: e.target.value })} />
          <input placeholder="businessActivityFinal (optional)" value={action.businessActivityFinal} onChange={(e) => setAction({ ...action, businessActivityFinal: e.target.value })} />
          <input placeholder="note (optional)" value={action.note} onChange={(e) => setAction({ ...action, note: e.target.value })} />
          <button onClick={() => void runAction()}>Apply Review Action</button>
        </div>
      )}
    </div>
  );
}
