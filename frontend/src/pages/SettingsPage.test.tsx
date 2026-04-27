import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { SettingsPage } from './SettingsPage';

describe('SettingsPage', () => {
  it('renders the health status section', async () => {
    renderPage(<SettingsPage activeWorkspaceId="" />);
    await waitForLoadingToClear(/Checking system status/);
    expect(screen.getByText(/Backend health: ok/)).toBeInTheDocument();
  });

  it('renders select-a-workspace guidance when no workspace is active', async () => {
    renderPage(<SettingsPage activeWorkspaceId="" />);
    expect(await screen.findByText('Select a workspace to manage settings.')).toBeInTheDocument();
  });

  it('renders the workspace settings table when a workspace is selected', async () => {
    renderPage(<SettingsPage activeWorkspaceId="wsp_test1" />);
    await waitForLoadingToClear(/Loading workspace settings/);
    expect(screen.getByText('fiscal_year_start')).toBeInTheDocument();
  });

  it('renders empty state when selected workspace has no settings', async () => {
    renderPage(<SettingsPage activeWorkspaceId="wsp_test1" />, { settings: [] });
    expect(await screen.findByText('No settings for this workspace yet.')).toBeInTheDocument();
  });

  it('renders error state when settings API fails', async () => {
    server.use(http.get(`${BASE}/settings`, () => HttpResponse.error()));
    renderPage(<SettingsPage activeWorkspaceId="wsp_test1" />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });
});
