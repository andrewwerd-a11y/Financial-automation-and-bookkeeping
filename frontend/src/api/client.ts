const API = 'http://localhost:4000/api';

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;

  if (!res.ok) {
    if (payload?.error?.message) {
      throw new Error(`${payload.error.code ?? 'API_ERROR'}: ${payload.error.message}`);
    }
    throw new Error(text || `HTTP ${res.status}`);
  }

  return payload as T;
}

export const getHealth = () => fetch('http://localhost:4000/health').then(parse<{ ok: boolean }>);
export const getSystemStatus = () => fetch(`${API}/system/status`).then(parse<{ ok: boolean; phase: string; backendBaseUrl: string }>);
export const getDashboard = () => fetch(`${API}/dashboard`).then(parse<any>);

export const listTransactions = () => fetch(`${API}/transactions`).then(parse<any[]>);
export const getTransaction = (id: string) => fetch(`${API}/transactions/${id}`).then(parse<any>);
export const createTransaction = (payload: { date: string; vendor: string; amount: number; description_raw?: string }) =>
  fetch(`${API}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);
export const updateTransactionBusinessPurpose = (id: string, businessPurposeNote: string) =>
  fetch(`${API}/transactions/${id}/business-purpose-note`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessPurposeNote }) }).then(parse<any>);

export const listImports = () => fetch(`${API}/imports`).then(parse<any[]>);
export const uploadCsv = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return fetch(`${API}/imports/csv`, { method: 'POST', body: form }).then(parse<any>);
};

export const listDocuments = () => fetch(`${API}/documents`).then(parse<any[]>);
export const getDocument = (id: string) => fetch(`${API}/documents/${id}`).then(parse<any>);
export const uploadDocument = (file: File, notes?: string) => {
  const form = new FormData();
  form.append('file', file);
  if (notes) form.append('notes', notes);
  return fetch(`${API}/documents/upload`, { method: 'POST', body: form }).then(parse<any>);
};

export const listReviewQueue = () => fetch(`${API}/review/queue`).then(parse<any[]>);
export const applyReviewAction = (transactionId: string, payload: { actionType: string; categoryFinal?: string; businessActivityFinal?: string; note?: string }) =>
  fetch(`${API}/review/actions/${transactionId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);

export const linkEvidence = (payload: { transactionId: string; documentId: string; relationType?: string; strengthStatus?: 'linked' | 'weak'; businessPurposeNote?: string }) =>
  fetch(`${API}/evidence/links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);
export const unlinkEvidence = (linkId: string) => fetch(`${API}/evidence/links/${linkId}`, { method: 'DELETE' }).then(parse<any>);
export const listTransactionEvidence = (transactionId: string) => fetch(`${API}/evidence/transaction/${transactionId}`).then(parse<any[]>);
export const listDocumentLinks = (documentId: string) => fetch(`${API}/evidence/document/${documentId}`).then(parse<any[]>);
export const listMissingEvidenceTransactions = () => fetch(`${API}/evidence/queues/missing-transactions`).then(parse<any[]>);
export const listUnmatchedDocuments = () => fetch(`${API}/evidence/queues/unmatched-documents`).then(parse<any[]>);
export const updateEvidenceLinkNote = (linkId: string, businessPurposeNote: string) =>
  fetch(`${API}/evidence/links/${linkId}/note`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessPurposeNote }) }).then(parse<any>);

export const getReportsSummary = () => fetch(`${API}/reports/summary`).then(parse<any>);
export const getOverallReport = () => fetch(`${API}/reports/overall`).then(parse<any>);

export const createExportJob = (exportType: 'transactions' | 'documents' | 'evidence_links') =>
  fetch(`${API}/exports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exportType }) }).then(parse<any>);
export const listExportJobs = () => fetch(`${API}/exports`).then(parse<any[]>);
