import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { ExportsPage } from './ExportsPage';

describe('ExportsPage', () => {
  it('renders export buttons', async () => {
    renderPage(<ExportsPage activeBusinessId="biz_test1" />);
    await waitForLoadingToClear(/Loading exports/);

    expect(screen.getByRole('button', { name: 'Export Transactions CSV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export Documents CSV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export Evidence Links CSV' })).toBeInTheDocument();
  });

  it('renders empty state when no export jobs exist', async () => {
    renderPage(<ExportsPage activeBusinessId="biz_test1" />, { exportJobs: [] });
    expect(await screen.findByText('No export jobs yet.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/exports`, () => HttpResponse.error()));
    renderPage(<ExportsPage activeBusinessId="biz_test1" />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('creates an export job and refreshes the table', async () => {
    const user = userEvent.setup();
    renderPage(<ExportsPage activeBusinessId="biz_test1" />, { exportJobs: [] });
    await waitForLoadingToClear(/Loading exports/);

    await user.click(screen.getByRole('button', { name: 'Export Transactions CSV' }));
    expect(await screen.findByText(/Created export job/)).toBeInTheDocument();
    expect(await screen.findByText('transactions')).toBeInTheDocument();
  });
});
