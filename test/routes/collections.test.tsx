import React from 'react';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import Catalog from '../../app/(app)/(tabs)/catalog';
import Stations from '../../app/(app)/(tabs)/stations';
import { Role, parseCatalogEntry, parseStation, parseUser } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockCatalogList = jest.fn();
const mockStationsList = jest.fn();
const mockStockStatus = jest.fn();
const mockPush = jest.fn();
let mockRole: Role = Role.Admin;

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
    catalog: { list: (...args: unknown[]) => mockCatalogList(...args) },
    stations: {
      list: (...args: unknown[]) => mockStationsList(...args),
      stockStatus: (...args: unknown[]) => mockStockStatus(...args),
    },
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'actor-1', email: 'actor@gatech.edu', role: mockRole },
  }),
}));

jest.mock('../../components/items/CatalogItem', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    CatalogItem: ({ cat }: { cat: { name: string } }) =>
      mockReact.createElement(MockText, null, cat.name),
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

const actor = parseUser({ id: 'admin-1', email: 'admin@gatech.edu', role: Role.Admin });
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
});

const renderRoute = (route: React.ReactElement) =>
  render(<AppThemeProvider colorScheme="light">{route}</AppThemeProvider>);

describe('catalog collection route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Admin;
  });

  it('renders loading, empty, success, and authorized creation states', async () => {
    let finish: ((value: unknown) => void) | undefined;
    mockCatalogList.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    renderRoute(<Catalog />);

    expect(screen.getByRole('progressbar', { name: 'Loading cat cards' })).toBeOnTheScreen();
    finish?.({ ok: true, value: [], warnings: [] });
    expect(await screen.findByText('No cats yet')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Create catalog entry' }));
    expect(mockPush).toHaveBeenCalledWith('/catalog/create-entry');
  });

  it('renders catalog results and module errors', async () => {
    mockCatalogList.mockResolvedValue({ ok: true, value: [catalogEntry], warnings: [] });
    const { unmount } = renderRoute(<Catalog />);
    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    unmount();

    mockCatalogList.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Could not load the catalog' },
    });
    renderRoute(<Catalog />);
    expect(await screen.findByText('Could not load the catalog')).toBeOnTheScreen();
  });

  it('hides catalog creation from members', async () => {
    mockRole = Role.Member;
    mockCatalogList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    renderRoute(<Catalog />);

    expect(await screen.findByText('No cats yet')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Create catalog entry' })).not.toBeOnTheScreen();
  });
});

describe('station collection route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Admin;
    mockStationsList.mockResolvedValue({ ok: true, value: [stocked, unstocked], warnings: [] });
    mockStockStatus.mockImplementation((station: { id: string }) => ({
      isStocked: station.id === 'station-1',
      nextDueAt: new Date('2026-08-11T12:00:00.000Z'),
    }));
  });

  it('filters stations through the labeled segmented control', async () => {
    const user = userEvent.setup();
    renderRoute(<Stations />);

    expect(await screen.findByText('Library station')).toBeOnTheScreen();
    expect(screen.getByText('Tech Green station')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Unstocked' }));
    expect(screen.queryByText('Library station')).not.toBeOnTheScreen();
    expect(screen.getByText('Tech Green station')).toBeOnTheScreen();
  });

  it('shows a useful access-denied state to members', async () => {
    mockRole = Role.Member;
    renderRoute(<Stations />);

    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(mockStationsList).not.toHaveBeenCalled();
  });

  it('renders station errors without losing the create action', async () => {
    mockStationsList.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Could not load stations' },
    });
    renderRoute(<Stations />);

    expect(await screen.findByText('Could not load stations')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Create station' })).toBeOnTheScreen();
  });
});
