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

jest.mock('../../presentation/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'actor-1', email: 'actor@gatech.edu', role: mockRole },
  }),
}));

jest.mock('../../presentation/providers/AppSettingsProvider', () => ({
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

describe('president club settings route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Member;
    mockGet.mockResolvedValue({ ok: true, value: DEFAULT_APP_SETTINGS, warnings: [] });
    mockSave.mockResolvedValue({ ok: true, value: DEFAULT_APP_SETTINGS, warnings: [] });
    mockPickFromLibrary.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
  });

  it('does not load settings below the President role', async () => {
    mockRole = Role.VicePresident;
    await renderScreen();

    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'President-level access is required to manage club settings.',
      ),
    ).toBeOnTheScreen();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('loads settings for Developers through cascading authorization', async () => {
    mockRole = Role.Developer;
    await renderScreen();

    expect(await screen.findByLabelText('Primary color')).toBeOnTheScreen();
    expect(mockGet).toHaveBeenCalledTimes(1);
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
    expect(screen.queryByRole('button', { name: 'Save Club Settings' }))
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

    await screen.findByRole('button', { name: 'Primary color' });
    await fireEvent.press(screen.getByRole('button', { name: 'Primary color' }));
    await fireEvent.changeText(
      screen.getByLabelText('Custom primary color'),
      '#0057B8',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await fireEvent(
      screen.getByLabelText('Keep sightings anonymous'),
      'valueChange',
      false,
    );
    expect(screen.getByText('#0057B8')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Keep sightings anonymous' }))
      .not.toBeChecked();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Save Club Settings' }),
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
      expect(screen.getByText('Club settings saved.')).toBeOnTheScreen();
    });
  });

  it('updates primary and accent colors from their two-axis spectra', async () => {
    mockRole = Role.President;
    await renderScreen();

    await screen.findByRole('button', { name: 'Primary color' });
    await fireEvent.press(screen.getByRole('button', { name: 'Primary color' }));
    const primarySpectrum = screen.getByLabelText('Primary color color spectrum');
    await fireEvent(primarySpectrum, 'layout', {
      nativeEvent: { layout: { width: 300, height: 180, x: 0, y: 0 } },
    });
    await fireEvent(primarySpectrum, 'responderGrant', {
      nativeEvent: { locationX: 150, locationY: 90 },
    });
    expect(screen.getByTestId('primary-color-selection-marker')).toHaveStyle({
      left: '50.04%',
      top: '50%',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Accent color' }));
    const accentSpectrum = screen.getByLabelText('Accent color color spectrum');
    await fireEvent(accentSpectrum, 'layout', {
      nativeEvent: { layout: { width: 300, height: 180, x: 0, y: 0 } },
    });
    await fireEvent(accentSpectrum, 'responderGrant', {
      nativeEvent: { locationX: 225, locationY: 90 },
    });
    expect(screen.getByTestId('accent-color-selection-marker')).toHaveStyle({
      left: '74.98%',
      top: '50%',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByText('#00FF80')).toBeOnTheScreen();
    expect(screen.getByText('#0040FF')).toBeOnTheScreen();
    expect(screen.getByLabelText('Primary color preview')).toHaveStyle({
      backgroundColor: '#00FF80',
    });
    expect(screen.getByLabelText('Accent color preview')).toHaveStyle({
      backgroundColor: '#0040FF',
    });
  });

  it('keeps exact hex entry available in the color picker', async () => {
    mockRole = Role.President;
    await renderScreen();

    await screen.findByRole('button', { name: 'Primary color' });
    await fireEvent.press(screen.getByRole('button', { name: 'Primary color' }));
    await fireEvent.changeText(
      screen.getByLabelText('Custom primary color'),
      '#0057B8',
    );
    expect(screen.getByDisplayValue('#0057B8')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('#0057B8')).toBeOnTheScreen();
    expect(screen.getByLabelText('Primary color preview')).toHaveStyle({
      backgroundColor: '#0057B8',
    });
  });

  it('discards draft color changes when the picker is canceled', async () => {
    mockRole = Role.President;
    await renderScreen();

    await screen.findByRole('button', { name: 'Primary color' });
    await fireEvent.press(screen.getByRole('button', { name: 'Primary color' }));
    await fireEvent.changeText(
      screen.getByLabelText('Custom primary color'),
      '#0057B8',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('#18314F')).toBeOnTheScreen();
    expect(screen.getByLabelText('Primary color preview')).toHaveStyle({
      backgroundColor: '#18314F',
    });
  });

  it('shows the current club logo and uploads a chosen replacement when saved', async () => {
    mockRole = Role.President;
    mockPickFromLibrary.mockResolvedValue({
      ok: true,
      value: { localUri: 'file://new-app-logo.png' },
      warnings: [],
    });
    await renderScreen();

    expect(await screen.findByText('Club logo')).toBeOnTheScreen();
    expect(screen.getByLabelText('Current club logo')).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Publish Current Club Logo' }),
    ).not.toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Change Club Logo' }),
    );
    expect(mockPickFromLibrary).toHaveBeenCalledTimes(1);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Save Club Settings' }),
    );
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.President }),
        DEFAULT_APP_SETTINGS,
        'file://new-app-logo.png',
      ),
    );
  });
});
