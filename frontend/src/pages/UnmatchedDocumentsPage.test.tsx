import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { mockApiState } from '../mocks/mockApi';
import { server } from '../mocks/server';
import { renderPage } from '../test-utils';
import { UnmatchedDocumentsPage } from './UnmatchedDocumentsPage';

describe('UnmatchedDocumentsPage', () => {
  it('renders empty state when no unmatched documents exist', async () => {
    renderPage(<UnmatchedDocumentsPage />, { documents: [] });
    expect(await screen.findByText('No unmatched documents.')).toBeInTheDocument();
  });

  it('renders table when documents are returned', async () => {
    renderPage(<UnmatchedDocumentsPage />);
    expect(await screen.findByText('receipt.pdf')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/evidence/queues/unmatched-documents`, () => HttpResponse.error()));
    renderPage(<UnmatchedDocumentsPage />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('refreshes the queue when Refresh is clicked', async () => {
    const user = userEvent.setup();
    renderPage(<UnmatchedDocumentsPage />, { documents: [] });
    expect(await screen.findByText('No unmatched documents.')).toBeInTheDocument();

    mockApiState.documents.push({
      ...mockApiState.documents[0],
      id: 'doc_new',
      file_name: 'invoice.pdf'
    });
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('invoice.pdf')).toBeInTheDocument();
  });
});
