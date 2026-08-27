import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import EditProfile from '../../app/(app)/profile/edit-profile';
import ProfileSightings from '../../app/(app)/profile/sightings';
import ViewProfile from '../../app/(app)/profile/view-profile';
import {
  Role,
  localSightingRecord,
  parseCatalogEntry,
  parsePublicProfile,
  parseSighting,
  parseUser,
} from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockProfileSync = jest.fn();
const mockProfileGetOrSync = jest.fn();
const mockProfileMedia = jest.fn();
const mockProfileUpdate = jest.fn();
const mockSelectTitle = jest.fn();
const mockSightingsListByReporter = jest.fn();
const mockFavoriteForUser = jest.fn();
const mockCatalogGet = jest.fn();
const mockCatalogMedia = jest.fn();
let mockProfileId: string | undefined = 'member-1';
let mockUserId = 'member-1';

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
    useLocalSearchParams: () => ({ id: mockProfileId }),
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
      back: jest.fn(),
    }),
  };
});

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: mockUserId, email: 'member@gatech.edu', role: 0 },
  }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    profiles: {
      sync: (...args: unknown[]) => mockProfileSync(...args),
      getOrSync: (...args: unknown[]) => mockProfileGetOrSync(...args),
      media: (...args: unknown[]) => mockProfileMedia(...args),
      update: (...args: unknown[]) => mockProfileUpdate(...args),
      selectTitle: (...args: unknown[]) => mockSelectTitle(...args),
    },
    sightings: {
      listByReporter: (...args: unknown[]) =>
        mockSightingsListByReporter(...args),
    },
    catalog: {
      favoriteForUser: (...args: unknown[]) => mockFavoriteForUser(...args),
      get: (...args: unknown[]) => mockCatalogGet(...args),
      media: (...args: unknown[]) => mockCatalogMedia(...args),
    },
    imageSelection: {
      takePhoto: jest.fn(),
      pickFromLibrary: jest.fn(),
    },
  },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const actor = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const profile = parsePublicProfile({
  id: actor.id,
  displayName: 'Cat Watcher',
  bio: 'I keep an eye on the Tech Tower cats.',
  profilePhotoUrl: '',
  role: actor.role,
  achievementIds: ['first-sighting', 'ten-sightings'],
  selectedTitleId: 'first-sighting',
});
const sighting = localSightingRecord(
  parseSighting({
    id: 'sighting-1',
    name: 'Goldie',
    info: 'Near Tech Tower',
    fed: true,
    health: true,
    date: new Date('2026-08-05T12:00:00.000Z'),
    location: { latitude: 33.772, longitude: -84.394 },
    createdBy: actor,
    timeOfDay: 'Afternoon',
  }),
);
const favorite = parseCatalogEntry({
  id: 'cat-1',
  cat: {
    name: 'Goldie',
    descShort: 'Friendly orange cat',
    descLong: 'Often seen near Tech Tower.',
    colorPattern: 'Orange',
    behavior: 'Friendly',
    yearsRecorded: '2025-present',
    AoR: 'Tech Tower',
    currentStatus: 'Feral',
    furLength: 'Short',
    furPattern: 'Tabby',
    tnr: 'Yes',
    sex: 'Female',
  },
  credits: 'Campus Cats',
  createdAt: new Date('2026-08-01T12:00:00.000Z'),
  createdBy: actor,
});

const renderThemed = async (content: React.ReactElement) =>
  await render(
    <AppThemeProvider colorScheme="light">{content}</AppThemeProvider>,
  );

