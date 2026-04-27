import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { ReconciliationPage } from './ReconciliationPage';

describe('ReconciliationPage', () => {
  it('renders Run Scan button', async () => {
    renderPage(<ReconciliationPage />);
    await waitForLoadingToClear(/Loading reconciliation candidates/);
    expect(screen.getByRole('button', { name: 'Run Reconciliation Scan' })).toBeInTheDocument();
  });

  it('renders empty state when there are no candidates', async () => {
    renderPage(<ReconciliationPage />, { reconciliationCandidates: [] });
    expect(await screen.findByText('No reconciliation candidates.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/reconciliation/candidates`, () => HttpResponse.error()));
    renderPage(<ReconciliationPage />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('renders candidate table rows when data exists', async () => {
    renderPage(<ReconciliationPage />);
    await waitForLoadingToClear(/Loading reconciliation candidates/);
    expect(screen.getByText(/Same date\/amount/)).toBeInTheDocument();
  });

  it('runs the scan and shows the result message', async () => {
    const user = userEvent.setup();
    renderPage(<ReconciliationPage />, { reconciliationCandidates: [] });
    expect(await screen.findByText('No reconciliation candidates.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Run Reconciliation Scan' }));
    expect(await screen.findByText(/Scan complete:/)).toBeInTheDocument();
  });
});
