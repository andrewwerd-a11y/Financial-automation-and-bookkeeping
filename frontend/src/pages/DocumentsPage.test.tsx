import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { mockApiState } from '../mocks/mockApi';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { DocumentsPage } from './DocumentsPage';

describe('DocumentsPage', () => {
  it('renders empty state when no documents exist', async () => {
    renderPage(<DocumentsPage activeBusinessId="biz_test1" />, { documents: [] });
    expect(await screen.findByText('No uploaded documents yet.')).toBeInTheDocument();
  });

  it('renders upload controls and disables upload until a file is selected', async () => {
    renderPage(<DocumentsPage activeBusinessId="biz_test1" />);
    await waitForLoadingToClear(/Loading documents/);
    expect(screen.getByRole('button', { name: 'Upload Document' })).toBeDisabled();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/documents`, () => HttpResponse.error()));
    renderPage(<DocumentsPage activeBusinessId="biz_test1" />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('refreshes the document list', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/documents`, () => HttpResponse.json([])));
    renderPage(<DocumentsPage activeBusinessId="biz_test1" />);
    expect(await screen.findByText('No uploaded documents yet.')).toBeInTheDocument();

    const refreshedDocument = {
      id: 'doc_refresh',
      workspace_id: 'wsp_test1',
      business_id: 'biz_test1',
      source_file_id: 'src_refresh',
      file_name: 'contract.pdf',
      mime_type: 'application/pdf',
      uploaded_at: '2026-04-10T00:00:00.000Z',
      notes: '',
      matched_status: 'unmatched',
      linked_transaction_count: 0
    };
    server.use(http.get(`${BASE}/documents`, () => HttpResponse.json([refreshedDocument])));
    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByText('contract.pdf')).toBeInTheDocument();
  });
});
