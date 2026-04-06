import { useState } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ImportsPage } from './pages/ImportsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { MissingEvidencePage } from './pages/MissingEvidencePage';
import { UnmatchedDocumentsPage } from './pages/UnmatchedDocumentsPage';

const nav = ['dashboard', 'transactions', 'review_queue', 'missing_evidence', 'unmatched_documents', 'imports', 'documents', 'settings'] as const;

export default function App() {
  const [active, setActive] = useState<(typeof nav)[number]>('dashboard');

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Phase 3 Tool</h1>
        {nav.map((item) => (
          <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>{item}</button>
        ))}
      </aside>
      <section className="main">
        <header className="topbar">Financial Intake / Bookkeeping — Phase 3 Evidence and Substantiation Foundation</header>
        <main className="content">
          {active === 'dashboard' && <DashboardPage />}
          {active === 'transactions' && <TransactionsPage />}
          {active === 'review_queue' && <ReviewQueuePage />}
          {active === 'missing_evidence' && <MissingEvidencePage />}
          {active === 'unmatched_documents' && <UnmatchedDocumentsPage />}
          {active === 'imports' && <ImportsPage />}
          {active === 'documents' && <DocumentsPage />}
          {active === 'settings' && <SettingsPage />}
        </main>
      </section>
    </div>
  );
}
