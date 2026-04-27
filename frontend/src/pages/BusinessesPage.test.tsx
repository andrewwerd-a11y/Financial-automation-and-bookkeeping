import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { BusinessesPage } from './BusinessesPage';

describe('BusinessesPage', () => {
  it('renders select-a-workspace guidance when no workspace is selected', async () => {
    renderPage(<BusinessesPage activeWorkspaceId="" activeBusinessId="" onSelectBusiness={vi.fn()} />);
    expect(await screen.findByText('Select a workspace first.')).toBeInTheDocument();
  });

  it('renders the business table when a workspace is provided', async () => {
    renderPage(<BusinessesPage activeWorkspaceId="wsp_test1" activeBusinessId="" onSelectBusiness={vi.fn()} />);
    await waitForLoadingToClear(/Loading businesses/);
    expect(screen.getByText('Main Business')).toBeInTheDocument();
  });

  it('renders empty state when there are no businesses', async () => {
    renderPage(<BusinessesPage activeWorkspaceId="wsp_test1" activeBusinessId="" onSelectBusiness={vi.fn()} />, { businesses: [] });
    expect(await screen.findByText('No businesses yet.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/businesses`, () => HttpResponse.error()));
    renderPage(<BusinessesPage activeWorkspaceId="wsp_test1" activeBusinessId="" onSelectBusiness={vi.fn()} />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('disables Create Business when the name is empty', async () => {
    renderPage(<BusinessesPage activeWorkspaceId="wsp_test1" activeBusinessId="" onSelectBusiness={vi.fn()} />);
    await waitForLoadingToClear(/Loading businesses/);
    expect(screen.getByRole('button', { name: 'Create Business' })).toBeDisabled();
  });
});
