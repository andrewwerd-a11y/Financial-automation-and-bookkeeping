const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    if (payload?.error?.message) {
      throw new Error(`${payload.error.code ?? 'API_ERROR'}: ${payload.error.message}`);
    }
    throw new Error(text || `HTTP ${res.status}`);
  }

  return payload as T;
}

const withParam = (path: string, key: string, value?: string) =>
  value ? `${path}${path.includes('?') ? '&' : '?'}${encodeURIComponent(key)}=${encodeURIComponent(value)}` : path;

const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/api$/, '');
export const getHealth = () => fetch(`${BASE}/health`).then(parse<{ ok: boolean }>);
export const getSystemStatus = () => fetch(`${API}/system/status`).then(parse<{ ok: boolean; phase: string; backendBaseUrl: string }>);
export const getDashboard = () => fetch(`${API}/dashboard`).then(parse<any>);

export const listTransactions = (businessId?: string) => fetch(withParam(`${API}/transactions`, 'businessId', businessId)).then(parse<any[]>);
export const getTransaction = (id: string) => fetch(`${API}/transactions/${id}`).then(parse<any>);
export const createTransaction = (payload: { date: string; vendor: string; amount: number; description_raw?: string; businessId?: string; workspaceId?: string }) =>
  fetch(`${API}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);
export const updateTransactionBusinessPurpose = (id: string, businessPurposeNote: string) =>
  fetch(`${API}/transactions/${id}/business-purpose-note`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessPurposeNote }) }).then(parse<any>);

export const listImports = () => fetch(`${API}/imports`).then(parse<any[]>);
export const uploadCsv = (file: File, opts?: { templateId?: string; saveTemplateName?: string; businessId?: string }) => {
  const form = new FormData();
  form.append('file', file);
  if (opts?.templateId) form.append('templateId', opts.templateId);
  if (opts?.saveTemplateName) form.append('saveTemplateName', opts.saveTemplateName);
  if (opts?.businessId) form.append('businessId', opts.businessId);
  return fetch(`${API}/imports/csv`, { method: 'POST', body: form }).then(parse<any>);
};

export const listDocuments = (businessId?: string) => fetch(withParam(`${API}/documents`, 'businessId', businessId)).then(parse<any[]>);
export const getDocument = (id: string) => fetch(`${API}/documents/${id}`).then(parse<any>);
export const uploadDocument = (file: File, notes?: string, businessId?: string) => {
  const form = new FormData();
  form.append('file', file);
  if (notes) form.append('notes', notes);
  if (businessId) form.append('businessId', businessId);
  return fetch(`${API}/documents/upload`, { method: 'POST', body: form }).then(parse<any>);
};

export const listReviewQueue = (businessId?: string) => fetch(withParam(`${API}/review/queue`, 'businessId', businessId)).then(parse<any[]>);
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

export const getReportsSummary = (businessId?: string) => fetch(withParam(`${API}/reports/summary`, 'businessId', businessId)).then(parse<any>);
export const getOverallReport = (businessId?: string) => fetch(withParam(`${API}/reports/overall`, 'businessId', businessId)).then(parse<any>);

export const createExportJob = (exportType: 'transactions' | 'documents' | 'evidence_links', businessId?: string) =>
  fetch(`${API}/exports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exportType, businessId }) }).then(parse<any>);
export const listExportJobs = () => fetch(`${API}/exports`).then(parse<any[]>);

export const listIngestionJobs = () => fetch(`${API}/imports/jobs`).then(parse<any[]>);
export const getIngestionJob = (id: string) => fetch(`${API}/imports/jobs/${id}`).then(parse<any>);
export const listImportTemplates = () => fetch(`${API}/imports/templates`).then(parse<any[]>);
export const createImportTemplate = (payload: { name: string; mapping: { dateColumn: string; vendorColumn: string; amountColumn: string; descriptionColumn?: string } }) =>
  fetch(`${API}/imports/templates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);
export const updateImportTemplate = (id: string, payload: { name: string; mapping: { dateColumn: string; vendorColumn: string; amountColumn: string; descriptionColumn?: string } }) =>
  fetch(`${API}/imports/templates/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);

export const uploadCsvBulk = (files: File[], templateId?: string, businessId?: string) => {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  if (templateId) form.append('templateId', templateId);
  if (businessId) form.append('businessId', businessId);
  return fetch(`${API}/imports/csv/bulk`, { method: 'POST', body: form }).then(parse<any>);
};

export const listConnectors = () => fetch(`${API}/connectors`).then(parse<any[]>);
export const createConnector = (payload: { connectorType: 'simulated_csv_feed' | 'manual_external_file'; config?: Record<string, unknown> }) =>
  fetch(`${API}/connectors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);
export const listConnectorSyncJobs = () => fetch(`${API}/connectors/sync-jobs`).then(parse<any[]>);
export const runConnectorSync = (id: string) => fetch(`${API}/connectors/${id}/sync`, { method: 'POST' }).then(parse<any>);

export const listReconciliationCandidates = () => fetch(`${API}/reconciliation/candidates`).then(parse<any[]>);
export const runReconciliationScan = () => fetch(`${API}/reconciliation/scan`, { method: 'POST' }).then(parse<any>);
export const updateReconciliationCandidate = (id: string, status: 'resolved' | 'rejected') =>
  fetch(`${API}/reconciliation/candidates/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(parse<any>);

export const listWorkspaces = () => fetch(`${API}/workspaces`).then(parse<any[]>);
export const createWorkspace = (payload: { name: string; slug: string }) =>
  fetch(`${API}/workspaces`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);

export const listUsers = () => fetch(`${API}/users`).then(parse<any[]>);
export const createUser = (payload: { displayName: string; email?: string; role?: string }) =>
  fetch(`${API}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);
export const listWorkspaceMembers = (workspaceId?: string) => fetch(withParam(`${API}/users/workspace-members`, 'workspaceId', workspaceId)).then(parse<any[]>);
export const addWorkspaceMember = (payload: { workspaceId: string; userId: string; role?: string }) =>
  fetch(`${API}/users/workspace-members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);

export const listBusinesses = (workspaceId?: string) => fetch(withParam(`${API}/businesses`, 'workspaceId', workspaceId)).then(parse<any[]>);
export const createBusiness = (payload: { workspaceId: string; name: string; labelType?: string }) =>
  fetch(`${API}/businesses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);

export const listPolicies = (params?: { workspaceId?: string; businessId?: string }) => {
  let path = `${API}/policies`;
  path = withParam(path, 'workspaceId', params?.workspaceId);
  path = withParam(path, 'businessId', params?.businessId);
  return fetch(path).then(parse<any[]>);
};
export const createPolicy = (payload: { workspaceId: string; businessId: string; ruleType: 'amount_threshold' | 'category_restriction' | 'missing_evidence'; thresholdValue?: number; categoryValue?: string; active?: boolean; config?: Record<string, unknown> }) =>
  fetch(`${API}/policies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);
export const updatePolicy = (id: string, payload: { ruleType: 'amount_threshold' | 'category_restriction' | 'missing_evidence'; thresholdValue?: number; categoryValue?: string; active?: boolean; config?: Record<string, unknown> }) =>
  fetch(`${API}/policies/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);

export const listSettings = (workspaceId: string) => fetch(withParam(`${API}/settings`, 'workspaceId', workspaceId)).then(parse<any[]>);
export const upsertSetting = (payload: { workspaceId: string; key: string; value: unknown }) =>
  fetch(`${API}/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(parse<any>);
