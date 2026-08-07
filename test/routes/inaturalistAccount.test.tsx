import React from 'react';
import { Alert, Linking } from 'react-native';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';

import InaturalistAccount from '../../app/(app)/settings/inaturalist-account';
import { AppThemeProvider } from '../../theme';

const mockBack = jest.fn();
const mockBegin = jest.fn();
const mockStatus = jest.fn();
const mockUnlink = jest.fn();
let mockAttempt: string | undefined;

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const ReactModule = require('react');
    ReactModule.useEffect(effect, [effect]);
  },
  useLocalSearchParams: () => ({ attempt: mockAttempt }),
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'member-1', email: 'member@gatech.edu', role: 0 },
  }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    inaturalistAccounts: {
      begin: (...args: unknown[]) => mockBegin(...args),
      status: (...args: unknown[]) => mockStatus(...args),
      unlink: (...args: unknown[]) => mockUnlink(...args),
    },
  },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderRoute = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <InaturalistAccount />
    </AppThemeProvider>,
  );

describe('iNaturalist account link route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAttempt = undefined;
    mockStatus.mockResolvedValue({
      ok: true,
      value: { status: 'unlinked' },
      warnings: [],
    });
    mockBegin.mockResolvedValue({
      ok: true,
      value: {
        authorizationUrl: 'https://www.inaturalist.org/oauth/authorize?scope=login',
        attemptId: 'attempt-1',
      },
      warnings: [],
    });
    mockUnlink.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    jest.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
      type: 'success',
      url: 'campuscats://settings/inaturalist-account?attempt=attempt-1&result=success',
    });
  });

  it('explains consent and completes the system-browser link flow', async () => {
    const user = userEvent.setup();
    await renderRoute();

    expect(
      await screen.findByText('Connect your iNaturalist account'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/Georgia Tech Cat Sightings project/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/will not import your other observations/)).toBeOnTheScreen();

    mockStatus.mockResolvedValueOnce({
      ok: true,
      value: {
        status: 'linked',
        account: { inaturalistUserId: 42, login: 'cat_watcher' },
      },
      warnings: [],
    });
    await user.press(screen.getByRole('button', { name: 'Connect iNaturalist' }));

    await waitFor(() =>
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
        expect.stringContaining('scope=login'),
        expect.stringContaining('campuscats'),
        expect.any(Object),
      ),
    );
    expect(await screen.findByText('@cat_watcher')).toBeOnTheScreen();
  });

  it('shows a verified account and unlinks it after confirmation', async () => {
    mockStatus.mockResolvedValue({
      ok: true,
      value: {
        status: 'linked',
        account: { inaturalistUserId: 42, login: 'cat_watcher' },
      },
      warnings: [],
    });
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.style === 'destructive')?.onPress?.();
    });
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const user = userEvent.setup();
    await renderRoute();

    expect(await screen.findByText('@cat_watcher')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'View on iNaturalist' }));
    expect(openUrl).toHaveBeenCalledWith(
      'https://www.inaturalist.org/people/cat_watcher',
    );
    await user.press(screen.getByRole('button', { name: 'Unlink iNaturalist' }));
    await waitFor(() => expect(mockUnlink).toHaveBeenCalled());
  });
});
