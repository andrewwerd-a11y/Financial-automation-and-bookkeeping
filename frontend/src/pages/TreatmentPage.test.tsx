import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { TreatmentPage } from './TreatmentPage';

describe('TreatmentPage', () => {
  it('renders the summary section and bucket view', async () => {
    renderPage(<TreatmentPage />);
    await waitForLoadingToClear(/Loading treatment buckets/);
    expect(screen.getByText(/All \(/)).toBeInTheDocument();
    expect(screen.getByText('Treatment')).toBeInTheDocument();
  });

  it('renders empty state when no treatment transactions are returned', async () => {
    renderPage(<TreatmentPage />, { transactions: [] });
    expect(await screen.findByText('No transactions for this treatment bucket.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/treatment/summary`, () => HttpResponse.error()));
    renderPage(<TreatmentPage />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('shows the accountant queue toggle and inline treatment dropdowns', async () => {
    renderPage(<TreatmentPage />);
    await waitForLoadingToClear(/Loading treatment buckets/);
    expect(screen.getByRole('button', { name: 'Show Accountant Queue' })).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
  });
});
