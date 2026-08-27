import React from 'react';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import Catalog from '../../app/(app)/(tabs)/catalog';
import Stations from '../../app/(app)/(tabs)/stations';
import {
  Role,
  parseCatalogEntry,
  parseCatalogTag,
  parseStation,
  parseUser,
} from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockCatalogList = jest.fn();
const mockSightingsList = jest.fn();
const mockCatalogFavoriteSummary = jest.fn();
const mockCatalogSetFavorite = jest.fn();
const mockCatalogTagsList = jest.fn();
const mockCatalogTagAssignments = jest.fn();
const mockStationsList = jest.fn();
const mockStockStatus = jest.fn();
const mockPush = jest.fn();
let mockRole: Role = Role.Officer;
const mockAuthUser = {
  id: 'actor-1',
  email: 'actor@gatech.edu',
  get role() {
    return mockRole;
  },
};
let mockCurrentAuthUser: typeof mockAuthUser = mockAuthUser;

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
    catalog: {
      list: (...args: unknown[]) => mockCatalogList(...args),
      favoriteSummary: (...args: unknown[]) => mockCatalogFavoriteSummary(...args),
      setFavorite: (...args: unknown[]) => mockCatalogSetFavorite(...args),
    },
    catalogTags: {
      list: (...args: unknown[]) => mockCatalogTagsList(...args),
      assignments: (...args: unknown[]) => mockCatalogTagAssignments(...args),
    },
    sightings: { list: (...args: unknown[]) => mockSightingsList(...args) },
    stations: {
      list: (...args: unknown[]) => mockStationsList(...args),
      stockStatus: (...args: unknown[]) => mockStockStatus(...args),
    },
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({ currentUser: mockCurrentAuthUser, user: mockAuthUser }),
}));

jest.mock('../../components/items/CatalogItem', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText, View: MockView } = require('react-native');
  return {
    CatalogItem: ({
      cat,
      heartCount,
      onToggleFavorite,
    }: {
      cat: { name: string };
      heartCount: number;
      onToggleFavorite: () => void;
    }) => mockReact.createElement(
      MockView,
      null,
      mockReact.createElement(MockText, null, cat.name),
      mockReact.createElement(MockText, null, `${heartCount} route hearts`),
      mockReact.createElement(
        MockPressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: `Favorite ${cat.name}`,
          onPress: onToggleFavorite,
        },
        mockReact.createElement(MockText, null, 'Favorite'),
      ),
    ),
  };
});

