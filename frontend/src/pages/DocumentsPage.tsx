import { useEffect, useState } from 'react';
import { getDocument, linkEvidence, listDocuments, listTransactions, uploadDocument, unlinkEvidence } from '../api/client';
import type { Document, Transaction } from '../types';

export function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [linkForm, setLinkForm] = useState({ transactionId: '', relationType: '', strengthStatus: 'linked', businessPurposeNote: '' });

  const load = async () => {
    const [docRows, txRows] = await Promise.all([listDocuments(), listTransactions()]);
    setDocs(docRows);
    setTransactions(txRows);
  };
  useEffect(() => { void load(); }, []);

  const openDetail = async (id: string) => setSelected(await getDocument(id));

  const submit = async () => {
    if (!file) return;
    await uploadDocument(file, notes);
    setMessage('Document uploaded.');
    setNotes('');
    await load();
  };

  const linkFromDocument = async () => {
    if (!selected || !linkForm.transactionId) return;
    await linkEvidence({
      transactionId: linkForm.transactionId,
      documentId: selected.id,
      relationType: linkForm.relationType || undefined,
      strengthStatus: linkForm.strengthStatus as 'linked' | 'weak',
      businessPurposeNote: linkForm.businessPurposeNote || undefined
    });
    await openDetail(selected.id);
    await load();
  };

  const unlink = async (linkId: string) => {
    if (!selected) return;
    await unlinkEvidence(linkId);
    await openDetail(selected.id);
    await load();
  };

  return (
    <div>
      <h2>Documents</h2>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button onClick={() => void submit()}>Upload Document</button>
      <button onClick={() => void load()}>Refresh</button>
      {message && <p>{message}</p>}
      <table>
        <thead><tr><th>File</th><th>Type</th><th>Uploaded</th><th>Match State</th><th>Linked Count</th><th>Open</th></tr></thead>
        <tbody>
          {docs.map((doc) => (
            <tr key={doc.id}>
              <td>{doc.file_name}</td><td>{doc.mime_type}</td><td>{doc.uploaded_at}</td>
              <td>{doc.matched_status ?? 'unmatched'}</td><td>{doc.linked_transaction_count ?? 0}</td>
              <td><button onClick={() => void openDetail(doc.id)}>Open</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className="panel">
          <h3>Document Detail</h3>
          <p><strong>File:</strong> {selected.file_name}</p>
          <p><strong>MIME:</strong> {selected.mime_type}</p>
          <p><strong>Uploaded:</strong> {selected.uploaded_at}</p>
          <p><strong>Match state:</strong> {selected.matched_status}</p>
          <p><strong>Linked transactions:</strong> {selected.linked_transaction_count}</p>

          <h4>Linked Transactions</h4>
          {selected.linked_transactions?.length ? (
            <ul>
              {selected.linked_transactions.map((row: any) => (
                <li key={row.id}>{row.vendor} - {row.date} - ${row.amount} <button onClick={() => void unlink(row.id)}>Unlink</button></li>
              ))}
            </ul>
          ) : <p>No linked transactions.</p>}

          <h4>Link to Transaction</h4>
          <select value={linkForm.transactionId} onChange={(e) => setLinkForm({ ...linkForm, transactionId: e.target.value })}>
            <option value="">Select transaction</option>
            {transactions.map((tx) => <option key={tx.id} value={tx.id}>{tx.date} | {tx.vendor} | ${tx.amount}</option>)}
          </select>
          <input placeholder="relation type" value={linkForm.relationType} onChange={(e) => setLinkForm({ ...linkForm, relationType: e.target.value })} />
          <select value={linkForm.strengthStatus} onChange={(e) => setLinkForm({ ...linkForm, strengthStatus: e.target.value })}>
            <option value="linked">linked</option>
            <option value="weak">weak</option>
          </select>
          <input placeholder="business purpose note" value={linkForm.businessPurposeNote} onChange={(e) => setLinkForm({ ...linkForm, businessPurposeNote: e.target.value })} />
          <button onClick={() => void linkFromDocument()}>Link Transaction</button>
        </div>
      )}
    </div>
  );
}
