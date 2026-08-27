import React from 'react';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import ViewCatalogEntry, {
  sightingsForCatalogEntry,
} from '../../app/(app)/catalog/view-entry';
import ViewStation from '../../app/(app)/stations/view-station';
import {
  CatalogRecord,
  Role,
  SightingRecord,
  localSightingRecord,
  parseCatalogEntry,
  parsePublicProfile,
  parseSighting,
  parseStation,
  parseUser,
} from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockCatalogGet = jest.fn();
const mockCatalogMedia = jest.fn();
const mockSightingsList = jest.fn();
const mockCatalogFavoriteSummary = jest.fn();
const mockCatalogSetFavorite = jest.fn();
const mockStationGet = jest.fn();
const mockStationMedia = jest.fn();
const mockStationRestock = jest.fn();
const mockStationStatus = jest.fn();
const mockCommentsList = jest.fn();
const mockProfileGetOrSync = jest.fn();
let mockRouteId = 'catalog-1';
let mockRole: Role = Role.Officer;
const mockAuthUser = {
  id: 'admin-1',
  email: 'admin@gatech.edu',
  get role() {
    return mockRole;
  },
};

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
    useLocalSearchParams: () => ({ id: mockRouteId }),
    useRouter: () => ({ push: mockPush, back: mockBack }),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    catalog: {
      get: (...args: unknown[]) => mockCatalogGet(...args),
      media: (...args: unknown[]) => mockCatalogMedia(...args),
      favoriteSummary: (...args: unknown[]) => mockCatalogFavoriteSummary(...args),
      setFavorite: (...args: unknown[]) => mockCatalogSetFavorite(...args),
    },
    sightings: { list: (...args: unknown[]) => mockSightingsList(...args) },
    stations: {
      get: (...args: unknown[]) => mockStationGet(...args),
      media: (...args: unknown[]) => mockStationMedia(...args),
      restock: (...args: unknown[]) => mockStationRestock(...args),
      stockStatus: (...args: unknown[]) => mockStationStatus(...args),
    },
    comments: {
      list: (...args: unknown[]) => mockCommentsList(...args),
    },
    profiles: {
      getOrSync: (...args: unknown[]) => mockProfileGetOrSync(...args),
    },
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({ currentUser: mockAuthUser, user: mockAuthUser }),
}));

jest.mock('../../components/entries/CatalogEntryElement', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText, View: MockView } = require('react-native');
  return {
    CatalogEntryElement: ({
      entry,
      heartCount,
      sightings,
      onToggleFavorite,
      onSightingPress,
      contributorProfile,
      onContributorPress,
    }: {
      entry: { cat: { name: string } };
      heartCount: number;
      sightings: readonly { id: string; name: string }[];
      onToggleFavorite?: () => void;
      onSightingPress?: (sighting: { id: string; name: string }) => void;
      contributorProfile?: { displayName: string };
      onContributorPress?: () => void;
    }) => mockReact.createElement(
      MockView,
      null,
      mockReact.createElement(MockText, null, entry.cat.name),
      mockReact.createElement(MockText, null, `${heartCount} route hearts`),
      contributorProfile && onContributorPress
        ? mockReact.createElement(
            MockPressable,
            {
              accessibilityRole: 'button',
              accessibilityLabel: `View ${contributorProfile.displayName}'s profile`,
              onPress: onContributorPress,
            },
            mockReact.createElement(MockText, null, contributorProfile.displayName),
          )
        : null,
      onToggleFavorite
        ? mockReact.createElement(
            MockPressable,
            {
              accessibilityRole: 'button',
              accessibilityLabel: `Favorite ${entry.cat.name}`,
              onPress: onToggleFavorite,
            },
            mockReact.createElement(MockText, null, 'Favorite'),
          )
        : null,
      sightings[0] && onSightingPress
        ? mockReact.createElement(
            MockPressable,
            {
              accessibilityRole: 'button',
              accessibilityLabel: `View history sighting: ${sightings[0].name}`,
              onPress: () => onSightingPress(sightings[0]),
            },
            mockReact.createElement(MockText, null, sightings[0].name),
          )
        : null,
    ),
  };
});

