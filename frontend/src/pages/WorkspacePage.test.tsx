import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { WorkspacePage } from './WorkspacePage';

describe('WorkspacePage', () => {
  it('renders workspace list and forms', async () => {
    renderPage(<WorkspacePage activeWorkspaceId="" onSelectWorkspace={vi.fn()} />);
    await waitForLoadingToClear(/Loading workspace data/);

    expect(screen.getByPlaceholderText('Workspace name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Workspace slug')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Display name')).toBeInTheDocument();
    expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
  });

  it('renders empty state when no workspaces exist', async () => {
    renderPage(<WorkspacePage activeWorkspaceId="" onSelectWorkspace={vi.fn()} />, {
      workspaces: [],
      users: [],
      workspaceMembers: []
    });
    expect(await screen.findByText('No workspaces yet.')).toBeInTheDocument();
    expect(screen.getByText('No members for selected workspace.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/workspaces`, () => HttpResponse.error()));
    renderPage(<WorkspacePage activeWorkspaceId="" onSelectWorkspace={vi.fn()} />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });
});
