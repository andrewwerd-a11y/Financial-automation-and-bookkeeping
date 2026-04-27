import { http, HttpResponse } from 'msw';
import type { AppSetting, PolicyRule, Transaction } from '../types';
import {
  DEFAULT_BUSINESS_ID,
  getDashboardPayload,
  getDocumentLinksForTransaction,
  getLinkedTransactionsForDocument,
  mockApiState,
  nextId,
  syncDerivedFields
} from './mockApi';

export const BASE = 'http://localhost:4000/api';

const json = <T,>(payload: T, init?: ResponseInit) => HttpResponse.json(payload as never, init);

const getTransactionsForBusiness = (businessId: string | null) =>
  businessId ? mockApiState.transactions.filter((tx) => tx.business_id === businessId) : mockApiState.transactions;

const getDocumentsForBusiness = (businessId: string | null) =>
  businessId ? mockApiState.documents.filter((doc) => doc.business_id === businessId) : mockApiState.documents;

const summarizeTreatments = () => {
  const counts = new Map<string, { key: string; count: number; total_amount: number }>();
  for (const tx of mockApiState.transactions) {
    const key = tx.treatment_final ?? tx.treatment_suggested ?? 'unknown';
    const current = counts.get(key) ?? { key, count: 0, total_amount: 0 };
    current.count += 1;
    current.total_amount += tx.amount;
    counts.set(key, current);
  }
  return [...counts.values()];
};

const reportSummary = () => {
  syncDerivedFields();

  const byCategory = new Map<string, { key: string; count: number; total_amount: number }>();
  const byBusinessActivity = new Map<string, { key: string; count: number; total_amount: number }>();
  const byReviewStatus = new Map<string, { key: string; count: number }>();
  const byEvidenceStatus = new Map<string, { key: string; count: number }>();

  for (const tx of mockApiState.transactions) {
    const category = tx.category_final ?? tx.category_suggested ?? 'unknown';
    const activity = tx.business_activity_final ?? tx.business_activity_suggested ?? 'unknown';
    const evidence = tx.evidence_status ?? 'missing';

    const cat = byCategory.get(category) ?? { key: category, count: 0, total_amount: 0 };
    cat.count += 1;
    cat.total_amount += tx.amount;
    byCategory.set(category, cat);

    const act = byBusinessActivity.get(activity) ?? { key: activity, count: 0, total_amount: 0 };
    act.count += 1;
    act.total_amount += tx.amount;
    byBusinessActivity.set(activity, act);

    const review = byReviewStatus.get(tx.review_status) ?? { key: tx.review_status, count: 0 };
    review.count += 1;
    byReviewStatus.set(tx.review_status, review);

    const ev = byEvidenceStatus.get(evidence) ?? { key: evidence, count: 0 };
    ev.count += 1;
    byEvidenceStatus.set(evidence, ev);
  }

  return {
    overall: {
      totalTransactions: { count: mockApiState.transactions.length },
      totalTransactionAmount: { total: mockApiState.transactions.reduce((sum, tx) => sum + tx.amount, 0) },
      totalDocuments: { count: mockApiState.documents.length },
      totalLinkedEvidenceCount: { count: mockApiState.evidenceLinks.length }
    },
    byCategory: [...byCategory.values()],
    byBusinessActivity: [...byBusinessActivity.values()],
    byReviewStatus: [...byReviewStatus.values()],
    byEvidenceStatus: [...byEvidenceStatus.values()]
  };
};

const getReviewQueueRows = () => mockApiState.transactions.filter((tx) =>
  tx.review_status === 'needs_review'
  || tx.category_suggested === 'unknown'
  || tx.duplicate_status === 'suspected_duplicate'
  || (tx.confidence_score ?? 1) < 0.6
);

