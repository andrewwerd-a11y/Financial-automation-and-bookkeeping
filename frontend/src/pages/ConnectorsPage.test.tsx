import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { ConnectorsPage } from './ConnectorsPage';

describe('ConnectorsPage', () => {
  it('renders connector type dropdown and create button', async () => {
    renderPage(<ConnectorsPage />);
    await waitForLoadingToClear(/Loading connectors/);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Connector' })).toBeInTheDocument();
  });

  it('renders empty states for connectors and sync jobs', async () => {
    renderPage(<ConnectorsPage />, { connectors: [], connectorSyncJobs: [] });
    expect(await screen.findByText('No connectors configured.')).toBeInTheDocument();
    expect(screen.getByText('No sync jobs yet.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/connectors`, () => HttpResponse.error()));
    renderPage(<ConnectorsPage />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });
});
