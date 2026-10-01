import React from 'react';
import { Alert } from 'react-native';

import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import EditAlert from '../../app/(app)/community/alerts/[id]/edit';
import { Role, parseAlert, parseUser } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockGet = jest.fn();
const mockMedia = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'alert-1' }),
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    alerts: {
      get: (...args: unknown[]) => mockGet(...args),
      media: (...args: unknown[]) => mockMedia(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      remove: (...args: unknown[]) => mockRemove(...args),
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
  const actual = jest.requireActual('../../presentation/screens/community/alerts/forms/AlertForm');
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    ...actual,
    AlertForm: ({ formData }: { formData: { title: string } }) =>
      mockReact.createElement(MockText, null, formData.title),
  };
});

const renderRoute = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <EditAlert />
    </AppThemeProvider>,
  );

const alert = parseAlert({
  id: 'alert-1',
  title: 'Volunteer workday',
  info: 'Meet at noon.',
  createdAt: new Date('2025-04-15T12:00:00.000Z'),
  createdBy: parseUser({
    id: 'admin-1',
    email: 'admin@gatech.edu',
    role: Role.Officer,
  }),
  authorAlias: 'Campus Cats',
});

describe('edit alert route', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockBack.mockReset();
    mockReplace.mockReset();
    mockGet.mockReset();
    mockMedia.mockReset();
    mockUpdate.mockReset();
    mockRemove.mockReset();
    mockGet.mockResolvedValue({ ok: true, value: alert, warnings: [] });
    mockMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockUpdate.mockResolvedValue({
      ok: true,
      value: alert,
      warnings: [],
    });
    mockRemove.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
  });

  it('shows loading state and navigates by ID after a successful save', async () => {
    let finishGet: ((value: unknown) => void) | undefined;
    mockGet.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishGet = resolve;
        }),
    );
    const user = userEvent.setup();
    await renderRoute();

    expect(screen.getByText('Edit alert')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading alert form' }),
    ).toBeOnTheScreen();
    await act(async () =>
      finishGet?.({ ok: true, value: alert, warnings: [] }),
    );
    expect(await screen.findByText('Volunteer workday')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Save Alert' }));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/community/alerts/[id]',
        params: { id: 'alert-1' },
      }),
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'admin-1' }),
      'alert-1',
      expect.objectContaining({ title: 'Volunteer workday' }),
    );
  });

  it('explains officer-only access from the header shield', async () => {
    const user = userEvent.setup();
    await renderRoute();
    await screen.findByText('Volunteer workday');

    await user.press(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    );

    expect(screen.getByText('Officer-only page')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Everyone can read club alerts. Officer-level access is required to create, edit, or delete alerts.',
      ),
    ).toBeOnTheScreen();
  });

  it('requires destructive confirmation before deleting', async () => {
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    await renderRoute();
    await screen.findByText('Volunteer workday');
    await user.press(
      screen.getByRole('button', { name: 'Delete Alert' }),
    );

    expect(mockRemove).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      'Delete Alert',
      'Delete this alert forever?',
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0][2];
    const destructive = buttons?.find(
      (button) => button.style === 'destructive',
    );
    await act(async () => destructive?.onPress?.());

    await waitFor(() => expect(mockRemove).toHaveBeenCalled());
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/community',
      params: { section: 'alerts' },
    });
  });

  it('presents load and mutation errors without navigating', async () => {
    mockGet.mockResolvedValue({
      ok: false,
      error: { code: 'not_found', message: 'Alert not found' },
    });
    const { unmount } = await renderRoute();
    expect(
      await screen.findByText('Could not load alert'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Alert not found')).toBeOnTheScreen();
    await unmount();

    mockGet.mockResolvedValue({ ok: true, value: alert, warnings: [] });
    mockUpdate.mockResolvedValue({
      ok: false,
      error: {
        code: 'dependency_failure',
        message: 'Could not save alert',
      },
    });
    const user = userEvent.setup();
    await renderRoute();
    await screen.findByText('Volunteer workday');
    await user.press(screen.getByRole('button', { name: 'Save Alert' }));
    expect(
      await screen.findByRole('alert', { name: 'Could not save alert' }),
    ).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
