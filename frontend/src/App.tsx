import { useState } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ImportsPage } from './pages/ImportsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { TreatmentPage } from './pages/TreatmentPage';
import { MissingEvidencePage } from './pages/MissingEvidencePage';
import { UnmatchedDocumentsPage } from './pages/UnmatchedDocumentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ExportsPage } from './pages/ExportsPage';
import { IngestionJobsPage } from './pages/IngestionJobsPage';
import { ImportTemplatesPage } from './pages/ImportTemplatesPage';
import { ConnectorsPage } from './pages/ConnectorsPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { BusinessesPage } from './pages/BusinessesPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { SetupPage } from './pages/SetupPage';

const nav = [
  ['setup', 'Setup'],
  ['workspace', 'Workspace'],
  ['dashboard', 'Dashboard'],
  ['businesses', 'Businesses'],
  ['policies', 'Policy Rules'],
  ['transactions', 'Transactions'],
  ['connectors', 'Connectors'],
  ['reconciliation', 'Reconciliation'],
  ['review_queue', 'Review Queue'],
  ['treatment', 'Treatment'],
  ['missing_evidence', 'Missing Evidence'],
  ['unmatched_documents', 'Unmatched Documents'],
  ['reports', 'Reports'],
  ['exports', 'Exports'],
  ['imports', 'Imports'],
  ['ingestion_jobs', 'Ingestion Jobs'],
  ['import_templates', 'Import Templates'],
  ['documents', 'Documents'],
  ['settings', 'Settings']
] as const;

type NavKey = (typeof nav)[number][0];

export default function App() {
  const [active, setActive] = useState<NavKey>('setup');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');
  const [activeBusinessId, setActiveBusinessId] = useState('');

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Ops Console</h1>
        <p>Workspace: {activeWorkspaceId || 'none selected'}</p>
        <p>Business: {activeBusinessId || 'none selected'}</p>
        {nav.map(([key, label]) => (
          <button key={key} className={active === key ? 'active' : ''} onClick={() => setActive(key)}>{label}</button>
        ))}
      </aside>
      <section className="main">
        <header className="topbar">Financial Intake / Bookkeeping — Phase 10 Productization Foundation</header>
        <main className="content">
          {active === 'setup' && <SetupPage />}
          {active === 'workspace' && <WorkspacePage activeWorkspaceId={activeWorkspaceId} onSelectWorkspace={setActiveWorkspaceId} />}
          {active === 'dashboard' && <DashboardPage />}
          {active === 'businesses' && <BusinessesPage activeWorkspaceId={activeWorkspaceId} activeBusinessId={activeBusinessId} onSelectBusiness={setActiveBusinessId} />}
          {active === 'policies' && <PoliciesPage activeWorkspaceId={activeWorkspaceId} activeBusinessId={activeBusinessId} />}
          {active === 'transactions' && <TransactionsPage activeBusinessId={activeBusinessId} />}
          {active === 'connectors' && <ConnectorsPage />}
          {active === 'reconciliation' && <ReconciliationPage />}
          {active === 'review_queue' && <ReviewQueuePage activeBusinessId={activeBusinessId} />}
          {active === 'treatment' && <TreatmentPage />}
          {active === 'missing_evidence' && <MissingEvidencePage />}
          {active === 'unmatched_documents' && <UnmatchedDocumentsPage />}
          {active === 'reports' && <ReportsPage activeBusinessId={activeBusinessId} />}
          {active === 'exports' && <ExportsPage activeBusinessId={activeBusinessId} />}
          {active === 'imports' && <ImportsPage activeBusinessId={activeBusinessId} />}
          {active === 'ingestion_jobs' && <IngestionJobsPage />}
          {active === 'import_templates' && <ImportTemplatesPage />}
          {active === 'documents' && <DocumentsPage activeBusinessId={activeBusinessId} />}
          {active === 'settings' && <SettingsPage />}
        </main>
      </section>
    </div>
  );
}
