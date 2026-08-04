import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import {
  Role,
  InaturalistCatalogRecord,
  InaturalistSightingRecord,
  localCatalogRecord,
  localSightingRecord,
  parseAnnouncement,
  parseCatalogEntry,
  parseSighting,
  parseStation,
  parseUser,
} from '../../core/domain';
import { ExternalMediaAsset, mediaAssetId } from '../../core/ports';
import { AppThemeProvider } from '../../theme';
import { AnnouncementEntry } from './AnnouncementEntry';
import { CatalogEntryElement } from './CatalogEntryElement';
import { SightingEntry } from './SightingEntry';
import { StationEntry } from './StationEntry';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../ui/MapView', () => {
  const mockReact = require('react');
  const { View: MockView } = require('react-native');
  return { MapView: ({ children }: React.PropsWithChildren) => mockReact.createElement(MockView, null, children) };
});
jest.mock('react-native-maps', () => {
  const mockReact = require('react');
  const { View: MockView } = require('react-native');
  return { Marker: () => mockReact.createElement(MockView) };
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

const renderThemed = (content: React.ReactElement) =>
  render(<AppThemeProvider colorScheme="light">{content}</AppThemeProvider>);

describe('detail entries', () => {
  it('pairs sighting statuses with labels and preserves contributor identity', () => {
    renderThemed(<SightingEntry sighting={sighting} media={[]} />);

    expect(screen.getByText('Was fed')).toBeOnTheScreen();
    expect(screen.getByText('Health concern')).toBeOnTheScreen();
    expect(screen.getByText('member-1')).toBeOnTheScreen();
  });

  it('reveals catalog field notes without hiding credits', async () => {
    const user = userEvent.setup();
    renderThemed(<CatalogEntryElement entry={catalogEntry} media={[]} sightings={[sighting]} />);

    await user.press(screen.getByRole('button', { name: 'Show all field notes' }));
    expect(screen.getByText('Orange tabby')).toBeOnTheScreen();
    expect(screen.getByText('Campus Cats volunteers')).toBeOnTheScreen();
  });

  it('renders imported sightings as attributed read-only source records', () => {
    renderThemed(
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
    renderThemed(
      <CatalogEntryElement entry={importedCatalog} media={[]} sightings={[]} />,
    );

    expect(screen.getByText('iNaturalist guide')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Show all field notes' }));
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'View in the Georgia Tech Cats guide' })).toBeOnTheScreen();
  });

  it('renders explicit station status and announcement attribution', () => {
    renderThemed(
      <>
        <StationEntry station={station} status={{ isStocked: false, daysRemaining: -2 }} media={[]} />
        <AnnouncementEntry announcement={announcement} media={[]} />
      </>,
    );

    expect(screen.getByText('Needs food')).toBeOnTheScreen();
    expect(screen.getByText('Campus Cats Team')).toBeOnTheScreen();
  });
});
