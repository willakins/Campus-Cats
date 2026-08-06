import React from 'react';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import {
  Role,
  localCatalogRecord,
  parseAnnouncement,
  parseCatalogEntry,
  parseStation,
  parseUser,
} from '../../core/domain';
import { AppThemeProvider } from '../../theme';
import { AnnouncementItem } from './AnnouncementItem';
import { CatalogItem } from './CatalogItem';
import { StationItem } from './StationItem';

const mockPush = jest.fn();
const mockCatalogMedia = jest.fn();
const mockStationMedia = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../composition/appModules', () => ({
  appModules: {
    catalog: { media: (...args: unknown[]) => mockCatalogMedia(...args) },
    stations: { media: (...args: unknown[]) => mockStationMedia(...args) },
  },
}));

const actor = parseUser({ id: 'admin-1', email: 'admin@gatech.edu', role: Role.Officer });
const announcement = parseAnnouncement({
  id: 'announcement-1',
  title: 'Volunteer workday',
  info: 'Meet near the library at noon.',
  createdAt: new Date('2026-06-01T12:00:00.000Z'),
  createdBy: actor,
  authorAlias: 'Campus Cats Team',
});
const catalogEntry = localCatalogRecord(parseCatalogEntry({
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

describe('collection cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCatalogMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockStationMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
  });

  it('keeps announcement attribution visible and routes by ID', async () => {
    const user = userEvent.setup();
    await renderThemed(<AnnouncementItem {...announcement} />);

    expect(screen.getByText('By Campus Cats Team')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Read announcement: Volunteer workday' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/announcements/view-ann',
      params: { id: 'announcement-1' },
    });
  });

  it('provides a catalog photo fallback and routes by ID', async () => {
    const user = userEvent.setup();
    await renderThemed(<CatalogItem {...catalogEntry} />);

    expect(screen.getByText('No profile photo')).toBeOnTheScreen();
    await waitFor(() => expect(mockCatalogMedia).toHaveBeenCalledWith('catalog-1'));
    await user.press(screen.getByRole('button', { name: 'View cat: Goldie' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/catalog/view-entry',
      params: { id: 'catalog-1' },
    });
  });

  it('keeps favorite selection separate from profile navigation', async () => {
    const onToggleFavorite = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <CatalogItem
        {...catalogEntry}
        sightingCount={3}
        heartCount={2}
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
      />,
    );

    expect(screen.getByText('3 sightings')).toBeOnTheScreen();
    expect(screen.getByText('2 hearts')).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', {
        name: 'Choose Goldie as your favorite cat',
      }),
    );
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('pairs station status color with text and routes by ID', async () => {
    const user = userEvent.setup();
    await renderThemed(
      <StationItem
        station={station}
        status={{ isStocked: true, daysRemaining: 7 }}
      />,
    );

    expect(screen.getByText('Stocked')).toBeOnTheScreen();
    expect(screen.getByText('Known cats: Goldie')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'View station: Library station' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/stations/view-station',
      params: { id: 'station-1' },
    });
  });
});
