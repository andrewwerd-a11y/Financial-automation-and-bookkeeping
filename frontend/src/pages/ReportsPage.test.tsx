import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { ReportsPage } from './ReportsPage';

describe('ReportsPage', () => {
  it('renders summary stats and report tables', async () => {
    renderPage(<ReportsPage activeBusinessId="biz_test1" />);
    await waitForLoadingToClear(/Loading reports/);

    expect(screen.getByText('By Category')).toBeInTheDocument();
    expect(screen.getByText('By Review Status')).toBeInTheDocument();
    expect(screen.getByText('By Evidence Status')).toBeInTheDocument();
    expect(screen.getByText(/Total transactions:/)).toBeInTheDocument();
  });

  it('renders empty state when API returns null', async () => {
    server.use(http.get(`${BASE}/reports/summary`, () => HttpResponse.json(null)));
    renderPage(<ReportsPage activeBusinessId="biz_test1" />);
    expect(await screen.findByText('No report data available.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/reports/summary`, () => HttpResponse.error()));
    renderPage(<ReportsPage activeBusinessId="biz_test1" />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });
});
