import React from 'react';

import {
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import {
  CatalogRecord,
  Role,
  localCatalogRecord,
  parseAlert,
  parseCatalogEntry,
  parseCatalogTag,
  parseStation,
  parseUser,
} from '@/core/domain';
import { AppThemeProvider } from '@/theme';
import { AlertListItem } from '@/presentation/screens/community/alerts/components/AlertListItem';
import { CatalogListItem } from '@/presentation/patterns/catalog/CatalogListItem';
import { StationListItem } from '@/presentation/screens/stations/components/StationListItem';

const mockPush = jest.fn();
const mockCatalogMedia = jest.fn();
const mockStationMedia = jest.fn();
const mockIonicon = jest.fn((_props: unknown) => null);

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: unknown) => mockIonicon(props),
}));
jest.mock('@/composition/appModules', () => ({
  appModules: {
    catalog: { media: (...args: unknown[]) => mockCatalogMedia(...args) },
    stations: { media: (...args: unknown[]) => mockStationMedia(...args) },
  },
}));

const actor = parseUser({
  id: 'admin-1',
  email: 'admin@gatech.edu',
  role: Role.Officer,
});
const alert = parseAlert({
  id: 'alert-1',
  title: 'Volunteer workday',
  info: 'Meet near the library at noon.',
  createdAt: new Date('2026-06-01T12:00:00.000Z'),
  createdBy: actor,
  authorAlias: 'Campus Cats Team',
});
const catalogEntry = localCatalogRecord(
  parseCatalogEntry({
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
  }),
);
const importedCatalogEntry: CatalogRecord = {
  source: 'inaturalist',
  id: 'inat-guide-2001',
  sourceId: 2001,
  cat: { name: 'Mimi', descShort: 'Black-and-white campus cat.' },
  credits: '',
  sourceUrl: 'https://www.inaturalist.org/guide_taxa/2001',
  sourceUpdatedAt: new Date('2026-06-01T12:00:00.000Z'),
  matchStatus: 'unlinked',
  sourceActive: true,
  visible: true,
  moderation: { hidden: false, reason: '' },
};
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
  await render(
    <AppThemeProvider colorScheme="light">{content}</AppThemeProvider>,
  );

describe('list item consistency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCatalogMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockStationMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
  });

  it('keeps alert attribution visible, marks unread cards, and routes by ID', async () => {
    const user = userEvent.setup();
    const view = await renderThemed(
      <AlertListItem {...alert} read={false} />,
    );

    expect(screen.getByText(/By Campus Cats Team/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Unread')).toHaveStyle({
      backgroundColor: '#C65F00',
    });
    await user.press(
      screen.getByRole('button', {
        name: 'Unread alert: Volunteer workday',
      }),
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/community/alerts/[id]',
      params: { id: 'alert-1' },
    });

    await view.rerender(
      <AppThemeProvider colorScheme="light">
        <AlertListItem {...alert} read />
      </AppThemeProvider>,
    );
    expect(screen.queryByLabelText('Unread')).not.toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: 'Read alert: Volunteer workday',
      }),
    ).toBeOnTheScreen();
  });

  it('provides a catalog photo fallback and routes by ID', async () => {
    const user = userEvent.setup();
    await renderThemed(
      <CatalogListItem
        {...catalogEntry}
        tags={[
          parseCatalogTag({ id: 'feral', label: 'Community cat' }),
          parseCatalogTag({ id: 'medical', label: 'Needs medication' }),
        ]}
      />,
    );

    expect(screen.getByText('No profile photo')).toBeOnTheScreen();
    expect(screen.getByText('Community cat')).toBeOnTheScreen();
    expect(screen.queryByText('Needs medication')).not.toBeOnTheScreen();
    expect(screen.queryByText('A friendly orange cat.')).not.toBeOnTheScreen();
    expect(screen.getByText('0 sightings')).toBeOnTheScreen();
    expect(screen.getByText('0 hearts')).toBeOnTheScreen();
    expect(screen.queryByText('iNaturalist profile')).not.toBeOnTheScreen();
    await waitFor(() =>
      expect(mockCatalogMedia).toHaveBeenCalledWith('catalog-1'),
    );
    await user.press(screen.getByRole('button', { name: 'View cat: Goldie' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/catalog/[id]',
      params: { id: 'catalog-1' },
    });
  });

  it('lets selection flows replace catalog profile navigation', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <CatalogListItem
        {...catalogEntry}
        accessibilityLabel="Select Goldie for this sighting"
        onPress={onSelect}
      />,
    );

    await user.press(
      screen.getByRole('button', { name: 'Select Goldie for this sighting' }),
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('keeps favorite selection separate from profile navigation', async () => {
    const onToggleFavorite = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <CatalogListItem
        {...catalogEntry}
        sightingCount={3}
        heartCount={2}
        firstSighting={new Date('2025-07-28T12:00:00')}
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
      />,
    );

    expect(screen.getByText('3 sightings')).toBeOnTheScreen();
    expect(screen.getByText('2 hearts')).toBeOnTheScreen();
    expect(screen.getByText('Jul 28')).toBeOnTheScreen();
    expect(screen.getByLabelText('First sighting: July 28, 2025')).toBeOnTheScreen();
    expect(screen.getByLabelText('Goldie catalog metrics')).toHaveStyle({
      marginTop: 'auto',
    });
    await user.press(
      screen.getByRole('button', {
        name: 'Choose Goldie as your favorite cat',
      }),
    );
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('colors only the selected favorite heart red', async () => {
    await renderThemed(
      <CatalogListItem
        {...catalogEntry}
        isFavorite
        onToggleFavorite={jest.fn()}
      />,
    );

    expect(mockIonicon).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'heart', color: '#B23A3A' }),
    );
  });

  it('does not label imported cards by their source', async () => {
    await renderThemed(<CatalogListItem {...importedCatalogEntry} />);

    expect(screen.getByText('Mimi')).toBeOnTheScreen();
    expect(screen.queryByText('iNaturalist profile')).not.toBeOnTheScreen();
  });

  it('pairs station status color with text and routes by ID', async () => {
    const user = userEvent.setup();
    await renderThemed(
      <StationListItem
        station={station}
        status={{ isStocked: true, daysRemaining: 7 }}
      />,
    );

    expect(screen.getByText('Stocked')).toBeOnTheScreen();
    expect(screen.getByText('Known cats: Goldie')).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'View station: Library station' }),
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/stations/[id]',
      params: { id: 'station-1' },
    });
  });
});
