import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { mockApiState } from '../mocks/mockApi';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { MissingEvidencePage } from './MissingEvidencePage';

describe('MissingEvidencePage', () => {
  it('renders empty state when no transactions are missing evidence', async () => {
    server.use(http.get(`${BASE}/evidence/queues/missing-transactions`, () => HttpResponse.json([])));
    renderPage(<MissingEvidencePage />);
    expect(await screen.findByText('No transactions in the missing-evidence queue.')).toBeInTheDocument();
  });

  it('renders table rows when transactions are returned', async () => {
    renderPage(<MissingEvidencePage />);
    await waitForLoadingToClear(/Loading queue/);
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/evidence/queues/missing-transactions`, () => HttpResponse.error()));
    renderPage(<MissingEvidencePage />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('includes a Refresh button that reloads data', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/evidence/queues/missing-transactions`, () => HttpResponse.json([])));
    renderPage(<MissingEvidencePage />);
    expect(await screen.findByText('No transactions in the missing-evidence queue.')).toBeInTheDocument();

    server.use(http.get(`${BASE}/evidence/queues/missing-transactions`, () => HttpResponse.json([{
      ...mockApiState.transactions[0],
      id: 'txn_missing_new',
      vendor: 'UPS'
    }])));
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('UPS')).toBeInTheDocument();
  });
});
