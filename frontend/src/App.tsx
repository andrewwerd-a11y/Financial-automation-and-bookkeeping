import { useState } from 'react';
import { LedgerPage } from './pages/LedgerPage';
import { ManualEntryPage } from './pages/ManualEntryPage';
import { ImportPage } from './pages/ImportPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ReviewPage } from './pages/ReviewPage';
import { ReportsPage } from './pages/ReportsPage';

const tabs = ['ledger', 'manual', 'import', 'documents', 'review', 'reports'] as const;

export default function App() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('ledger');

  return (
    <main>
      <h1>Phase 0 Financial Intake & Evidence Platform</h1>
      <nav>
        {tabs.map((t) => <button key={t} onClick={() => setTab(t)}>{t}</button>)}
      </nav>
      {tab === 'ledger' && <LedgerPage />}
      {tab === 'manual' && <ManualEntryPage />}
      {tab === 'import' && <ImportPage />}
      {tab === 'documents' && <DocumentsPage />}
      {tab === 'review' && <ReviewPage />}
      {tab === 'reports' && <ReportsPage />}
    </main>
  );
}
