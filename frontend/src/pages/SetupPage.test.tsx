import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderPage } from '../test-utils';
import { SetupPage } from './SetupPage';

describe('SetupPage', () => {
  it('renders static setup checklist content', () => {
    renderPage(<SetupPage />);
    expect(screen.getByText('Product Setup (Placeholder)')).toBeInTheDocument();
    expect(screen.getByText('Create/select a workspace.')).toBeInTheDocument();
    expect(screen.getByText('Create operators and assign workspace membership.')).toBeInTheDocument();
    expect(screen.getByText('Create businesses under the active workspace.')).toBeInTheDocument();
    expect(screen.getByText('Define policy rules for each business.')).toBeInTheDocument();
  });
});
