import { useState } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ImportsPage } from './pages/ImportsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { SettingsPage } from './pages/SettingsPage';

const nav = ['dashboard', 'transactions', 'imports', 'documents', 'settings'] as const;

export default function App() {
  const [active, setActive] = useState<(typeof nav)[number]>('dashboard');

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Phase 1 Tool</h1>
        {nav.map((item) => (
          <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>{item}</button>
        ))}
      </aside>
      <section className="main">
        <header className="topbar">Financial Intake / Bookkeeping — Phase 1 Core Intake Backbone</header>
        <main className="content">
          {active === 'dashboard' && <DashboardPage />}
          {active === 'transactions' && <TransactionsPage />}
          {active === 'imports' && <ImportsPage />}
          {active === 'documents' && <DocumentsPage />}
          {active === 'settings' && <SettingsPage />}
        </main>
      </section>
    </div>
  );
}
