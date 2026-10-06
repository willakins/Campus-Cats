import React from 'react';

import {
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../../app/(app)/(tabs)/index';
import {
  InaturalistSightingRecord,
  Role,
  parseSighting,
  parseUser,
} from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockList = jest.fn();
const mockPush = jest.fn();
const mockSightingMapProps = jest.fn();

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    sightingMap: { page: (...args: unknown[]) => mockList(...args) },
  },
}));

jest.mock('../../presentation/screens/map/components/SightingMapView', () => {
  const mockReact = require('react');
  const {
    Pressable: MockPressable,
    Text: MockText,
    View: MockView,
  } = require('react-native');
  return {
    SightingMapView: ({
      list,
      onPerMarkerPress,
      ...props
    }: {
      list: readonly { id: string; name: string }[];
      onPerMarkerPress: (item: { id: string; name: string }) => void;
      [key: string]: unknown;
    }) => {
      mockSightingMapProps({ list, ...props });
      return mockReact.createElement(
        MockView,
        { testID: 'sighting-map' },
        list.map((item) =>
          mockReact.createElement(
            MockPressable,
            {
              key: item.id,
              accessibilityRole: 'button',
              accessibilityLabel: `View sighting: ${item.name}`,
              onPress: () => onPerMarkerPress(item),
            },
            mockReact.createElement(MockText, null, item.name),
          ),
        ),
      );
    },
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-glass-effect', () => ({
  GlassView: require('react-native').View,
  isGlassEffectAPIAvailable: () => false,
  isLiquidGlassAvailable: () => false,
}));
jest.mock('expo-blur', () => ({
  BlurView: require('react-native').View,
}));

const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const recent = parseSighting({
  id: 'sighting-1',
  name: 'Goldie',
  info: 'Near the library',
  fed: true,
  health: true,
  date: new Date(),
  location: { latitude: 33.776, longitude: -84.396 },
  createdBy: member,
  timeOfDay: 'Afternoon',
});
const old = parseSighting({
  ...recent,
  id: 'sighting-2',
  name: 'Einstein',
  date: new Date('2020-01-01T12:00:00.000Z'),
});
const imported: InaturalistSightingRecord = {
  source: 'inaturalist',
  id: 'inat-observation-1001',
  sourceId: 1001,
  name: 'Mimi',
  info: '',
  date: new Date(),
  observedOn: '2026-08-04',
  observedTimePrecision: 'date',
  location: { latitude: 33.775, longitude: -84.397 },
  qualityGrade: 'casual',
  observer: { id: 42, login: 'observer' },
  sourceUrl: 'https://www.inaturalist.org/observations/1001',
  positionalAccuracy: null,
  sourceActive: true,
  visible: true,
};
const importedWithoutCoordinates: InaturalistSightingRecord = {
  ...imported,
  id: 'inat-observation-1002',
  sourceId: 1002,
  name: 'Private location',
  sourceUrl: 'https://www.inaturalist.org/observations/1002',
  location: null,
};

const renderMap = async () =>
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <AppThemeProvider colorScheme="dark">
        <HomeScreen />
      </AppThemeProvider>
    </SafeAreaProvider>,
  );

describe('sightings map route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a result count, filters markers, and navigates by ID', async () => {
    mockList.mockResolvedValue({
      ok: true,
      value: { sightings: [recent, old] },
      warnings: [],
    });
    const user = userEvent.setup();
    await renderMap();

    expect(
      await screen.findByText('2 sightings loaded in this area'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('sighting-age-glass-bar')).toHaveStyle({
      alignSelf: 'stretch',
    });
    expect(screen.getByLabelText('Sighting age')).toHaveStyle({
      justifyContent: 'center',
    });
    mockList.mockResolvedValue({
      ok: true,
      value: { sightings: [recent] },
      warnings: [],
    });
    await user.press(screen.getByRole('button', { name: '7D' }));
    expect(
      await screen.findByText('1 sighting loaded in this area'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Einstein')).not.toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'View sighting: Goldie' }),
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/map/sightings/[id]',
      params: { id: 'sighting-1' },
    });
  });

  it('keeps reporting available and anchors module errors over the map', async () => {
    mockList.mockResolvedValue({
      ok: false,
      error: {
        code: 'dependency_failure',
        message: 'Could not load sightings',
      },
    });
    const user = userEvent.setup();
    await renderMap();

    expect(
      await screen.findByRole('alert', { name: 'Could not load sightings' }),
    ).toBeOnTheScreen();
    const reportButton = screen.getByRole('button', {
      name: 'Report a sighting',
    });
    expect(screen.queryByText('Report a sighting')).not.toBeOnTheScreen();
    expect(reportButton).toHaveStyle({
      width: 56,
      height: 56,
      backgroundColor: '#FF8F85',
      borderColor: '#FF8F85',
    });
    await user.press(reportButton);
    expect(mockPush).toHaveBeenCalledWith('/map/sightings/new');
  });

  it('shows imported markers by stable ID and omits non-public coordinates', async () => {
    mockList.mockResolvedValue({
      ok: true,
      value: { sightings: [recent, imported, importedWithoutCoordinates] },
      warnings: [],
    });
    const user = userEvent.setup();
    await renderMap();

    expect(
      await screen.findByText('2 sightings loaded in this area'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Private location')).not.toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'View sighting: Mimi' }),
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/map/sightings/[id]',
      params: { id: 'inat-observation-1001' },
    });
  });

  it('shows loading status without removing the map geometry', async () => {
    mockList.mockImplementation(() => new Promise(() => undefined));
    await renderMap();

    expect(screen.getByTestId('sighting-map')).toBeOnTheScreen();
    expect(screen.getByText('Loading sightings')).toBeOnTheScreen();
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
  });

  it('ignores an old query response after the age filter changes', async () => {
    let completeOld!: (value: unknown) => void;
    mockList.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeOld = resolve;
        }),
    );
    await renderMap();
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
    mockList.mockResolvedValue({
      ok: true,
      value: { sightings: [recent] },
      warnings: [],
    });
    await userEvent.setup().press(screen.getByRole('button', { name: '7D' }));
    await screen.findByText('1 sighting loaded in this area');
    completeOld({
      ok: true,
      value: { sightings: [recent, old] },
      warnings: [],
    });
    await waitFor(() =>
      expect(screen.queryByText('Einstein')).not.toBeOnTheScreen(),
    );
  });

  it('starts at a campus-level view centered on Georgia Tech', async () => {
    mockList.mockResolvedValue({
      ok: true,
      value: { sightings: [] },
      warnings: [],
    });
    await renderMap();

    expect(mockSightingMapProps).toHaveBeenCalledWith(
      expect.objectContaining({
        initialViewport: {
          center: { latitude: 33.776077, longitude: -84.396199 },
          zoom: 14,
        },
      }),
    );
  });
});
