import type {
  AppSetting,
  Business,
  Connector,
  ConnectorSyncJob,
  Document,
  ImportTemplate,
  IngestionJob,
  PolicyRule,
  ReconciliationCandidate,
  ReviewDecision,
  SourceFile,
  Transaction,
  User,
  Workspace,
  WorkspaceMember
} from '../types';

type DocumentLink = {
  id: string;
  transaction_id: string;
  document_id: string;
  relation_type?: string | null;
  strength_status: 'linked' | 'weak';
  business_purpose_note?: string | null;
  created_at: string;
  updated_at?: string | null;
};

type DashboardPayload = {
  totalTransactions: { count: number };
  totalDocuments: { count: number };
  totalSourceFiles: { count: number };
  totalTransactionAmount: { total: number };
  totalLinkedEvidenceCount: { count: number };
  pendingReviewCount: { count: number };
  approvedCount: { count: number };
  unresolvedUnknownCount: { count: number };
  missingEvidenceCount: { count: number };
  unmatchedDocumentsCount: { count: number };
  ingestionJobCount: { count: number };
  ingestionFailedCount: { count: number };
  connectorCount: { count: number };
  reconciliationPendingCount: { count: number };
  businessCount: { count: number };
  activePolicyCount: { count: number };
  workspaceCount: { count: number };
  userCount: { count: number };
  recentTransactions: Transaction[];
  recentDocuments: Document[];
  recentSourceFiles: SourceFile[];
  recentIngestionJobs: IngestionJob[];
};

export type MockApiState = {
  healthOk: boolean;
  systemStatus: {
    ok: boolean;
    phase: string;
    dbOk: boolean;
    transactionCount: number;
    backendBaseUrl: string;
    dbFile: string;
    seedEnabled: boolean;
  };
  transactions: Transaction[];
  documents: Document[];
  evidenceLinks: DocumentLink[];
  sourceFiles: SourceFile[];
  reviewHistory: ReviewDecision[];
  exportJobs: Array<{
    id: string;
    export_type: 'transactions' | 'documents' | 'evidence_links';
    status: 'pending' | 'completed';
    created_at: string;
    completed_at?: string | null;
  }>;
  ingestionJobs: IngestionJob[];
  importTemplates: ImportTemplate[];
  connectors: Connector[];
  connectorSyncJobs: ConnectorSyncJob[];
  reconciliationCandidates: ReconciliationCandidate[];
  workspaces: Workspace[];
  users: User[];
  workspaceMembers: Array<WorkspaceMember & { display_name: string }>;
  businesses: Business[];
  policies: PolicyRule[];
  settings: AppSetting[];
  dashboardOverride?: DashboardPayload | null;
};

const NOW = '2026-04-01T00:00:00.000Z';
export const DEFAULT_WORKSPACE_ID = 'wsp_test1';
export const DEFAULT_BUSINESS_ID = 'biz_test1';

const clone = <T,>(value: T): T => structuredClone(value);

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'txn_base',
  workspace_id: DEFAULT_WORKSPACE_ID,
  business_id: DEFAULT_BUSINESS_ID,
  date: '2026-04-01',
  vendor: 'GitHub',
  amount: 10,
  source_type: 'manual',
  status: 'active',
  category_suggested: 'software_tools',
  category_final: null,
  business_activity_suggested: 'software_business',
  business_activity_final: null,
  confidence_score: 0.85,
  review_status: 'approved',
  duplicate_status: null,
  business_purpose_note: '',
  policy_flags_json: '[]',
  evidence_status: 'missing',
  evidence_count: 0,
  treatment_suggested: 'current_expense',
  treatment_final: null,
  treatment_confidence: 0.78,
  treatment_reason: 'Operational expense.',
  accountant_review_flag: 0,
  mixed_use_flag: 0,
  excluded_flag: 0,
  created_at: NOW,
  updated_at: NOW,
  ...overrides
});

const document = (overrides: Partial<Document> = {}): Document => ({
  id: 'doc_test1',
  workspace_id: DEFAULT_WORKSPACE_ID,
  business_id: DEFAULT_BUSINESS_ID,
  source_file_id: 'src_doc_test1',
  file_name: 'receipt.pdf',
  mime_type: 'application/pdf',
  uploaded_at: NOW,
  notes: '',
  matched_status: 'unmatched',
  linked_transaction_count: 0,
  ...overrides
});

const sourceFile = (overrides: Partial<SourceFile> = {}): SourceFile => ({
  id: 'src_csv_test1',
  kind: 'csv',
  original_name: 'transactions.csv',
  stored_path: 'data/imports/transactions.csv',
  mime_type: 'text/csv',
  size_bytes: 128,
  uploaded_at: NOW,
  ...overrides
});

const ingestionJob = (overrides: Partial<IngestionJob> = {}): IngestionJob => ({
  id: 'job_test1',
  job_type: 'csv_import',
  status: 'completed',
  source_file_id: 'src_csv_test1',
  metadata_json: JSON.stringify({ importedCount: 1, skippedCount: 0 }),
  created_at: NOW,
  completed_at: NOW,
  ...overrides
});

