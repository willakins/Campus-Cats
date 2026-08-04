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
const mockStationGet = jest.fn();
const mockStationMedia = jest.fn();
const mockStationRestock = jest.fn();
const mockStationStatus = jest.fn();
let mockRouteId = 'catalog-1';
let mockRole: Role = Role.Admin;

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
    },
    sightings: { list: (...args: unknown[]) => mockSightingsList(...args) },
    stations: {
      get: (...args: unknown[]) => mockStationGet(...args),
      media: (...args: unknown[]) => mockStationMedia(...args),
      restock: (...args: unknown[]) => mockStationRestock(...args),
      stockStatus: (...args: unknown[]) => mockStationStatus(...args),
    },
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@gatech.edu', role: mockRole },
  }),
}));

jest.mock('../../components/entries/CatalogEntryElement', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    CatalogEntryElement: ({ entry }: { entry: { cat: { name: string } } }) =>
      mockReact.createElement(MockText, null, entry.cat.name),
  };
});

jest.mock('../../components/entries/StationEntry', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    StationEntry: ({ station }: { station: { name: string } }) =>
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
const station = parseStation({
  id: 'station-1',
  name: 'Library station',
  location: { latitude: 33.776, longitude: -84.396 },
  lastStocked: new Date('2026-08-04T12:00:00.000Z'),
  stockingFreq: 7,
  knownCats: 'Goldie',
  createdBy: actor,
});

const renderThemed = (content: React.ReactElement) =>
  render(<AppThemeProvider colorScheme="light">{content}</AppThemeProvider>);

describe('catalog detail route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Admin;
    mockRouteId = 'catalog-1';
    mockCatalogGet.mockResolvedValue({ ok: true, value: catalogEntry, warnings: [] });
    mockCatalogMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockSightingsList.mockResolvedValue({ ok: true, value: [], warnings: [] });
  });

  it('loads by ID and exposes editing only to administrators', async () => {
    const user = userEvent.setup();
    renderThemed(<ViewCatalogEntry />);

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Edit catalog entry' }));
    expect(mockCatalogGet).toHaveBeenCalledWith('catalog-1');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/catalog/edit-entry',
      params: { id: 'catalog-1' },
    });
  });

  it('renders errors in place', async () => {
    mockCatalogGet.mockResolvedValue({
      ok: false,
      error: { code: 'not_found', message: 'Catalog entry not found' },
    });
    renderThemed(<ViewCatalogEntry />);

    expect(await screen.findByText('Catalog entry not found')).toBeOnTheScreen();
  });

  it('does not offer catalog editing to members', async () => {
    mockRole = Role.Member;
    renderThemed(<ViewCatalogEntry />);

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Edit catalog entry' })).not.toBeOnTheScreen();
  });

  it('keeps local sightings in a linked imported catalog profile', () => {
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
    mockRole = Role.Admin;
    mockRouteId = 'station-1';
    mockStationGet.mockResolvedValue({ ok: true, value: station, warnings: [] });
    mockStationMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockStationRestock.mockResolvedValue({ ok: true, value: station, warnings: [] });
    mockStationStatus.mockReturnValue({ isStocked: true, daysRemaining: 7 });
  });

  it('protects restocking while busy and keeps edit navigation by ID', async () => {
    let finish: ((value: unknown) => void) | undefined;
    mockStationRestock.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    renderThemed(<ViewStation />);

    expect(await screen.findByText('Library station')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Mark station restocked' }));
    expect(screen.getByRole('button', { name: 'Mark station restocked' })).toBeDisabled();
    expect(screen.getByText('Restocking…')).toBeOnTheScreen();
    finish?.({ ok: true, value: station, warnings: [] });
    await waitFor(() => expect(mockStationRestock).toHaveBeenCalledTimes(1));

    await user.press(screen.getByRole('button', { name: 'Edit station' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/stations/edit-station',
      params: { id: 'station-1' },
    });
  });

  it('denies direct member access to station operations', () => {
    mockRole = Role.Member;
    renderThemed(<ViewStation />);

    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(mockStationGet).not.toHaveBeenCalled();
  });

  it('renders station load errors in place', async () => {
    mockStationGet.mockResolvedValue({
      ok: false,
      error: { code: 'not_found', message: 'Feeding station not found' },
    });
    renderThemed(<ViewStation />);

    expect(await screen.findByText('Feeding station not found')).toBeOnTheScreen();
  });
});
