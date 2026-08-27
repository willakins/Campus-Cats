import React from 'react';

import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import {
  Role,
  InaturalistCatalogRecord,
  InaturalistSightingRecord,
  localCatalogRecord,
  localSightingRecord,
  parseAnnouncement,
  parseCatalogEntry,
  parseSighting,
  parsePublicProfile,
  parseStation,
  parseUser,
} from '../../core/domain';
import { ExternalMediaAsset, mediaAssetId } from '../../core/ports';
import { AppThemeProvider } from '../../theme';
import { AnnouncementEntry } from './AnnouncementEntry';
import { CatalogEntryElement } from './CatalogEntryElement';
import { SightingEntry } from './SightingEntry';
import { StationEntry } from './StationEntry';

const mockMapMount = jest.fn();
const mockMapRender = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../ui/MapView', () => {
  const mockReact = require('react');
  const { View: MockView } = require('react-native');
  return {
    MapView: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      mockMapRender(props);
      mockReact.useEffect(() => {
        mockMapMount();
      }, []);
      return mockReact.createElement(MockView, null, children);
    },
  };
});
jest.mock('react-native-maps', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable, View: MockView } = require('react-native');
  return {
    Marker: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      mockReact.createElement(MockPressable, props, children),
    Polyline: (props: Record<string, unknown>) => mockReact.createElement(MockView, props),
  };
});