const applyPolicyFlags = (businessId: string) => {
  const activePolicies = mockApiState.policies.filter((row) => row.business_id === businessId && row.active);
  let updated = 0;

  mockApiState.transactions = mockApiState.transactions.map((tx) => {
    if (tx.business_id !== businessId) return tx;
    const flags = activePolicies.flatMap((row) => {
      if (row.rule_type === 'amount_threshold' && row.threshold_value != null && tx.amount > row.threshold_value) {
        return [`amount_threshold:${row.threshold_value}`];
      }
      if (row.rule_type === 'category_restriction' && row.category_value && (tx.category_final ?? tx.category_suggested) === row.category_value) {
        return [`category_restriction:${row.category_value}`];
      }
      if (row.rule_type === 'missing_evidence' && (tx.evidence_count ?? 0) === 0) {
        return ['missing_evidence'];
      }
      return [];
    });
    updated += 1;
    return { ...tx, policy_flags_json: JSON.stringify(flags) };
  });

  return updated;
};

const parseJson = async <T,>(request: Request) => request.json() as Promise<T>;

export const handlers = [
  http.get(`${BASE}/dashboard`, () => {
    const payload = getDashboardPayload();
    return payload ? json(payload) : HttpResponse.json(null);
  }),

  http.get(`${BASE}/transactions`, ({ request }) => {
    syncDerivedFields();
    const businessId = new URL(request.url).searchParams.get('businessId');
    return json(getTransactionsForBusiness(businessId));
  }),

  http.get(`${BASE}/transactions/:id`, ({ params }) => {
    syncDerivedFields();
    const row = mockApiState.transactions.find((tx) => tx.id === params.id);
    if (!row) return json({ error: { code: 'NOT_FOUND', message: 'Missing transaction' } }, { status: 404 });
    return json({ ...row, linked_evidence: getDocumentLinksForTransaction(row.id) });
  }),

  http.post(`${BASE}/transactions`, async ({ request }) => {
    const body = await parseJson<{ date: string; vendor: string; amount: number; description_raw?: string; businessId?: string; workspaceId?: string }>(request);
    const created: Transaction = {
      id: nextId('txn'),
      workspace_id: body.workspaceId ?? mockApiState.workspaces[0]?.id ?? null,
      business_id: body.businessId ?? null,
      date: body.date,
      vendor: body.vendor,
      amount: Number(body.amount),
      description_raw: body.description_raw,
      source_type: 'manual',
      status: 'active',
      category_suggested: body.vendor.toLowerCase().includes('meal') ? 'meals' : 'unknown',
      category_final: null,
      business_activity_suggested: 'software_business',
      business_activity_final: null,
      confidence_score: body.vendor.toLowerCase().includes('github') ? 0.85 : 0.45,
      review_status: 'needs_review',
      duplicate_status: null,
      notes_internal: null,
      business_purpose_note: '',
      policy_flags_json: '[]',
      evidence_status: 'missing',
      evidence_count: 0,
      treatment_suggested: body.vendor.toLowerCase().includes('meal') ? 'meals_candidate' : 'unknown',
      treatment_final: null,
      treatment_confidence: 0.5,
      treatment_reason: 'Mock classification.',
      accountant_review_flag: body.vendor.toLowerCase().includes('meal') ? 1 : 0,
      mixed_use_flag: 0,
      excluded_flag: 0,
      created_at: '2026-04-02T00:00:00.000Z',
      updated_at: '2026-04-02T00:00:00.000Z'
    };
    mockApiState.transactions.unshift(created);
    syncDerivedFields();
    return json(created, { status: 201 });
  }),

  http.patch(`${BASE}/transactions/:id/business-purpose-note`, async ({ params, request }) => {
    const body = await parseJson<{ businessPurposeNote: string }>(request);
    mockApiState.transactions = mockApiState.transactions.map((tx) =>
      tx.id === params.id ? { ...tx, business_purpose_note: body.businessPurposeNote } : tx
    );
    return json(mockApiState.transactions.find((tx) => tx.id === params.id));
  }),

  http.get(`${BASE}/documents`, ({ request }) => {
    const businessId = new URL(request.url).searchParams.get('businessId');
    syncDerivedFields();
    return json(getDocumentsForBusiness(businessId));
  }),

  http.get(`${BASE}/documents/:id`, ({ params }) => {
    syncDerivedFields();
    const doc = mockApiState.documents.find((row) => row.id === params.id);
    if (!doc) return json({ error: { code: 'NOT_FOUND', message: 'Missing document' } }, { status: 404 });
    return json({ ...doc, linked_transactions: getLinkedTransactionsForDocument(doc.id) });
  }),

  http.post(`${BASE}/documents/upload`, async ({ request }) => {
    const form = await request.formData();
    const file = form.get('file');
    const notes = form.get('notes');
    const businessId = form.get('businessId');
    const created = {
      id: nextId('doc'),
      workspace_id: mockApiState.workspaces[0]?.id ?? null,
      business_id: typeof businessId === 'string' ? businessId : DEFAULT_BUSINESS_ID,
      source_file_id: nextId('src'),
      file_name: file instanceof File ? file.name : 'uploaded.pdf',
      mime_type: file instanceof File ? file.type || 'application/octet-stream' : 'application/octet-stream',
      uploaded_at: '2026-04-03T00:00:00.000Z',
      notes: typeof notes === 'string' ? notes : '',
      matched_status: 'unmatched' as const,
      linked_transaction_count: 0
    };
    mockApiState.documents.unshift(created);
    return json(created, { status: 201 });
  }),

  http.get(`${BASE}/review/queue`, ({ request }) => {
    const businessId = new URL(request.url).searchParams.get('businessId');
    const rows = businessId ? getReviewQueueRows().filter((tx) => tx.business_id === businessId) : getReviewQueueRows();
    return json(rows);
  }),

  http.post(`${BASE}/review/actions/:transactionId`, async ({ params, request }) => {
    const body = await parseJson<{ actionType: string; categoryFinal?: string; businessActivityFinal?: string; note?: string }>(request);
    const tx = mockApiState.transactions.find((row) => row.id === params.transactionId);
    if (!tx) return json({ error: { code: 'NOT_FOUND', message: 'Missing transaction' } }, { status: 404 });
    const next = { ...tx };
    if (body.actionType === 'approve_suggestion') next.review_status = 'approved';
    if (body.actionType === 'hold') next.review_status = 'held';
    if (body.actionType === 'mark_personal') next.review_status = 'personal';
    if (body.actionType === 'reject') next.review_status = 'rejected';
    if (body.actionType === 'reclassify' && body.categoryFinal) next.category_final = body.categoryFinal;
    if (body.actionType === 'change_activity' && body.businessActivityFinal) next.business_activity_final = body.businessActivityFinal;
    mockApiState.transactions = mockApiState.transactions.map((row) => row.id === next.id ? next : row);
    mockApiState.reviewHistory.unshift({
      id: nextId('history'),
      transaction_id: next.id,
      action_type: body.actionType,
      previous_values: JSON.stringify({ review_status: tx.review_status, category_final: tx.category_final, business_activity_final: tx.business_activity_final }),
      new_values: JSON.stringify({ review_status: next.review_status, category_final: next.category_final, business_activity_final: next.business_activity_final }),
      note: body.note ?? null,
      created_at: '2026-04-05T00:00:00.000Z'
    });
    return json(next);
  }),

  http.get(`${BASE}/review/history/:transactionId`, ({ params }) => {
    return json(mockApiState.reviewHistory.filter((row) => row.transaction_id === params.transactionId));
  }),

  http.post(`${BASE}/evidence/links`, async ({ request }) => {
    const body = await parseJson<{ transactionId: string; documentId: string; relationType?: string; strengthStatus?: 'linked' | 'weak'; businessPurposeNote?: string }>(request);
    const link = {
      id: nextId('link'),
      transaction_id: body.transactionId,
      document_id: body.documentId,
      relation_type: body.relationType ?? null,
      strength_status: body.strengthStatus ?? 'linked',
      business_purpose_note: body.businessPurposeNote ?? null,
      created_at: '2026-04-04T00:00:00.000Z',
      updated_at: '2026-04-04T00:00:00.000Z'
    };
    mockApiState.evidenceLinks.unshift(link);
    syncDerivedFields();
    return json(link, { status: 201 });
  }),

  http.delete(`${BASE}/evidence/links/:id`, ({ params }) => {
    mockApiState.evidenceLinks = mockApiState.evidenceLinks.filter((row) => row.id !== params.id);
    syncDerivedFields();
    return json({ ok: true });
  }),

  http.get(`${BASE}/evidence/transaction/:id`, ({ params }) => {
    return json(getDocumentLinksForTransaction(String(params.id)));
  }),

  http.get(`${BASE}/evidence/document/:id`, ({ params }) => {
    return json(getLinkedTransactionsForDocument(String(params.id)));
  }),

  http.patch(`${BASE}/evidence/links/:id/note`, async ({ params, request }) => {
    const body = await parseJson<{ businessPurposeNote: string }>(request);
    mockApiState.evidenceLinks = mockApiState.evidenceLinks.map((row) =>
      row.id === params.id ? { ...row, business_purpose_note: body.businessPurposeNote } : row
    );
    return json(mockApiState.evidenceLinks.find((row) => row.id === params.id));
  }),

  http.get(`${BASE}/evidence/queues/missing-transactions`, () => {
    syncDerivedFields();
    return json(mockApiState.transactions.filter((tx) => (tx.evidence_count ?? 0) === 0));
  }),

  http.get(`${BASE}/evidence/queues/unmatched-documents`, () => {
    syncDerivedFields();
    return json(mockApiState.documents.filter((doc) => (doc.linked_transaction_count ?? 0) === 0));
  }),

  http.get(`${BASE}/reports/summary`, () => json(reportSummary())),

  http.post(`${BASE}/exports`, async ({ request }) => {
    const body = await parseJson<{ exportType: 'transactions' | 'documents' | 'evidence_links' }>(request);
    const job = {
      id: nextId('exp'),
      export_type: body.exportType,
      status: 'completed' as const,
      created_at: '2026-04-06T00:00:00.000Z',
      completed_at: '2026-04-06T00:00:00.000Z'
    };
    mockApiState.exportJobs.unshift(job);
    return json(job, { status: 201 });
  }),

  http.get(`${BASE}/exports`, () => json(mockApiState.exportJobs)),

  http.get(`${BASE}/imports`, () => json(mockApiState.sourceFiles.filter((row) => row.kind === 'csv'))),

  http.post(`${BASE}/imports/csv`, async ({ request }) => {
    const source = {
      id: nextId('src_csv'),
      kind: 'csv' as const,
      original_name: 'upload.csv',
      stored_path: 'data/imports/upload.csv',
      mime_type: 'text/csv',
      size_bytes: 64,
      uploaded_at: '2026-04-07T00:00:00.000Z'
    };
    mockApiState.sourceFiles.unshift(source);
    mockApiState.ingestionJobs.unshift({
      id: nextId('job'),
      job_type: 'csv_import',
      status: 'completed',
      source_file_id: source.id,
      metadata_json: JSON.stringify({ importedCount: 1, skippedCount: 0 }),
      created_at: '2026-04-07T00:00:00.000Z',
      completed_at: '2026-04-07T00:00:00.000Z'
    });
    mockApiState.transactions.unshift({
      id: nextId('txn_csv'),
      workspace_id: mockApiState.workspaces[0]?.id ?? null,
      business_id: mockApiState.businesses[0]?.id ?? null,
      date: '2026-04-07',
      vendor: 'Imported Vendor',
      amount: 10,
      description_raw: 'Imported row',
      source_type: 'csv_import',
      source_file_id: source.id,
      connector_id: null,
      external_source_id: null,
      status: 'active',
      category_suggested: 'unknown',
      category_final: null,
      business_activity_suggested: 'software_business',
      business_activity_final: null,
      confidence_score: 0.4,
      review_status: 'needs_review',
      duplicate_status: null,
      notes_internal: null,
      business_purpose_note: '',
      policy_flags_json: '[]',
      evidence_status: 'missing',
      evidence_count: 0,
      treatment_suggested: 'unknown',
      treatment_final: null,
      treatment_confidence: 0.4,
      treatment_reason: 'Imported transaction.',
      accountant_review_flag: 0,
      mixed_use_flag: 0,
      excluded_flag: 0,
      created_at: '2026-04-07T00:00:00.000Z',
      updated_at: '2026-04-07T00:00:00.000Z'
    });
    syncDerivedFields();
    return json({ importedCount: 1, skippedCount: 0, jobId: mockApiState.ingestionJobs[0].id });
  }),

  http.post(`${BASE}/imports/csv/bulk`, async ({ request }) => {
    const form = await request.formData();
    const files = form.getAll('files').filter((entry): entry is File => entry instanceof File);
    return json({ totalFiles: files.length, completed: files.length, failed: 0 });
  }),

  http.get(`${BASE}/imports/jobs`, () => json(mockApiState.ingestionJobs)),

  http.get(`${BASE}/imports/jobs/:id`, ({ params }) => {
    return json(mockApiState.ingestionJobs.find((row) => row.id === params.id));
  }),

  http.get(`${BASE}/imports/templates`, () => json(mockApiState.importTemplates)),

  http.post(`${BASE}/imports/templates`, async ({ request }) => {
    const body = await parseJson<{ name: string; mapping: Record<string, string> }>(request);
    const row = {
      id: nextId('tpl'),
      name: body.name,
      mapping_json: JSON.stringify(body.mapping),
      created_at: '2026-04-08T00:00:00.000Z',
      updated_at: '2026-04-08T00:00:00.000Z'
    };
    mockApiState.importTemplates.unshift(row);
    return json(row, { status: 201 });
  }),

  http.patch(`${BASE}/imports/templates/:id`, async ({ params, request }) => {
    const body = await parseJson<{ name: string; mapping: Record<string, string> }>(request);
    mockApiState.importTemplates = mockApiState.importTemplates.map((row) =>
      row.id === params.id
        ? { ...row, name: body.name, mapping_json: JSON.stringify(body.mapping), updated_at: '2026-04-09T00:00:00.000Z' }
        : row
    );
    return json(mockApiState.importTemplates.find((row) => row.id === params.id));
  }),

  http.get(`${BASE}/connectors`, () => json(mockApiState.connectors)),
  http.get(`${BASE}/connectors/sync-jobs`, () => json(mockApiState.connectorSyncJobs)),

  http.post(`${BASE}/connectors`, async ({ request }) => {
    const body = await parseJson<{ connectorType: string }>(request);
    const row = {
      id: nextId('connector'),
      connector_type: body.connectorType,
      status: 'active',
      config_json: '{}',
      last_sync_at: null,
      created_at: '2026-04-10T00:00:00.000Z',
      updated_at: '2026-04-10T00:00:00.000Z'
    };
    mockApiState.connectors.unshift(row);
    return json(row, { status: 201 });
  }),

  http.post(`${BASE}/connectors/:id/sync`, ({ params }) => {
    const row = {
      id: nextId('sync'),
      connector_id: String(params.id),
      status: 'completed',
      metadata_json: '{}',
      created_at: '2026-04-10T00:00:00.000Z',
      completed_at: '2026-04-10T00:00:00.000Z'
    };
    mockApiState.connectorSyncJobs.unshift(row);
    return json(row, { status: 201 });
  }),

  http.get(`${BASE}/reconciliation/candidates`, () => json(mockApiState.reconciliationCandidates)),

  http.post(`${BASE}/reconciliation/scan`, () => {
    if (mockApiState.reconciliationCandidates.length === 0 && mockApiState.transactions.length >= 2) {
      mockApiState.reconciliationCandidates.push({
        id: nextId('candidate'),
        left_transaction_id: mockApiState.transactions[0].id,
        right_transaction_id: mockApiState.transactions[1].id,
        match_status: 'pending',
        confidence: 0.7,
        reason: 'Same date/amount; at least one flagged as suspected duplicate',
        left_vendor: mockApiState.transactions[0].vendor,
        right_vendor: mockApiState.transactions[1].vendor,
        left_amount: mockApiState.transactions[0].amount,
        right_amount: mockApiState.transactions[1].amount,
        left_date: mockApiState.transactions[0].date,
        right_date: mockApiState.transactions[1].date,
        created_at: '2026-04-11T00:00:00.000Z',
        updated_at: '2026-04-11T00:00:00.000Z'
      });
    }
    return json({ scannedPairs: 1, created: mockApiState.reconciliationCandidates.length > 0 ? 1 : 0 });
  }),

  http.patch(`${BASE}/reconciliation/candidates/:id`, async ({ params, request }) => {
    const body = await parseJson<{ status: 'resolved' | 'rejected' }>(request);
    mockApiState.reconciliationCandidates = mockApiState.reconciliationCandidates.map((row) =>
      row.id === params.id ? { ...row, match_status: body.status } : row
    );
    return json(mockApiState.reconciliationCandidates.find((row) => row.id === params.id));
  }),

  http.get(`${BASE}/workspaces`, () => json(mockApiState.workspaces)),

  http.post(`${BASE}/workspaces`, async ({ request }) => {
    const body = await parseJson<{ name: string; slug: string }>(request);
    const row = {
      id: nextId('wsp'),
      name: body.name,
      slug: body.slug,
      status: 'active',
      created_at: '2026-04-12T00:00:00.000Z',
      updated_at: '2026-04-12T00:00:00.000Z'
    };
    mockApiState.workspaces.unshift(row);
    return json(row, { status: 201 });
  }),

  http.get(`${BASE}/users`, () => json(mockApiState.users)),

  http.post(`${BASE}/users`, async ({ request }) => {
    const body = await parseJson<{ displayName: string; email?: string; role?: string }>(request);
    const row = {
      id: nextId('usr'),
      display_name: body.displayName,
      email: body.email ?? null,
      role: body.role ?? 'operator',
      created_at: '2026-04-12T00:00:00.000Z',
      updated_at: '2026-04-12T00:00:00.000Z'
    };
    mockApiState.users.unshift(row);
    return json(row, { status: 201 });
  }),

  http.get(`${BASE}/users/workspace-members`, ({ request }) => {
    const workspaceId = new URL(request.url).searchParams.get('workspaceId');
    const rows = workspaceId ? mockApiState.workspaceMembers.filter((row) => row.workspace_id === workspaceId) : mockApiState.workspaceMembers;
    return json(rows);
  }),

  http.post(`${BASE}/users/workspace-members`, async ({ request }) => {
    const body = await parseJson<{ workspaceId: string; userId: string; role?: string }>(request);
    const user = mockApiState.users.find((row) => row.id === body.userId);
    const row = {
      id: nextId('mem'),
      workspace_id: body.workspaceId,
      user_id: body.userId,
      role: body.role ?? 'admin',
      created_at: '2026-04-12T00:00:00.000Z',
      display_name: user?.display_name ?? 'Unknown'
    };
    mockApiState.workspaceMembers.unshift(row);
    return json(row, { status: 201 });
  }),

  http.get(`${BASE}/businesses`, ({ request }) => {
    const workspaceId = new URL(request.url).searchParams.get('workspaceId');
    return json(workspaceId ? mockApiState.businesses : []);
  }),

  http.post(`${BASE}/businesses`, async ({ request }) => {
    const body = await parseJson<{ workspaceId: string; name: string; labelType?: string }>(request);
    const row = {
      id: nextId('biz'),
      name: body.name,
      label_type: body.labelType ?? null,
      created_at: '2026-04-13T00:00:00.000Z',
      updated_at: '2026-04-13T00:00:00.000Z'
    };
    mockApiState.businesses.unshift(row);
    return json(row, { status: 201 });
  }),

  http.get(`${BASE}/policies`, ({ request }) => {
    const businessId = new URL(request.url).searchParams.get('businessId');
    return json(businessId ? mockApiState.policies.filter((row) => row.business_id === businessId) : mockApiState.policies);
  }),

  http.post(`${BASE}/policies`, async ({ request }) => {
    const body = await parseJson<{ businessId: string; ruleType: PolicyRule['rule_type']; thresholdValue?: number; categoryValue?: string; active?: boolean }>(request);
    const row: PolicyRule = {
      id: nextId('pol'),
      business_id: body.businessId,
      rule_type: body.ruleType,
      threshold_value: body.thresholdValue ?? null,
      category_value: body.categoryValue ?? null,
      active: body.active === false ? 0 : 1,
      config_json: null,
      created_at: '2026-04-13T00:00:00.000Z',
      updated_at: '2026-04-13T00:00:00.000Z'
    };
    mockApiState.policies.unshift(row);
    applyPolicyFlags(body.businessId);
    return json(row, { status: 201 });
  }),

  http.patch(`${BASE}/policies/:id`, async ({ params, request }) => {
    const body = await parseJson<Partial<PolicyRule>>(request);
    let updatedBusinessId = '';
    mockApiState.policies = mockApiState.policies.map((row) => {
      if (row.id !== params.id) return row;
      updatedBusinessId = row.business_id;
      return {
        ...row,
        rule_type: body.rule_type ?? row.rule_type,
        threshold_value: body.threshold_value ?? row.threshold_value,
        category_value: body.category_value ?? row.category_value,
        active: body.active ?? row.active,
        updated_at: '2026-04-13T00:00:00.000Z'
      };
    });
    if (updatedBusinessId) applyPolicyFlags(updatedBusinessId);
    return json(mockApiState.policies.find((row) => row.id === params.id));
  }),

  http.post(`${BASE}/policies/:businessId/backfill`, ({ params }) => {
    const updated = applyPolicyFlags(String(params.businessId));
    return json({ ok: true, updated });
  }),

  http.get(`${BASE}/settings`, ({ request }) => {
    const workspaceId = new URL(request.url).searchParams.get('workspaceId');
    return json(workspaceId ? mockApiState.settings.filter((row) => row.workspace_id === workspaceId) : []);
  }),

  http.post(`${BASE}/settings`, async ({ request }) => {
    const body = await parseJson<{ workspaceId: string; key: string; value: unknown }>(request);
    const existing = mockApiState.settings.find((row) => row.workspace_id === body.workspaceId && row.key === body.key);
    const valueJson = JSON.stringify(body.value);
    if (existing) {
      mockApiState.settings = mockApiState.settings.map((row) =>
        row.id === existing.id ? { ...row, value_json: valueJson, updated_at: '2026-04-14T00:00:00.000Z' } : row
      );
      return json(mockApiState.settings.find((row) => row.id === existing.id));
    }
    const row: AppSetting = {
      id: nextId('setting'),
      workspace_id: body.workspaceId,
      key: body.key,
      value_json: valueJson,
      created_at: '2026-04-14T00:00:00.000Z',
      updated_at: '2026-04-14T00:00:00.000Z'
    };
    mockApiState.settings.unshift(row);
    return json(row, { status: 201 });
  }),

  http.get(`${BASE}/treatment/summary`, () => json(summarizeTreatments())),
  http.get(`${BASE}/treatment/transactions`, ({ request }) => {
    const bucket = new URL(request.url).searchParams.get('bucket');
    return json(bucket ? mockApiState.transactions.filter((tx) => (tx.treatment_final ?? tx.treatment_suggested ?? 'unknown') === bucket) : mockApiState.transactions);
  }),
  http.get(`${BASE}/treatment/accountant-queue`, () => json(mockApiState.transactions.filter((tx) => tx.accountant_review_flag))),
  http.patch(`${BASE}/treatment/transactions/:id/final`, async ({ params, request }) => {
    const body = await parseJson<{ treatmentFinal: string }>(request);
    mockApiState.transactions = mockApiState.transactions.map((tx) =>
      tx.id === params.id ? { ...tx, treatment_final: body.treatmentFinal } : tx
    );
    return json(mockApiState.transactions.find((tx) => tx.id === params.id));
  }),

  http.get('http://localhost:4000/health', () => json({ ok: mockApiState.healthOk })),
  http.get(`${BASE}/system/status`, () => json(mockApiState.systemStatus))
];
