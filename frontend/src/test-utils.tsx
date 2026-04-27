import { render, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { MockApiState } from './mocks/mockApi';
import { resetMockApi } from './mocks/mockApi';

export const renderPage = (ui: ReactElement, overrides?: Partial<MockApiState>) => {
  resetMockApi(overrides);
  return render(ui);
};

export const waitForLoadingToClear = async (label: RegExp | string) => {
  await waitFor(() => {
    expect(document.body).not.toHaveTextContent(label);
  });
};
