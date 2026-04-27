import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { BASE } from '../mocks/handlers';
import { server } from '../mocks/server';
import { renderPage, waitForLoadingToClear } from '../test-utils';
import { ImportTemplatesPage } from './ImportTemplatesPage';

describe('ImportTemplatesPage', () => {
  it('renders create form and template table', async () => {
    renderPage(<ImportTemplatesPage />);
    await waitForLoadingToClear(/Loading templates/);

    expect(screen.getByPlaceholderText('Template name')).toBeInTheDocument();
    expect(screen.getByText('Default Bank CSV')).toBeInTheDocument();
  });

  it('renders empty state when there are no templates', async () => {
    renderPage(<ImportTemplatesPage />, { importTemplates: [] });
    expect(await screen.findByText('No import templates yet.')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    server.use(http.get(`${BASE}/imports/templates`, () => HttpResponse.error()));
    renderPage(<ImportTemplatesPage />);
    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });

  it('keeps Save Template disabled when the name is empty', async () => {
    renderPage(<ImportTemplatesPage />);
    await waitForLoadingToClear(/Loading templates/);
    expect(screen.getByRole('button', { name: 'Save Template' })).toBeDisabled();
  });
});