describe('member profile routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileId = 'member-1';
    mockUserId = 'member-1';
    mockProfileSync.mockResolvedValue({ ok: true, value: profile, warnings: [] });
    mockProfileGetOrSync.mockResolvedValue({
      ok: true,
      value: profile,
      warnings: [],
    });
    mockProfileMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockSightingsListByReporter.mockResolvedValue({
      ok: true,
      value: [sighting],
      warnings: [],
    });
    mockFavoriteForUser.mockResolvedValue({
      ok: true,
      value: {
        userId: actor.id,
        catalogId: favorite.id,
        createdAt: new Date(),
      },
      warnings: [],
    });
    mockCatalogGet.mockResolvedValue({
      ok: true,
      value: { ...favorite, source: 'campus-cats' },
      warnings: [],
    });
    mockCatalogMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockSelectTitle.mockResolvedValue({
      ok: true,
      value: { ...profile, selectedTitleId: '' },
      warnings: [],
    });
    mockProfileUpdate.mockResolvedValue({
      ok: true,
      value: profile,
      warnings: [],
    });
  });

  it('shows identity, favorite cat, achievements, and previous sightings', async () => {
    const user = userEvent.setup();
    await renderThemed(<ViewProfile />);

    expect(await screen.findByText('Cat Watcher')).toBeOnTheScreen();
    expect(screen.getAllByText('cat lover').length).toBeGreaterThan(0);
    expect(screen.getByText('2 of 5 achievements unlocked')).toBeOnTheScreen();
    expect(screen.getByText('Previous sightings (1)')).toBeOnTheScreen();
    expect(screen.getAllByText('Goldie').length).toBeGreaterThan(0);

    await user.press(screen.getByRole('button', { name: 'Edit profile' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/edit-profile');
    await user.press(
      screen.getByRole('button', { name: 'Remove displayed title' }),
    );
    expect(mockSelectTitle).toHaveBeenCalledWith(actor, '');
  });

  it('opens the signed-in member profile when the route omits an ID', async () => {
    mockProfileId = undefined;

    await renderThemed(<ViewProfile />);

    expect(await screen.findByText('Cat Watcher')).toBeOnTheScreen();
    expect(screen.queryByText('Profile unavailable')).not.toBeOnTheScreen();
    expect(mockProfileSync).toHaveBeenCalledWith(actor);
  });

  it('renders its skeleton while profile data is loading', async () => {
    mockProfileSync.mockImplementation(() => new Promise(() => undefined));

    await renderThemed(<ViewProfile />);

    expect(screen.getByText('Member profile')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading member profile' }),
    ).toBeOnTheScreen();
  });

  it('shows a profile error without retaining stale member content', async () => {
    mockProfileSync.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Profile service offline' },
    });

    await renderThemed(<ViewProfile />);

    expect(await screen.findByText('Profile unavailable')).toBeOnTheScreen();
    expect(screen.getByText('Profile service offline')).toBeOnTheScreen();
    expect(screen.queryByText('Cat Watcher')).not.toBeOnTheScreen();
  });

  it('shows an empty profile and hides owner controls for another member', async () => {
    mockProfileId = 'member-2';
    mockProfileGetOrSync.mockResolvedValue({
      ok: true,
      value: { ...profile, id: 'member-2', displayName: 'Other Member' },
      warnings: [],
    });
    mockSightingsListByReporter.mockResolvedValue({
      ok: true,
      value: [],
      warnings: [],
    });
    mockFavoriteForUser.mockResolvedValue({
      ok: true,
      value: undefined,
      warnings: [],
    });

    await renderThemed(<ViewProfile />);

    expect(await screen.findByText('Other Member')).toBeOnTheScreen();
    expect(screen.getByText('No favorite cat yet')).toBeOnTheScreen();
    expect(screen.getByText('No sightings yet')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Edit profile' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remove displayed title' })).not.toBeOnTheScreen();
    expect(mockProfileGetOrSync).toHaveBeenCalledWith('member-2');
  });

  it('edits the display name and optional bio', async () => {
    const user = userEvent.setup();
    await renderThemed(<EditProfile />);

    const displayName = await screen.findByLabelText('Display name');
    await user.clear(displayName);
    await user.type(displayName, 'Georgia Tech Cat Fan');
    await user.press(screen.getByRole('button', { name: 'Save Profile' }));

    expect(mockProfileUpdate).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({
        displayName: 'Georgia Tech Cat Fan',
        bio: 'I keep an eye on the Tech Tower cats.',
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/profile/view-profile',
      params: { id: actor.id },
    });
  });

  it('does not allow an edit when authoritative profile media fails to load', async () => {
    const user = userEvent.setup();
    mockProfileMedia.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Profile media offline' },
    });

    await renderThemed(<EditProfile />);

    expect(await screen.findByText('Profile editor unavailable')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Save Profile' }));
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it('links a long profile history to the virtualized sightings list', async () => {
    const user = userEvent.setup();
    mockSightingsListByReporter.mockResolvedValue({
      ok: true,
      value: Array.from({ length: 4 }, (_, index) => ({
        ...sighting,
        id: `sighting-${index + 1}`,
      })),
      warnings: [],
    });

    await renderThemed(<ViewProfile />);
    await user.press(
      await screen.findByRole('button', { name: 'View all 4 sightings' }),
    );

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/profile/sightings',
      params: { id: actor.id, displayName: profile.displayName },
    });
  });

  it('shows all sightings on the dedicated history route', async () => {
    await renderThemed(<ProfileSightings />);

    expect(await screen.findByText('Member’s sightings')).toBeOnTheScreen();
    expect(screen.getByText('Near Tech Tower')).toBeOnTheScreen();
    expect(mockSightingsListByReporter).toHaveBeenCalledWith(actor, actor.id);
  });
});