const actor = parseUser({ id: 'member-1', email: 'member@gatech.edu', role: Role.Member });
const sighting = localSightingRecord(parseSighting({
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
  lastStocked: new Date('2026-07-01T12:00:00.000Z'),
  stockingFreq: 7,
  knownCats: 'Goldie',
  createdBy: actor,
});
const announcement = parseAnnouncement({
  id: 'announcement-1',
  title: 'Volunteer workday',
  info: 'Meet near the library at noon.',
  createdAt: new Date('2026-06-01T12:00:00.000Z'),
  createdBy: actor,
  authorAlias: 'Campus Cats Team',
});
const importedSighting: InaturalistSightingRecord = {
  source: 'inaturalist',
  id: 'inat-observation-1001',
  sourceId: 1001,
  name: 'Goldie',
  info: 'Resting near Tech Tower.',
  date: new Date('2026-08-01T12:30:00.000Z'),
  observedOn: '2026-08-01',
  observedTimePrecision: 'exact',
  location: null,
  qualityGrade: 'needs_id',
  observer: { id: 42, login: 'cat_watcher', displayName: 'Cat Watcher' },
  sourceUrl: 'https://www.inaturalist.org/observations/1001',
  observationFieldValue: 'Goldie',
  guideTaxonId: 2001,
  positionalAccuracy: null,
  sourceActive: true,
  visible: true,
};
const importedCatalog: InaturalistCatalogRecord = {
  source: 'inaturalist',
  id: 'inat-guide-2001',
  sourceId: 2001,
  cat: { name: 'Goldie', descShort: 'A friendly orange cat.' },
  credits: 'iNaturalist Georgia Tech Cats guide',
  sourceUrl: 'https://www.inaturalist.org/guide_taxa/2001',
  sourceUpdatedAt: new Date('2026-08-01T12:00:00.000Z'),
  matchStatus: 'unlinked',
  sourceActive: true,
  visible: true,
  moderation: { hidden: false, reason: '' },
};
const licensedPhoto: ExternalMediaAsset = {
  kind: 'external',
  id: mediaAssetId('inat-photo-1'),
  url: 'https://static.inaturalist.org/photo.jpg',
  thumbnailUrl: 'https://static.inaturalist.org/photo-small.jpg',
  role: 'profile',
  sourceUrl: 'https://www.inaturalist.org/photos/1',
  attribution: 'Photo by Cat Watcher, CC BY 4.0',
  licenseCode: 'CC-BY',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
};

const renderThemed = async (content: React.ReactElement) =>
  await render(<AppThemeProvider colorScheme="light">{content}</AppThemeProvider>);

describe('detail entries', () => {
  it('pairs sighting statuses with labels and preserves contributor identity', async () => {
    await renderThemed(
      <SightingEntry
        sighting={sighting}
        media={[]}
        reporterProfile={parsePublicProfile({
          id: 'member-1',
          displayName: 'Cat Watcher',
          bio: '',
          profilePhotoUrl: '',
          role: Role.Member,
          achievementIds: ['first-sighting'],
          selectedTitleId: 'first-sighting',
        })}
      />,
    );

    expect(screen.getByText('Was fed')).toBeOnTheScreen();
    expect(screen.getByText('Health concern')).toBeOnTheScreen();
    expect(screen.getByText('Cat Watcher')).toBeOnTheScreen();
    expect(screen.getByText('cat lover')).toBeOnTheScreen();
  });

  it('reveals catalog field notes without hiding credits', async () => {
    const user = userEvent.setup();
    await renderThemed(<CatalogEntryElement entry={catalogEntry} media={[]} sightings={[sighting]} />);

    await user.press(screen.getByRole('button', { name: 'Show all field notes' }));
    expect(screen.getByText('Orange tabby')).toBeOnTheScreen();
    expect(screen.getByText('Campus Cats volunteers')).toBeOnTheScreen();
  });

  it('lets users walk backward through mapped sightings in chronological order', async () => {
    mockMapMount.mockClear();
    mockMapRender.mockClear();
    const onSightingPress = jest.fn();
    const user = userEvent.setup();
    const oldest = localSightingRecord(parseSighting({
      ...sighting,
      id: 'sighting-oldest',
      date: new Date('2026-07-30T12:00:00.000Z'),
      timeOfDay: 'Morning',
      location: { latitude: 33.774, longitude: -84.398 },
    }));
    const middle: InaturalistSightingRecord = {
      ...importedSighting,
      id: 'inat-observation-middle',
      sourceId: 1002,
      date: new Date('2026-07-31T18:45:00.000Z'),
      observedOn: '2026-07-31',
      location: { latitude: 33.775, longitude: -84.397 },
    };

    await renderThemed(
      <CatalogEntryElement
        entry={catalogEntry}
        media={[]}
        sightings={[sighting, oldest, middle]}
        onSightingPress={onSightingPress}
      />,
    );

    expect(screen.getByText('Sighting 3 of 3')).toBeOnTheScreen();
    expect(screen.getByText('Afternoon of August 1, 2026')).toBeOnTheScreen();
    expect(screen.getByText('Path through 3 mapped sightings')).toBeOnTheScreen();
    expect(mockMapMount).toHaveBeenCalledTimes(1);
    const initialViewport = mockMapRender.mock.calls.at(-1)?.[0].initialViewport;

    await user.press(screen.getByRole('button', {
      name: 'View Goldie sighting from Afternoon of August 1, 2026',
    }));
    expect(onSightingPress).toHaveBeenCalledWith(sighting);

    await fireEvent(
      screen.getByRole('adjustable', { name: 'Sighting timeline' }),
      'onAccessibilityAction',
      { nativeEvent: { actionName: 'decrement' } },
    );

    expect(screen.getByText('Sighting 2 of 3')).toBeOnTheScreen();
    expect(screen.getByText(/July 31, 2026/)).toBeOnTheScreen();
    expect(screen.getByText('Path through 2 mapped sightings')).toBeOnTheScreen();
    expect(mockMapMount).toHaveBeenCalledTimes(1);
    expect(mockMapRender.mock.calls.at(-1)?.[0].initialViewport).toBe(initialViewport);
  });

  it('shows a single mapped sighting without a meaningless timeline control', async () => {
    await renderThemed(
      <CatalogEntryElement
        entry={catalogEntry}
        media={[]}
        sightings={[sighting]}
      />,
    );

    expect(screen.getByText('Sighting 1 of 1')).toBeOnTheScreen();
    expect(screen.getByText('Path through 1 mapped sighting')).toBeOnTheScreen();
    expect(
      screen.queryByRole('adjustable', { name: 'Sighting timeline' }),
    ).not.toBeOnTheScreen();
  });

  it('orders same-day local sightings by their reported time of day', async () => {
    const localAt = (id: string, timeOfDay: string, longitude: number) =>
      localSightingRecord(parseSighting({
        ...sighting,
        id,
        date: new Date('2026-08-01T12:00:00.000Z'),
        timeOfDay,
        location: { latitude: 33.776, longitude },
      }));

    await renderThemed(
      <CatalogEntryElement
        entry={catalogEntry}
        media={[]}
        sightings={[
          localAt('a-night', 'Night', -84.394),
          localAt('z-morning', 'Morning', -84.396),
          localAt('y-afternoon', 'Afternoon', -84.395),
        ]}
      />,
    );

    expect(screen.getByText('Night of August 1, 2026')).toBeOnTheScreen();
    await fireEvent(
      screen.getByRole('adjustable', { name: 'Sighting timeline' }),
      'onAccessibilityAction',
      { nativeEvent: { actionName: 'decrement' } },
    );
    expect(screen.getByText('Afternoon of August 1, 2026')).toBeOnTheScreen();
  });

  it('explains when a cat has no sighting history yet', async () => {
    await renderThemed(
      <CatalogEntryElement entry={catalogEntry} media={[]} sightings={[]} />,
    );

    expect(
      screen.getByText('No sightings have been recorded for Goldie yet.'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('adjustable', { name: 'Sighting timeline' }),
    ).not.toBeOnTheScreen();
  });

  it('shows the favorite count and exposes a single-account favorite action', async () => {
    const onToggleFavorite = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <CatalogEntryElement
        entry={catalogEntry}
        media={[]}
        sightings={[]}
        heartCount={4}
        isFavorite
        onToggleFavorite={onToggleFavorite}
      />,
    );

    expect(screen.getByText('4 hearts')).toBeOnTheScreen();
    expect(screen.getByText(/Each account can choose one favorite cat/)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Remove as favorite' }));
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it('renders imported sightings as attributed read-only source records', async () => {
    await renderThemed(
      <SightingEntry sighting={importedSighting} media={[licensedPhoto]} />,
    );

    expect(screen.getByText('iNaturalist')).toBeOnTheScreen();
    expect(screen.getByText('Needs ID')).toBeOnTheScreen();
    expect(screen.getByText('Cat Watcher')).toBeOnTheScreen();
    expect(screen.getByText('Photo by Cat Watcher, CC BY 4.0')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'View on iNaturalist' })).toBeOnTheScreen();
    expect(screen.queryByText('Was fed')).not.toBeOnTheScreen();
    expect(screen.getByText('Public coordinates are not available for this observation.')).toBeOnTheScreen();
  });

  it('keeps unavailable imported catalog facts visibly unknown', async () => {
    const user = userEvent.setup();
    await renderThemed(
      <CatalogEntryElement entry={importedCatalog} media={[]} sightings={[]} />,
    );

    expect(screen.getByText('iNaturalist guide')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Show all field notes' }));
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'View in the Georgia Tech Cats guide' })).toBeOnTheScreen();
  });

  it('renders explicit station status and announcement attribution', async () => {
    await renderThemed(
      <>
        <StationEntry station={station} status={{ isStocked: false, daysRemaining: -2 }} media={[]} />
        <AnnouncementEntry announcement={announcement} media={[]} />
      </>,
    );

    expect(screen.getByText('Needs food')).toBeOnTheScreen();
    expect(screen.getByText('Campus Cats Team')).toBeOnTheScreen();
  });
});
