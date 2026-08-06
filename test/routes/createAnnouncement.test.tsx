import React from 'react';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CreateAnnouncement from '../../app/(app)/announcements/create-ann';
import { AppThemeProvider } from '../../theme';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCreate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    announcements: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

jest.mock('../../providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@gatech.edu', role: 1 },
  }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../forms/AnnouncementForm', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    AnnouncementForm: () => mockReact.createElement(MockText, null, 'Announcement fields'),
  };
});

const renderRoute = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <CreateAnnouncement />
    </AppThemeProvider>,
  );

describe('create announcement route', () => {
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

    const save = screen.getByRole('button', { name: 'Create Announcement' });
    await fireEvent.press(save);
    await fireEvent.press(save);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Creating announcement…')).toBeOnTheScreen();

    await act(async () => {
      resolveCreate({ ok: true, value: undefined, warnings: [] });
    });
    expect(mockReplace).toHaveBeenCalledWith('/announcements');
  });

  it('shows a failed save inline and leaves the form in place', async () => {
    mockCreate.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'The announcement could not be saved' },
    });
    await renderRoute();

    await fireEvent.press(screen.getByRole('button', { name: 'Create Announcement' }));

    expect(
      await screen.findByRole('alert', { name: 'The announcement could not be saved' }),
    ).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('navigates after a successful save', async () => {
    mockCreate.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    await renderRoute();

    await fireEvent.press(screen.getByRole('button', { name: 'Create Announcement' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/announcements'));
  });
});
