import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import { Button } from '@/presentation/ui';
import { AppThemeProvider } from '@/theme';
import { AppToastProvider, useAppToast } from './AppToastProvider';

let mockPathname = '/catalog/cat-1/edit';

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const QueueSuccess = () => {
  const { queueSuccessToast } = useAppToast();
  return (
    <Button
      label="Queue success"
      onPress={() => queueSuccessToast('Catalog entry saved.')}
    />
  );
};

describe('AppToastProvider', () => {
  beforeEach(() => {
    mockPathname = '/catalog/cat-1/edit';
  });

  it('waits for navigation before showing a queued success toast', async () => {
    const user = userEvent.setup();
    const view = await render(
      <AppThemeProvider colorScheme="light">
        <AppToastProvider>
          <QueueSuccess />
        </AppToastProvider>
      </AppThemeProvider>,
    );

    await user.press(screen.getByRole('button', { name: 'Queue success' }));
    expect(
      screen.queryByRole('alert', { name: 'Catalog entry saved.' }),
    ).not.toBeOnTheScreen();

    mockPathname = '/catalog/cat-1';
    await view.rerender(
      <AppThemeProvider colorScheme="light">
        <AppToastProvider>
          <QueueSuccess />
        </AppToastProvider>
      </AppThemeProvider>,
    );

    expect(
      await screen.findByRole('alert', { name: 'Catalog entry saved.' }),
    ).toHaveProp('accessibilityLiveRegion', 'polite');
  });
});