jest.mock('../../components/entries/StationEntry', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText, View: MockView } = require('react-native');
  return {
    StationEntry: ({
      station,
      contributorProfile,
      onContributorPress,
    }: {
      station: { name: string };
      contributorProfile?: { displayName: string };
      onContributorPress?: () => void;
    }) => mockReact.createElement(
      MockView,
      null,
      mockReact.createElement(MockText, null, station.name),
      contributorProfile && onContributorPress
        ? mockReact.createElement(
            MockPressable,
            {
              accessibilityRole: 'button',
              accessibilityLabel: `View ${contributorProfile.displayName}'s profile`,
              onPress: onContributorPress,
            },
            mockReact.createElement(MockText, null, contributorProfile.displayName),
          )
        : null,
    ),
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const actor = parseUser({ id: 'admin-1', email: 'admin@gatech.edu', role: Role.Officer });
const contributorProfile = parsePublicProfile({
  id: actor.id,
  displayName: 'Campus Officer',
  bio: '',
  profilePhotoUrl: '',
  role: Role.Officer,
  achievementIds: [],
  selectedTitleId: '',
});
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
const catalogSighting = localSightingRecord(parseSighting({
  id: 'sighting-1',
  name: 'Goldie',
  info: 'Resting near Tech Tower.',
  fed: true,
  health: false,
  date: new Date('2026-08-01T12:00:00.000Z'),
  location: { latitude: 33.776, longitude: -84.396 },
  createdBy: actor,
  timeOfDay: 'Afternoon',
}));
const station = parseStation({
  id: 'station-1',
  name: 'Library station',
  location: { latitude: 33.776, longitude: -84.396 },
  lastStocked: new Date('2026-08-04T12:00:00.000Z'),
  stockingFreq: 7,
  knownCats: 'Goldie',
  createdBy: actor,
});

const renderThemed = async (content: React.ReactElement) =>
  await render(<AppThemeProvider colorScheme="light">{content}</AppThemeProvider>);

describe('catalog detail route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Officer;
    mockRouteId = 'catalog-1';
    mockCatalogGet.mockResolvedValue({ ok: true, value: catalogEntry, warnings: [] });
    mockCatalogMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockSightingsList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockCatalogFavoriteSummary.mockResolvedValue({
      ok: true,
      value: { counts: { 'catalog-1': 2 } },
      warnings: [],
    });
    mockCatalogSetFavorite.mockResolvedValue({ ok: true, value: {}, warnings: [] });
    mockCommentsList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockProfileGetOrSync.mockResolvedValue({
      ok: true,
      value: contributorProfile,
      warnings: [],
    });
  });

  it('renders catalog chrome and detail geometry while data loads', async () => {
    mockCatalogGet.mockImplementation(() => new Promise(() => undefined));
    await renderThemed(<ViewCatalogEntry />);

    expect(screen.getByText('Cat profile')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading cat profile' }),
    ).toBeOnTheScreen();
  });

  it('loads by ID and exposes editing only to administrators', async () => {
    const user = userEvent.setup();
    await renderThemed(<ViewCatalogEntry />);

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Edit catalog entry' }));
    expect(mockCatalogGet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'admin-1' }),
      'catalog-1',
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/catalog/edit-entry',
      params: { id: 'catalog-1' },
    });
    expect(mockCommentsList).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'admin-1' }),
      { kind: 'catalog', id: 'catalog-1' },
    );
  });

  it('renders errors in place', async () => {
    mockCatalogGet.mockResolvedValue({
      ok: false,
      error: { code: 'not_found', message: 'Catalog entry not found' },
    });
    await renderThemed(<ViewCatalogEntry />);

    expect(await screen.findByText('Catalog entry not found')).toBeOnTheScreen();
  });

  it('does not offer catalog editing to members', async () => {
    mockRole = Role.Member;
    await renderThemed(<ViewCatalogEntry />);

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Edit catalog entry' })).not.toBeOnTheScreen();
  });

  it('loads heart counts and persists the account favorite', async () => {
    const user = userEvent.setup();
    await renderThemed(<ViewCatalogEntry />);

    expect(await screen.findByText('2 route hearts')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Favorite Goldie' }));
    expect(mockCatalogSetFavorite).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'admin-1' }),
      'catalog-1',
    );
    expect(await screen.findByText('Goldie is now your favorite cat.')).toBeOnTheScreen();
  });

  it('links the catalog contributor to their member profile', async () => {
    const user = userEvent.setup();
    await renderThemed(<ViewCatalogEntry />);

    await user.press(await screen.findByRole('button', {
      name: "View Campus Officer's profile",
    }));

    expect(mockProfileGetOrSync).toHaveBeenCalledWith('admin-1');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/profile/view-profile',
      params: { id: 'admin-1' },
    });
  });

  it('opens a sighting selected from the catalog history map', async () => {
    mockSightingsList.mockResolvedValue({
      ok: true,
      value: [catalogSighting],
      warnings: [],
    });
    const user = userEvent.setup();
    await renderThemed(<ViewCatalogEntry />);

    await user.press(await screen.findByRole('button', {
      name: 'View history sighting: Goldie',
    }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/sighting/view-sighting',
      params: { id: 'sighting-1' },
    });
  });

  it('keeps local sightings in a linked imported catalog profile', async () => {
    const linkedEntry: CatalogRecord = {
      source: 'inaturalist',
      id: 'inat-guide-2001',
      sourceId: 2001,
      cat: catalogEntry.cat,
      credits: catalogEntry.credits,
      sourceUrl: 'https://www.inaturalist.org/guide_taxa/2001',
      sourceUpdatedAt: new Date('2026-08-01T12:00:00.000Z'),
      linkedLocalCatalogId: catalogEntry.id,
      matchStatus: 'linked',
      sourceActive: true,
      visible: true,
      moderation: { hidden: false, reason: '' },
    };
    const localSighting = (id: string, name: string) =>
      localSightingRecord(parseSighting({
        id,
        name,
        info: '',
        fed: false,
        health: true,
        date: new Date('2026-08-01T12:00:00.000Z'),
        location: station.location,
        createdBy: actor,
        timeOfDay: 'Afternoon',
      }));
    const sightings: readonly SightingRecord[] = [
      localSighting('local-sighting', 'Goldie'),
      {
        source: 'inaturalist',
        id: 'inat-observation-1',
        sourceId: 1,
        name: 'Goldie',
        info: '',
        date: new Date('2026-08-02T12:00:00.000Z'),
        observedOn: '2026-08-02',
        observedTimePrecision: 'date',
        location: station.location,
        qualityGrade: 'casual',
        observer: { id: 1, login: 'observer' },
        sourceUrl: 'https://www.inaturalist.org/observations/1',
        guideTaxonId: 2001,
        positionalAccuracy: null,
        sourceActive: true,
        visible: true,
      },
      localSighting('other-sighting', 'Mimi'),
    ];

    expect(
      sightingsForCatalogEntry(linkedEntry, sightings).map(({ id }) => id),
    ).toEqual(['local-sighting', 'inat-observation-1']);
  });
});

