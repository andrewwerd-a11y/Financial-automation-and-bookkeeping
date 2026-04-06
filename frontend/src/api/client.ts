const API = 'http://localhost:4000/api';

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const getHealth = () => fetch('http://localhost:4000/health').then(parse<{ ok: boolean }>);
export const getSystemStatus = () => fetch(`${API}/system/status`).then(parse<{ ok: boolean; phase: string; backendBaseUrl: string }>);
export const getDashboard = () => fetch(`${API}/dashboard`).then(parse<any>);

export const listTransactions = () => fetch(`${API}/transactions`).then(parse<any[]>);
export const getTransaction = (id: string) => fetch(`${API}/transactions/${id}`).then(parse<any>);
export const createTransaction = (payload: { date: string; vendor: string; amount: number; description_raw?: string }) =>
  fetch(`${API}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);

export const listImports = () => fetch(`${API}/imports`).then(parse<any[]>);
export const uploadCsv = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return fetch(`${API}/imports/csv`, { method: 'POST', body: form }).then(parse<any>);
};

export const listDocuments = () => fetch(`${API}/documents`).then(parse<any[]>);
export const uploadDocument = (file: File, notes?: string) => {
  const form = new FormData();
  form.append('file', file);
  if (notes) form.append('notes', notes);
  return fetch(`${API}/documents/upload`, { method: 'POST', body: form }).then(parse<any>);
};

export const listReviewQueue = () => fetch(`${API}/review/queue`).then(parse<any[]>);
export const applyReviewAction = (transactionId: string, payload: { actionType: string; categoryFinal?: string; businessActivityFinal?: string; note?: string }) =>
  fetch(`${API}/review/actions/${transactionId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);
