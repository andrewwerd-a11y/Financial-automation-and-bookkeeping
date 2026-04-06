import { useState } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ImportsPage } from './pages/ImportsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { MissingEvidencePage } from './pages/MissingEvidencePage';
import { UnmatchedDocumentsPage } from './pages/UnmatchedDocumentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ExportsPage } from './pages/ExportsPage';

const nav = [
  ['dashboard', 'Dashboard'],
  ['transactions', 'Transactions'],
  ['review_queue', 'Review Queue'],
  ['missing_evidence', 'Missing Evidence'],
  ['unmatched_documents', 'Unmatched Documents'],
  ['reports', 'Reports'],
  ['exports', 'Exports'],
  ['imports', 'Imports'],
  ['documents', 'Documents'],
  ['settings', 'Settings']
] as const;

type NavKey = (typeof nav)[number][0];

export default function App() {
  const [active, setActive] = useState<NavKey>('dashboard');

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Ops Console</h1>
        {nav.map(([key, label]) => (
          <button key={key} className={active === key ? 'active' : ''} onClick={() => setActive(key)}>{label}</button>
        ))}
      </aside>
      <section className="main">
        <header className="topbar">Financial Intake / Bookkeeping — Phase 6 Reliability Hardening</header>
        <main className="content">
          {active === 'dashboard' && <DashboardPage />}
          {active === 'transactions' && <TransactionsPage />}
          {active === 'review_queue' && <ReviewQueuePage />}
          {active === 'missing_evidence' && <MissingEvidencePage />}
          {active === 'unmatched_documents' && <UnmatchedDocumentsPage />}
          {active === 'reports' && <ReportsPage />}
          {active === 'exports' && <ExportsPage />}
          {active === 'imports' && <ImportsPage />}
          {active === 'documents' && <DocumentsPage />}
          {active === 'settings' && <SettingsPage />}
        </main>
      </section>
    </div>
  );
}
