import React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import AppSettingsScreen from '../../app/(app)/settings/app-settings';
import { DEFAULT_APP_SETTINGS, Role } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

let mockRole: Role = Role.Member;
const mockGet = jest.fn();
const mockSave = jest.fn();
const mockPickFromLibrary = jest.fn();
const mockApplySettings = jest.fn();

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useRouter: () => ({ back: jest.fn() }),
    useFocusEffect: (callback: () => void) => mockReact.useEffect(callback, [callback]),
  };
});

jest.mock('../../providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'actor-1', email: 'actor@gatech.edu', role: mockRole },
  }),
}));

jest.mock('../../providers/AppSettingsProvider', () => ({
  useAppSettings: () => ({ applySettings: mockApplySettings }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    appSettings: {
      get: (...args: unknown[]) => mockGet(...args),
      save: (...args: unknown[]) => mockSave(...args),
    },
    imageSelection: {
      pickFromLibrary: (...args: unknown[]) => mockPickFromLibrary(...args),
    },
  },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderScreen = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <AppSettingsScreen />
    </AppThemeProvider>,
  );

describe('president app settings route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Member;
    mockGet.mockResolvedValue({ ok: true, value: DEFAULT_APP_SETTINGS, warnings: [] });
    mockSave.mockResolvedValue({ ok: true, value: DEFAULT_APP_SETTINGS, warnings: [] });
    mockPickFromLibrary.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
  });

  it('does not load settings for non-presidents, including developers', async () => {
    mockRole = Role.Developer;
    await renderScreen();

    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(screen.getByText('Only the President may manage app settings.')).toBeOnTheScreen();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('does not offer editable defaults when the saved settings cannot be loaded', async () => {
    mockRole = Role.President;
    mockGet.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Could not load app settings' },
    });
    await renderScreen();

    expect(await screen.findByText('Could not load app settings')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Primary color')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Save App Settings' }))
      .not.toBeOnTheScreen();
  });

  it('loads, edits, and applies settings for the President', async () => {
    mockRole = Role.President;
    const saved = {
      ...DEFAULT_APP_SETTINGS,
      primaryColor: '#0057B8',
      sightingsAnonymous: false,
    };
    mockSave.mockResolvedValue({ ok: true, value: saved, warnings: [] });
    await renderScreen();

    await screen.findByDisplayValue('#18314F');
    await fireEvent.changeText(screen.getByLabelText('Primary color'), '#0057B8');
    await fireEvent(
      screen.getByLabelText('Keep sightings anonymous'),
      'valueChange',
      false,
    );
    expect(screen.getByDisplayValue('#0057B8')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Keep sightings anonymous' }))
      .not.toBeChecked();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Save App Settings' }),
    );

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.President }),
        expect.objectContaining({
          primaryColor: '#0057B8',
          sightingsAnonymous: false,
        }),
        undefined,
      ),
    );
    await waitFor(() => {
      expect(mockApplySettings).toHaveBeenCalledWith(saved);
      expect(screen.getByText('App settings saved.')).toBeOnTheScreen();
    });
  });
});