describe('station detail route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Officer;
    mockRouteId = 'station-1';
    mockStationGet.mockResolvedValue({ ok: true, value: station, warnings: [] });
    mockStationMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockStationRestock.mockResolvedValue({ ok: true, value: station, warnings: [] });
    mockStationStatus.mockReturnValue({ isStocked: true, daysRemaining: 7 });
    mockCommentsList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockProfileGetOrSync.mockResolvedValue({
      ok: true,
      value: contributorProfile,
      warnings: [],
    });
  });

  it('renders station chrome and detail geometry while data loads', async () => {
    mockStationGet.mockImplementation(() => new Promise(() => undefined));
    await renderThemed(<ViewStation />);

    expect(screen.getByText('Station details')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading feeding station' }),
    ).toBeOnTheScreen();
  });

  it('protects restocking while busy and keeps edit navigation by ID', async () => {
    let finish: ((value: unknown) => void) | undefined;
    mockStationRestock.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    await renderThemed(<ViewStation />);

    expect(await screen.findByText('Library station')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Mark station restocked' }));
    expect(screen.getByRole('button', { name: 'Mark station restocked' })).toBeDisabled();
    expect(screen.getByText('Restocking…')).toBeOnTheScreen();
    finish?.({ ok: true, value: station, warnings: [] });
    await waitFor(() => expect(mockStationRestock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Edit station' })).toBeEnabled(),
    );

    await user.press(screen.getByRole('button', { name: 'Edit station' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/stations/edit-station',
      params: { id: 'station-1' },
    });
    expect(mockCommentsList).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'admin-1' }),
      { kind: 'station', id: 'station-1' },
    );
  });

  it('denies direct member access to station operations', async () => {
    mockRole = Role.Member;
    await renderThemed(<ViewStation />);

    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(mockStationGet).not.toHaveBeenCalled();
  });

  it('links the station contributor to their member profile', async () => {
    const user = userEvent.setup();
    await renderThemed(<ViewStation />);

    await user.press(await screen.findByRole('button', {
      name: "View Campus Officer's profile",
    }));

    expect(mockProfileGetOrSync).toHaveBeenCalledWith('admin-1');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/profile/view-profile',
      params: { id: 'admin-1' },
    });
  });

  it('renders station load errors in place', async () => {
    mockStationGet.mockResolvedValue({
      ok: false,
      error: { code: 'not_found', message: 'Feeding station not found' },
    });
    await renderThemed(<ViewStation />);

    expect(await screen.findByText('Feeding station not found')).toBeOnTheScreen();
  });
});
