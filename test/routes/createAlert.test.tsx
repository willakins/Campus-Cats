import React from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import CreateAlert from '../../app/(app)/community/alerts/new';
import { AppThemeProvider } from '../../theme';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCreate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    alerts: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

jest.mock('../../presentation/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@gatech.edu', role: 1 },
  }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../presentation/screens/community/alerts/forms/AlertForm', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    AlertForm: () =>
      mockReact.createElement(MockText, null, 'Alert fields'),
    validateAlertForm: () => ({}),
    firstAlertErrorField: () => undefined,
  };
});

const renderRoute = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <CreateAlert />
    </AppThemeProvider>,
  );

describe('create alert route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks duplicate submissions while a save is pending', async () => {
    let resolveCreate: (value: unknown) => void = () => undefined;
    mockCreate.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    await renderRoute();

    const save = screen.getByRole('button', { name: 'Create Alert' });
    await fireEvent.press(save);
    await fireEvent.press(save);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Creating alert…')).toBeOnTheScreen();

    await act(async () => {
      resolveCreate({ ok: true, value: undefined, warnings: [] });
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/community',
      params: { section: 'alerts' },
    });
  });

  it('shows a failed save inline and leaves the form in place', async () => {
    mockCreate.mockResolvedValue({
      ok: false,
      error: {
        code: 'dependency_failure',
        message: 'The alert could not be saved',
      },
    });
    await renderRoute();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Create Alert' }),
    );

    expect(
      await screen.findByRole('alert', {
        name: 'The alert could not be saved',
      }),
    ).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('navigates after a successful save', async () => {
    mockCreate.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    await renderRoute();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Create Alert' }),
    );

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/community',
        params: { section: 'alerts' },
      }),
    );
  });

  it('explains Officer-only access from the header shield', async () => {
    await renderRoute();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    );

    expect(screen.getByText('Officer-only page')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Everyone can read club alerts. Officer-level access is required to create, edit, or delete alerts.',
      ),
    ).toBeOnTheScreen();
  });
});
