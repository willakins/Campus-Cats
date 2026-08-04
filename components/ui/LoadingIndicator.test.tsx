import React from 'react';

import { render, screen } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import { LoadingIndicator } from './LoadingIndicator';

describe('LoadingIndicator', () => {
  it('announces a stable default loading state', () => {
    render(
      <AppThemeProvider colorScheme="dark">
        <LoadingIndicator />
      </AppThemeProvider>,
    );

    expect(screen.getByRole('progressbar', { name: 'Getting things ready…' })).toBeOnTheScreen();
  });

  it('accepts a task-specific loading label', () => {
    render(
      <AppThemeProvider colorScheme="light">
        <LoadingIndicator label="Loading announcement" />
      </AppThemeProvider>,
    );

    expect(screen.getByRole('progressbar', { name: 'Loading announcement' })).toBeOnTheScreen();
  });
});
