import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { ReviewQueuePage } from './ReviewQueuePage';

describe('ReviewQueuePage', () => {
  it('renders loading state initially', () => {
    renderPage(<ReviewQueuePage activeBusinessId="biz_test1" />);
    expect(screen.getByText('Loading review queue...')).toBeInTheDocument();
  });

  it('renders queue actions and filter options after load', async () => {
    renderPage(<ReviewQueuePage activeBusinessId="biz_test1" />);
    await waitForLoadingToClear(/Loading review queue/);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'all' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'low_confidence' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark personal/i })).toBeInTheDocument();
  });

  it('renders empty state when queue is empty', async () => {
    renderPage(<ReviewQueuePage activeBusinessId="biz_test1" />, { transactions: [] });
    expect(await screen.findByText('No transactions match this filter.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/review/queue`, () => HttpResponse.error()));
    renderPage(<ReviewQueuePage activeBusinessId="biz_test1" />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });
});