const importTemplate = (overrides: Partial<ImportTemplate> = {}): ImportTemplate => ({
  id: 'tpl_test1',
  name: 'Default Bank CSV',
  mapping_json: JSON.stringify({
    dateColumn: 'Date',
    vendorColumn: 'Vendor',
    amountColumn: 'Amount',
    descriptionColumn: 'Description'
  }),
  created_at: NOW,
  updated_at: NOW,
  ...overrides
});

const workspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: DEFAULT_WORKSPACE_ID,
  name: 'Test Workspace',
  slug: 'test',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
  ...overrides
});

const user = (overrides: Partial<User> = {}): User => ({
  id: 'usr_test1',
  display_name: 'Jane Operator',
  email: 'jane@example.com',
  role: 'operator',
  created_at: NOW,
  updated_at: NOW,
  ...overrides
});

const business = (overrides: Partial<Business> = {}): Business => ({
  id: DEFAULT_BUSINESS_ID,
  name: 'Main Business',
  label_type: 'llc',
  created_at: NOW,
  updated_at: NOW,
  ...overrides
});

const policy = (overrides: Partial<PolicyRule> = {}): PolicyRule => ({
  id: 'pol_test1',
  business_id: DEFAULT_BUSINESS_ID,
  rule_type: 'amount_threshold',
  threshold_value: 75,
  category_value: null,
  active: 1,
  config_json: null,
  created_at: NOW,
  updated_at: NOW,
  ...overrides
});

const connector = (overrides: Partial<Connector> = {}): Connector => ({
  id: 'con_test1',
  connector_type: 'simulated_csv_feed',
  status: 'active',
  config_json: '{}',
  last_sync_at: NOW,
  created_at: NOW,
  updated_at: NOW,
  ...overrides
});

const syncJob = (overrides: Partial<ConnectorSyncJob> = {}): ConnectorSyncJob => ({
  id: 'sync_test1',
  connector_id: 'con_test1',
  status: 'completed',
  metadata_json: '{}',
  created_at: NOW,
  completed_at: NOW,
  ...overrides
});

const candidate = (overrides: Partial<ReconciliationCandidate> = {}): ReconciliationCandidate => ({
  id: 'rec_test1',
  left_transaction_id: 'txn_test1',
  right_transaction_id: 'txn_test2',
  match_status: 'pending',
  confidence: 0.82,
  reason: 'Same date/amount with external-source overlap',
  left_vendor: 'GitHub',
  right_vendor: 'GitHub',
  left_amount: 10,
  right_amount: 10,
  left_date: '2026-04-01',
  right_date: '2026-04-01',
  created_at: NOW,
  updated_at: NOW,
  ...overrides
});

const setting = (overrides: Partial<AppSetting> = {}): AppSetting => ({
  id: 'set_test1',
  workspace_id: DEFAULT_WORKSPACE_ID,
  key: 'fiscal_year_start',
  value_json: JSON.stringify('January'),
  created_at: NOW,
  updated_at: NOW,
  ...overrides
});

const reviewDecision = (overrides: Partial<ReviewDecision> = {}): ReviewDecision => ({
  id: 'rev_test1',
  transaction_id: 'txn_test2',
  action_type: 'approve_suggestion',
  previous_values: JSON.stringify({ review_status: 'needs_review' }),
  new_values: JSON.stringify({ review_status: 'approved' }),
  note: 'Reviewed.',
  created_at: NOW,
  ...overrides
});

export const createInitialMockApiState = (): MockApiState => ({
  healthOk: true,
  systemStatus: {
    ok: true,
    phase: 'phase_10_productization',
    dbOk: true,
    transactionCount: 2,
    backendBaseUrl: 'http://localhost:4000',
    dbFile: 'data/finance.db',
    seedEnabled: false
  },
  transactions: [
    transaction({ id: 'txn_test1', vendor: 'GitHub', amount: 10, review_status: 'approved' }),
    transaction({
      id: 'txn_test2',
      date: '2026-04-02',
      vendor: 'Meals Restaurant',
      amount: 30,
      review_status: 'needs_review',
      category_suggested: 'meals',
      confidence_score: 0.42,
      treatment_suggested: 'meals_candidate',
      accountant_review_flag: 1
    })
  ],
  documents: [document({ linked_transaction_count: 0, matched_status: 'unmatched' })],
  evidenceLinks: [],
  sourceFiles: [sourceFile({ id: 'src_csv_test1' }), sourceFile({ id: 'src_doc_test1', kind: 'document', original_name: 'receipt.pdf', mime_type: 'application/pdf' })],
  reviewHistory: [reviewDecision()],
  exportJobs: [],
  ingestionJobs: [ingestionJob()],
  importTemplates: [importTemplate()],
  connectors: [connector()],
  connectorSyncJobs: [syncJob()],
  reconciliationCandidates: [candidate()],
  workspaces: [workspace()],
  users: [user()],
  workspaceMembers: [{
    id: 'mem_test1',
    workspace_id: DEFAULT_WORKSPACE_ID,
    user_id: 'usr_test1',
    role: 'admin',
    created_at: NOW,
    display_name: 'Jane Operator'
  }],
  businesses: [business()],
  policies: [policy()],
  settings: [setting()],
  dashboardOverride: undefined
});

