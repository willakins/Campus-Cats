import React from 'react';

import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import EditAlert from '../../app/(app)/community/alerts/[id]/edit';
import EditCatalogEntry from '../../app/(app)/catalog/[id]/edit';
import EditSighting from '../../app/(app)/map/sightings/[id]/edit';
import EditStation from '../../app/(app)/stations/[id]/edit';
import { AppThemeProvider } from '../../theme';

const mockCatalogUpdate = jest.fn();
const mockAlertUpdate = jest.fn();
const mockSightingUpdate = jest.fn();
const mockStationUpdate = jest.fn();
const mockScrollTo = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'record-1' }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../presentation/ui', () => {
  const actual = jest.requireActual('../../presentation/ui');
  const ReactRuntime = require('react');
  const { View: NativeView } = require('react-native');
  return {
    ...actual,
    Screen: ({
      children,
      footer,
      scrollRef,
    }: {
      children: React.ReactNode;
      footer?: React.ReactNode;
      scrollRef?: {
        current: { scrollTo: (options: unknown) => void } | null;
      };
    }) => {
      ReactRuntime.useEffect(() => {
        if (!scrollRef) return undefined;
        scrollRef.current = { scrollTo: mockScrollTo };
        return () => {
          scrollRef.current = null;
        };
      }, [scrollRef]);
      return ReactRuntime.createElement(NativeView, null, children, footer);
    },
  };
});
jest.mock('../../composition/appModules', () => ({
  appModules: {
    alerts: {
      get: jest.fn().mockResolvedValue({
        ok: true,
        value: {
          id: 'record-1',
          title: '',
          info: '',
          authorAlias: '',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        warnings: [],
      }),
      media: jest.fn().mockResolvedValue({ ok: true, value: [], warnings: [] }),
      update: (...args: unknown[]) => mockAlertUpdate(...args),
      remove: jest.fn(),
    },
    catalog: {
      get: jest.fn().mockResolvedValue({
        ok: true,
        value: {
          source: 'campus-cats',
          id: 'record-1',
          cat: {
            name: '',
            descShort: '',
            descLong: '',
            colorPattern: '',
            behavior: '',
            yearsRecorded: '',
            AoR: '',
            currentStatus: 'Unknown',
            furLength: 'Unknown',
            furPattern: '',
            tnr: 'Unknown',
            sex: 'Unknown',
          },
          credits: '',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        warnings: [],
      }),
      media: jest.fn().mockResolvedValue({ ok: true, value: [], warnings: [] }),
      update: (...args: unknown[]) => mockCatalogUpdate(...args),
      remove: jest.fn(),
    },
    catalogTags: {
      list: jest.fn().mockResolvedValue({ ok: true, value: [], warnings: [] }),
      assignments: jest.fn().mockResolvedValue({ ok: true, value: [], warnings: [] }),
      assign: jest.fn(),
    },
    inaturalist: { updateCatalog: jest.fn(), setVisibility: jest.fn() },
    sightings: {
      get: jest.fn().mockResolvedValue({
        ok: true,
        value: {
          source: 'campus-cats',
          id: 'record-1',
          name: '',
          info: '',
          fed: false,
          health: false,
          location: { latitude: 0, longitude: 0 },
          date: new Date('2026-01-01T00:00:00.000Z'),
          timeOfDay: '',
        },
        warnings: [],
      }),
      media: jest.fn().mockResolvedValue({ ok: true, value: [], warnings: [] }),
      update: (...args: unknown[]) => mockSightingUpdate(...args),
      remove: jest.fn(),
    },
    stations: {
      get: jest.fn().mockResolvedValue({
        ok: true,
        value: {
          id: 'record-1',
          name: '',
          location: { latitude: 0, longitude: 0 },
          lastStocked: new Date('2026-01-01T00:00:00.000Z'),
          stockingFreq: 0,
          knownCats: '',
        },
        warnings: [],
      }),
      media: jest.fn().mockResolvedValue({ ok: true, value: [], warnings: [] }),
      update: (...args: unknown[]) => mockStationUpdate(...args),
      remove: jest.fn(),
    },
    imageSelection: {
      takePhoto: jest.fn(),
      pickFromLibrary: jest.fn(),
    },
  },
}));
jest.mock('../../presentation/providers', () => ({
  useAuth: () => ({
    user: { id: 'officer-1', email: 'officer@gatech.edu', role: 1 },
  }),
}));
jest.mock('../../presentation/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'officer-1', email: 'officer@gatech.edu', role: 1 },
  }),
}));

const renderThemed = async (content: React.ReactElement) =>
  await render(
    <AppThemeProvider colorScheme="light">{content}</AppThemeProvider>,
  );

const layout = (y: number) => ({
  nativeEvent: { layout: { x: 0, y, width: 320, height: 48 } },
});

