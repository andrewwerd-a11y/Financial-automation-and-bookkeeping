import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { TransactionsPage } from './TransactionsPage';

describe('TransactionsPage', () => {
  it('renders loading state initially', () => {
    renderPage(<TransactionsPage activeBusinessId="biz_test1" />);
    expect(screen.getByText('Loading transactions...')).toBeInTheDocument();
  });

  it('renders table with transaction data and create form', async () => {
    renderPage(<TransactionsPage activeBusinessId="biz_test1" />);
    await waitForLoadingToClear(/Loading transactions/);

    expect(document.querySelector('input[type="date"]')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Vendor')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('renders empty state when API returns no transactions', async () => {
    renderPage(<TransactionsPage activeBusinessId="biz_test1" />, { transactions: [] });
    expect(await screen.findByText('No transactions yet.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/transactions`, () => HttpResponse.error()));
    renderPage(<TransactionsPage activeBusinessId="biz_test1" />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('creates a manual transaction and opens the detail panel with review controls', async () => {
    const user = userEvent.setup();
    renderPage(<TransactionsPage activeBusinessId="biz_test1" />);
    await waitForLoadingToClear(/Loading transactions/);

    await user.type(screen.getByPlaceholderText('Vendor'), 'New Vendor');
    await user.type(screen.getByPlaceholderText('Amount'), '20');
    await user.type(screen.getByPlaceholderText('Raw description'), 'Subscription');
    await user.type(screen.getByDisplayValue(''), '2026-04-15');
    await user.click(screen.getByRole('button', { name: 'Create Manual Transaction' }));

    expect(await screen.findByText('New Vendor')).toBeInTheDocument();

    const newRow = screen.getByText('New Vendor').closest('tr');
    expect(newRow).not.toBeNull();
    await user.click(within(newRow as HTMLElement).getByRole('button', { name: 'Open' }));

    expect(await screen.findByText('Transaction Detail')).toBeInTheDocument();
    expect(screen.getByText('Review Action')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link Document' })).toBeInTheDocument();
    expect(screen.getByText('Review History')).toBeInTheDocument();
  });
});
