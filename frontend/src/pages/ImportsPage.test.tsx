import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { ImportsPage } from './ImportsPage';

describe('ImportsPage', () => {
  it('renders single and bulk import sections with template dropdown', async () => {
    renderPage(<ImportsPage activeBusinessId="biz_test1" />);
    await waitForLoadingToClear(/Loading imports/);

    expect(screen.getByText('Single File Import')).toBeInTheDocument();
    expect(screen.getByText('Bulk File Import')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
  });

  it('renders empty state when no CSV imports exist', async () => {
    renderPage(<ImportsPage activeBusinessId="biz_test1" />, { sourceFiles: [] });
    expect(await screen.findByText('No CSV imports yet.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/imports`, () => HttpResponse.error()));
    renderPage(<ImportsPage activeBusinessId="biz_test1" />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('keeps upload button disabled when no file is selected', async () => {
    renderPage(<ImportsPage activeBusinessId="biz_test1" />);
    await waitForLoadingToClear(/Loading imports/);
    expect(screen.getByRole('button', { name: 'Upload CSV' })).toBeDisabled();
  });

  it('uploads a CSV file and shows the success message', async () => {
    const user = userEvent.setup();
    const { container } = renderPage(<ImportsPage activeBusinessId="biz_test1" />);
    await waitForLoadingToClear(/Loading imports/);
    server.use(
      http.post(`${BASE}/imports/csv`, () =>
        HttpResponse.json({ importedCount: 1, skippedCount: 0, jobId: 'job_upload_test' })
      )
    );

    const file = new File(['Date,Vendor,Amount\n2026-04-01,GitHub,10'], 'transactions.csv', { type: 'text/csv' });
    const fileInputs = container.querySelectorAll('input[type="file"]');
    await user.upload(fileInputs[0] as HTMLInputElement, file);
    await user.click(screen.getByRole('button', { name: 'Upload CSV' }));

    expect(await screen.findByText(/Imported 1 rows, skipped 0/)).toBeInTheDocument();
  });
});