export const mockApiState: MockApiState = createInitialMockApiState();

export const resetMockApi = (overrides?: Partial<MockApiState>) => {
  const next = createInitialMockApiState();
  Object.assign(mockApiState, next, overrides);
};

export const nextId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export const getDocumentLinksForTransaction = (transactionId: string) => {
  return mockApiState.evidenceLinks
    .filter((link) => link.transaction_id === transactionId)
    .map((link) => {
      const doc = mockApiState.documents.find((row) => row.id === link.document_id);
      return {
        ...link,
        file_name: doc?.file_name ?? 'Unknown',
        mime_type: doc?.mime_type ?? 'application/octet-stream',
        uploaded_at: doc?.uploaded_at ?? NOW
      };
    });
};

export const getLinkedTransactionsForDocument = (documentId: string) => {
  return mockApiState.evidenceLinks
    .filter((link) => link.document_id === documentId)
    .map((link) => {
      const tx = mockApiState.transactions.find((row) => row.id === link.transaction_id);
      return {
        link_id: link.id,
        vendor: tx?.vendor ?? 'Unknown',
        date: tx?.date ?? '',
        amount: tx?.amount ?? 0,
        strength_status: link.strength_status,
        business_purpose_note: link.business_purpose_note ?? ''
      };
    });
};

export const syncDerivedFields = () => {
  mockApiState.transactions = mockApiState.transactions.map((tx) => {
    const links = mockApiState.evidenceLinks.filter((link) => link.transaction_id === tx.id);
    const evidenceStatus = links.length === 0 ? 'missing' : links.some((link) => link.strength_status === 'weak') ? 'weak' : 'linked';
    return { ...tx, evidence_count: links.length, evidence_status: evidenceStatus };
  });

  mockApiState.documents = mockApiState.documents.map((doc) => {
    const count = mockApiState.evidenceLinks.filter((link) => link.document_id === doc.id).length;
    return { ...doc, linked_transaction_count: count, matched_status: count > 0 ? 'matched' : 'unmatched' };
  });

  mockApiState.systemStatus.transactionCount = mockApiState.transactions.length;
};

export const getDashboardPayload = (): DashboardPayload => {
  if (mockApiState.dashboardOverride === null) {
    return null as unknown as DashboardPayload;
  }
  if (mockApiState.dashboardOverride) {
    return clone(mockApiState.dashboardOverride);
  }

  syncDerivedFields();
  return {
    totalTransactions: { count: mockApiState.transactions.length },
    totalDocuments: { count: mockApiState.documents.length },
    totalSourceFiles: { count: mockApiState.sourceFiles.length },
    totalTransactionAmount: { total: mockApiState.transactions.reduce((sum, tx) => sum + tx.amount, 0) },
    totalLinkedEvidenceCount: { count: mockApiState.evidenceLinks.length },
    pendingReviewCount: { count: mockApiState.transactions.filter((tx) => tx.review_status === 'needs_review').length },
    approvedCount: { count: mockApiState.transactions.filter((tx) => tx.review_status === 'approved').length },
    unresolvedUnknownCount: { count: mockApiState.transactions.filter((tx) => tx.category_suggested === 'unknown').length },
    missingEvidenceCount: { count: mockApiState.transactions.filter((tx) => tx.evidence_status === 'missing').length },
    unmatchedDocumentsCount: { count: mockApiState.documents.filter((doc) => (doc.linked_transaction_count ?? 0) === 0).length },
    ingestionJobCount: { count: mockApiState.ingestionJobs.length },
    ingestionFailedCount: { count: mockApiState.ingestionJobs.filter((job) => job.status === 'failed').length },
    connectorCount: { count: mockApiState.connectors.length },
    reconciliationPendingCount: { count: mockApiState.reconciliationCandidates.filter((row) => row.match_status === 'pending').length },
    businessCount: { count: mockApiState.businesses.length },
    activePolicyCount: { count: mockApiState.policies.filter((row) => row.active).length },
    workspaceCount: { count: mockApiState.workspaces.length },
    userCount: { count: mockApiState.users.length },
    recentTransactions: clone(mockApiState.transactions.slice(0, 5)),
    recentDocuments: clone(mockApiState.documents.slice(0, 5)),
    recentSourceFiles: clone(mockApiState.sourceFiles.slice(0, 5)),
    recentIngestionJobs: clone(mockApiState.ingestionJobs.slice(0, 5))
  };
};
