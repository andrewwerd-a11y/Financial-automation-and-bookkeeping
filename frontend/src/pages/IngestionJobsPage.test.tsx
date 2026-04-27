import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { IngestionJobsPage } from './IngestionJobsPage';

describe('IngestionJobsPage', () => {
  it('renders empty state when no jobs exist', async () => {
    renderPage(<IngestionJobsPage />, { ingestionJobs: [] });
    expect(await screen.findByText('No ingestion jobs yet.')).toBeInTheDocument();
  });

  it('renders a jobs table when data exists', async () => {
    renderPage(<IngestionJobsPage />);
    await waitForLoadingToClear(/Loading ingestion jobs/);
    expect(screen.getByText('csv_import')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/imports/jobs`, () => HttpResponse.error()));
    renderPage(<IngestionJobsPage />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('opens the job detail panel', async () => {
    const user = userEvent.setup();
    renderPage(<IngestionJobsPage />);
    await waitForLoadingToClear(/Loading ingestion jobs/);

    const row = screen.getByText('csv_import').closest('tr');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Open' }));

    expect(await screen.findByText('Ingestion Job Detail')).toBeInTheDocument();
  });
});
