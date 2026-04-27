import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { PoliciesPage } from './PoliciesPage';

describe('PoliciesPage', () => {
  it('renders select-a-workspace guidance when no workspace is selected', async () => {
    renderPage(<PoliciesPage activeWorkspaceId="" activeBusinessId="" />);
    expect(await screen.findByText('Select a workspace first.')).toBeInTheDocument();
  });

  it('renders backfill button and policy type dropdown options', async () => {
    renderPage(<PoliciesPage activeWorkspaceId="wsp_test1" activeBusinessId="biz_test1" />);
    await waitForLoadingToClear(/Loading policies/);

    expect(screen.getByRole('button', { name: 'Backfill Existing Transactions' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'amount_threshold' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'category_restriction' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'missing_evidence' })).toBeInTheDocument();
  });

  it('renders empty state when there are no policies', async () => {
    renderPage(<PoliciesPage activeWorkspaceId="wsp_test1" activeBusinessId="biz_test1" />, { policies: [] });
    expect(await screen.findByText('No policy rules for this business.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/policies`, () => HttpResponse.error()));
    renderPage(<PoliciesPage activeWorkspaceId="wsp_test1" activeBusinessId="biz_test1" />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('keeps the backfill success message visible after the list reloads', async () => {
    const user = userEvent.setup();
    renderPage(<PoliciesPage activeWorkspaceId="wsp_test1" activeBusinessId="biz_test1" />);
    await waitForLoadingToClear(/Loading policies/);

    await user.click(screen.getByRole('button', { name: 'Backfill Existing Transactions' }));
    expect(await screen.findByText(/Backfilled/)).toBeInTheDocument();
  });
});