jest.mock('../../components/items/StationItem', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    StationItem: ({ station }: { station: { name: string } }) =>
      mockReact.createElement(MockText, null, station.name),
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const actor = parseUser({ id: 'admin-1', email: 'admin@gatech.edu', role: Role.Officer });
const catalogEntry = parseCatalogEntry({
  id: 'catalog-1',
  cat: {
    name: 'Goldie',
    descShort: 'A friendly orange cat.',
    descLong: 'Often naps near the library.',
    colorPattern: 'Orange tabby',
    behavior: 'Friendly',
    yearsRecorded: '2022–present',
    AoR: 'Library',
    currentStatus: 'Feral',
    furLength: 'Short',
    furPattern: 'Tabby',
    tnr: 'Yes',
    sex: 'Female',
  },
  credits: 'Campus Cats volunteers',
  createdAt: new Date('2026-06-01T12:00:00.000Z'),
  createdBy: actor,
});
const secondCatalogEntry = parseCatalogEntry({
  ...catalogEntry,
  id: 'catalog-2',
  cat: {
    ...catalogEntry.cat,
    name: 'Mimi',
    descShort: 'A cautious black-and-white cat.',
    descLong: 'Often seen around Tech Green.',
    AoR: 'Tech Green',
    currentStatus: 'Adopted',
    furLength: 'Long',
    tnr: 'No',
    sex: 'Male',
  },
});
const configuredCatalogTags = [
  parseCatalogTag({ id: 'adopted', label: 'Rehomed' }),
  parseCatalogTag({ id: 'feral', label: 'Feral' }),
  parseCatalogTag({ id: 'tnr-complete', label: 'TNR complete' }),
  parseCatalogTag({ id: 'needs-tnr', label: 'Needs TNR' }),
  parseCatalogTag({ id: 'female', label: 'Female' }),
  parseCatalogTag({ id: 'male', label: 'Male' }),
  parseCatalogTag({ id: 'short-hair', label: 'Short hair' }),
  parseCatalogTag({ id: 'long-hair', label: 'Long hair' }),
  parseCatalogTag({ id: 'medical', label: 'Needs medication' }),
];
const stocked = parseStation({
  id: 'station-1',
  name: 'Library station',
  location: { latitude: 33.776, longitude: -84.396 },
  lastStocked: new Date('2026-08-04T12:00:00.000Z'),
  stockingFreq: 7,
  knownCats: 'Goldie',
  createdBy: actor,
});
const unstocked = parseStation({
  ...stocked,
  id: 'station-2',
  name: 'Tech Green station',
  knownCats: 'Mimi',
});

const renderRoute = async (route: React.ReactElement) =>
  await render(<AppThemeProvider colorScheme="light">{route}</AppThemeProvider>);

describe('catalog collection route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Officer;
    mockCurrentAuthUser = mockAuthUser;
    mockSightingsList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockCatalogFavoriteSummary.mockResolvedValue({
      ok: true,
      value: { counts: {} },
      warnings: [],
    });
    mockCatalogSetFavorite.mockResolvedValue({ ok: true, value: {}, warnings: [] });
    mockCatalogTagsList.mockResolvedValue({
      ok: true,
      value: configuredCatalogTags,
      warnings: [],
    });
    mockCatalogTagAssignments.mockResolvedValue({
      ok: true,
      value: [
        {
          catalogId: 'catalog-2',
          tagIds: ['adopted', 'medical'],
        },
      ],
      warnings: [],
    });
  });

  it('renders loading, empty, success, and authorized creation states', async () => {
    let finish: ((value: unknown) => void) | undefined;
    mockCatalogList.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    await renderRoute(<Catalog />);

    expect(screen.getByText('Cat catalog')).toBeOnTheScreen();
    expect(screen.queryByText('Catalog access')).not.toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Loading cat cards' })).toBeOnTheScreen();
    finish?.({ ok: true, value: [], warnings: [] });
    expect(await screen.findByText('No cats yet')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Create catalog entry' }));
    expect(mockPush).toHaveBeenCalledWith('/catalog/create-entry');
  });

  it('renders catalog results and module errors', async () => {
    mockCatalogList.mockResolvedValue({ ok: true, value: [catalogEntry], warnings: [] });
    const { unmount } = await renderRoute(<Catalog />);
    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    await unmount();

    mockCatalogList.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Could not load the catalog' },
    });
    await renderRoute(<Catalog />);
    expect(await screen.findByText('Could not load the catalog')).toBeOnTheScreen();
  });

  it('hides catalog creation from members', async () => {
    mockRole = Role.Member;
    mockCatalogList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    await renderRoute(<Catalog />);

    expect(await screen.findByText('No cats yet')).toBeOnTheScreen();
    expect(screen.queryByText('Catalog access')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Create catalog entry' })).not.toBeOnTheScreen();
  });

  it('filters catalog profiles and moves the account favorite', async () => {
    mockCatalogList.mockResolvedValue({
      ok: true,
      value: [secondCatalogEntry, catalogEntry],
      warnings: [],
    });
    mockCatalogFavoriteSummary.mockResolvedValue({
      ok: true,
      value: { counts: { 'catalog-1': 2 } },
      warnings: [],
    });
    const user = userEvent.setup();
    await renderRoute(<Catalog />);

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    expect(screen.getByText('Mimi')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Search cat profiles'), 'library');
    expect(screen.getByText('Goldie')).toBeOnTheScreen();
    expect(screen.queryByText('Mimi')).not.toBeOnTheScreen();
    expect(screen.getByText('2 route hearts')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Clear catalog search' }));
    await user.press(screen.getByRole('button', { name: 'Filter catalog' }));
    await user.press(screen.getByRole('button', { name: 'Rehomed' }));
    await user.press(screen.getByRole('button', { name: 'Show cats' }));
    expect(screen.queryByText('Goldie')).not.toBeOnTheScreen();
    expect(screen.getByText('Mimi')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Filter catalog. 1 selected' }));
    await user.press(screen.getByRole('button', { name: 'Needs medication' }));
    await user.press(screen.getByRole('button', { name: 'Rehomed' }));
    await user.press(screen.getByRole('button', { name: 'Show cats' }));
    expect(screen.getByText('Mimi')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Filter catalog. 1 selected' }));
    await user.press(screen.getByRole('button', { name: 'Clear filters' }));
    await user.press(screen.getByRole('button', { name: 'Show cats' }));
    expect(screen.getByText('Goldie')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Favorite Goldie' }));
    expect(mockCatalogSetFavorite).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'actor-1' }),
      'catalog-1',
    );
    expect(await screen.findByText('Goldie is now your favorite cat.')).toBeOnTheScreen();
  });

  it('loads once when auth emits equivalent user objects', async () => {
    mockCatalogList.mockResolvedValue({ ok: true, value: [], warnings: [] });

    const rendered = await renderRoute(<Catalog />);
    expect(await screen.findByText('No cats yet')).toBeOnTheScreen();
    for (let index = 0; index < 5; index += 1) {
      mockCurrentAuthUser = { ...mockAuthUser };
      await rendered.rerender(
        <AppThemeProvider colorScheme="light">
          <Catalog />
        </AppThemeProvider>,
      );
    }

    expect(mockCatalogList).toHaveBeenCalledTimes(1);
  });
});

describe('station collection route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Officer;
    mockStationsList.mockResolvedValue({ ok: true, value: [stocked, unstocked], warnings: [] });
    mockStockStatus.mockImplementation((station: { id: string }) => ({
      isStocked: station.id === 'station-1',
      nextDueAt: new Date('2026-08-11T12:00:00.000Z'),
    }));
  });

  it('keeps filters and creation available while station data loads', async () => {
    mockStationsList.mockImplementation(() => new Promise(() => undefined));
    await renderRoute(<Stations />);

    expect(screen.getByText('Feeding stations')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Officer-only page')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Stocked' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Create station' })).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading feeding stations' }),
    ).toBeOnTheScreen();
  });

  it('expands and collapses the officer-only explanation from the header', async () => {
    const user = userEvent.setup();
    await renderRoute(<Stations />);

    await user.press(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    );
    expect(screen.getByText('Officer-only page')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Officer-level access is required to view or manage feeding-station operations.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Explain officer-only access' }),
    ).not.toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Hide officer-only explanation' }),
    );
    expect(screen.queryByText('Officer-only page')).not.toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    ).toBeOnTheScreen();
  });

  it('filters stations through the labeled segmented control', async () => {
    const user = userEvent.setup();
    await renderRoute(<Stations />);

    expect(await screen.findByText('Library station')).toBeOnTheScreen();
    expect(screen.getByText('Tech Green station')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Unstocked' }));
    expect(screen.queryByText('Library station')).not.toBeOnTheScreen();
    expect(screen.getByText('Tech Green station')).toBeOnTheScreen();
  });

  it('searches stations by station name or known cat', async () => {
    const user = userEvent.setup();
    await renderRoute(<Stations />);

    await screen.findByText('Library station');
    await user.type(screen.getByLabelText('Search feeding stations'), 'Goldie');
    expect(screen.getByText('Library station')).toBeOnTheScreen();
    expect(screen.queryByText('Tech Green station')).not.toBeOnTheScreen();
    expect(screen.getByText('1 station')).toBeOnTheScreen();
  });

  it('shows a useful access-denied state to members', async () => {
    mockRole = Role.Member;
    await renderRoute(<Stations />);

    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(mockStationsList).not.toHaveBeenCalled();
  });

  it('renders station errors without losing the create action', async () => {
    mockStationsList.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Could not load stations' },
    });
    await renderRoute(<Stations />);

    expect(await screen.findByText('Could not load stations')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Create station' })).toBeOnTheScreen();
  });
});
