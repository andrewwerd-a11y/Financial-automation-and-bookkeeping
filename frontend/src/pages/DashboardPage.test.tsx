import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE, handlers } from '../mocks/handlers';
import { mockApiState } from '../mocks/mockApi';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  it('renders loading state initially', () => {
    renderPage(<DashboardPage />);
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('renders stat counts and section headers after data loads', async () => {
    renderPage(<DashboardPage />);
    await waitForLoadingToClear(/Loading dashboard/);

    expect(screen.getByText(/Transactions: 2/)).toBeInTheDocument();
    expect(screen.getByText('Recent transactions')).toBeInTheDocument();
    expect(screen.getByText('Recent documents')).toBeInTheDocument();
    expect(screen.getByText('Recent source files')).toBeInTheDocument();
    expect(screen.getByText('Recent ingestion jobs')).toBeInTheDocument();
  });

  it('renders empty state when API returns no dashboard payload', async () => {
    renderPage(<DashboardPage />, { dashboardOverride: null });
    expect(await screen.findByText('No dashboard data available.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/dashboard`, () => HttpResponse.error()));
    renderPage(<DashboardPage />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('reloads data when Reload is clicked', async () => {
    const user = userEvent.setup();
    renderPage(<DashboardPage />);
    await waitForLoadingToClear(/Loading dashboard/);

    mockApiState.transactions.push({
      ...mockApiState.transactions[0],
      id: 'txn_dash_new',
      vendor: 'Stripe',
      amount: 15
    });

    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(await screen.findByText(/Transactions: 3/)).toBeInTheDocument();
  });
});