describe('edit form validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks missing catalog fields, scrolls to the first one, and shows guidance', async () => {
    const user = userEvent.setup();
    await renderThemed(<EditCatalogEntry />);
    expect(await screen.findByRole('button', { name: 'Save Entry' })).toBeEnabled();
    expect(screen.getByTestId('form-action-bar-tint')).toHaveStyle({
      backgroundColor: '#E2E8EF38',
    });

    await fireEvent(screen.getByTestId('form-screen-content'), 'layout', layout(100));
    await fireEvent(screen.getByTestId('catalog-section-basics'), 'layout', layout(200));
    await fireEvent(screen.getByTestId('catalog-field-name'), 'layout', layout(30));
    await user.press(screen.getByRole('button', { name: 'Save Entry' }));

    expect(await screen.findByText('Cat name is required.')).toBeOnTheScreen();
    expect(screen.getByText('Short description is required.')).toBeOnTheScreen();
    expect(screen.getByText('Long description is required.')).toBeOnTheScreen();
    expect(screen.getByText('Detailed color pattern is required.')).toBeOnTheScreen();
    expect(screen.getByText('Years recorded is required.')).toBeOnTheScreen();
    expect(screen.getByText('Area of residence is required.')).toBeOnTheScreen();
    expect(screen.getByText('Fur pattern is required.')).toBeOnTheScreen();
    expect(screen.getByText('At least one profile photo is required.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cat name')).toHaveStyle({ borderColor: '#B23A3A' });
    expect(screen.getByRole('button', { name: 'Add photos' })).toHaveStyle({
      borderColor: '#B23A3A',
      borderWidth: 2,
      borderRadius: 999,
    });
    expect(screen.getByRole('alert', {
      name: 'Please fill in the missing information.',
    })).toBeOnTheScreen();
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 318, animated: true });
    expect(mockCatalogUpdate).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Cat name'), 'Mimi');
    await waitFor(() =>
      expect(screen.queryByText('Cat name is required.')).not.toBeOnTheScreen(),
    );
  });

  it('uses the shared inline validation behavior for alerts', async () => {
    const user = userEvent.setup();
    await renderThemed(<EditAlert />);
    expect(
      await screen.findByRole('button', { name: 'Save Alert' }),
    ).toBeEnabled();

    await fireEvent(screen.getByTestId('form-screen-content'), 'layout', layout(100));
    await fireEvent(screen.getByTestId('alert-section-basics'), 'layout', layout(200));
    await fireEvent(screen.getByTestId('alert-field-title'), 'layout', layout(30));
    await user.press(screen.getByRole('button', { name: 'Save Alert' }));

    expect(
      await screen.findByText('Alert title is required.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Alert description is required.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Title')).toHaveStyle({
      borderColor: '#B23A3A',
    });
    expect(
      screen.getByRole('alert', {
        name: 'Please fill in the missing information.',
      }),
    ).toBeOnTheScreen();
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 318, animated: true });
    expect(mockAlertUpdate).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Title'), 'Cat care day');
    await waitFor(() =>
      expect(
        screen.queryByText('Alert title is required.'),
      ).not.toBeOnTheScreen(),
    );
  });

  it('uses the shared inline validation behavior for sightings', async () => {
    const user = userEvent.setup();
    await renderThemed(<EditSighting />);
    expect(await screen.findByRole('button', { name: 'Save Report' })).toBeEnabled();

    await fireEvent(screen.getByTestId('form-screen-content'), 'layout', layout(100));
    await fireEvent(screen.getByTestId('sighting-section-basics'), 'layout', layout(200));
    await fireEvent(screen.getByTestId('sighting-field-name'), 'layout', layout(30));
    await user.press(screen.getByRole('button', { name: 'Save Report' }));

    expect(await screen.findByText('Cat name is required.')).toBeOnTheScreen();
    expect(screen.getByText('Time of sighting is required.')).toBeOnTheScreen();
    expect(screen.getByText('Sighting location is required.')).toBeOnTheScreen();
    expect(
      screen.getByText('At least one profile photo is required.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Cat name')).toHaveStyle({
      borderColor: '#B23A3A',
    });
    expect(
      screen.getByRole('alert', {
        name: 'Please fill in the missing information.',
      }),
    ).toBeOnTheScreen();
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 318, animated: true });
    expect(mockSightingUpdate).not.toHaveBeenCalled();
  });

  it('marks missing station fields, scrolls to the first one, and shows guidance', async () => {
    const user = userEvent.setup();
    await renderThemed(<EditStation />);
    expect(await screen.findByRole('button', { name: 'Save Station' })).toBeEnabled();

    await fireEvent(screen.getByTestId('form-screen-content'), 'layout', layout(100));
    await fireEvent(screen.getByTestId('station-section-basics'), 'layout', layout(200));
    await fireEvent(screen.getByTestId('station-field-name'), 'layout', layout(30));
    await user.press(screen.getByRole('button', { name: 'Save Station' }));

    expect(await screen.findByText('Station name is required.')).toBeOnTheScreen();
    expect(screen.getByText('Station location is required.')).toBeOnTheScreen();
    expect(screen.getByText('Restocking frequency is required.')).toBeOnTheScreen();
    expect(screen.getByText('At least one profile photo is required.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Station name')).toHaveStyle({ borderColor: '#B23A3A' });
    expect(screen.getByLabelText('Station location field')).toHaveStyle({
      borderColor: '#B23A3A',
      borderWidth: 2,
    });
    expect(screen.getByRole('button', { name: 'Add photos' })).toHaveStyle({
      borderColor: '#B23A3A',
      borderWidth: 2,
      borderRadius: 999,
    });
    expect(screen.getByRole('alert', {
      name: 'Please fill in the missing information.',
    })).toBeOnTheScreen();
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 318, animated: true });
    expect(mockStationUpdate).not.toHaveBeenCalled();
  });
});
