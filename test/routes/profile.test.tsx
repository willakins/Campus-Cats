import React from 'react';
import { Alert } from 'react-native';

import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import EditProfile from '../../app/(app)/profiles/edit';
import ProfileSightings from '../../app/(app)/profiles/[id]/sightings';
import ViewProfile from '../../app/(app)/profiles/[id]';
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
const mockCatalogList = jest.fn();
const mockCatalogGet = jest.fn();
const mockCatalogMedia = jest.fn();
const mockCatalogSetFavorite = jest.fn();
const mockDeleteOwnAccount = jest.fn();
const mockSignOut = jest.fn();
let mockProfileId: string | undefined = 'member-1';
let mockUserId = 'member-1';
let mockUserRole: Role = Role.Member;
const mockAlert = jest
  .spyOn(Alert, 'alert')
  .mockImplementation(() => undefined);

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

jest.mock('../../presentation/providers', () => ({
  useAuth: () => ({
    user: {
      id: mockUserId,
      email: 'member@gatech.edu',
      role: mockUserRole,
    },
    signOut: mockSignOut,
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
      list: (...args: unknown[]) => mockCatalogList(...args),
      favoriteForUser: (...args: unknown[]) => mockFavoriteForUser(...args),
      get: (...args: unknown[]) => mockCatalogGet(...args),
      media: (...args: unknown[]) => mockCatalogMedia(...args),
      setFavorite: (...args: unknown[]) => mockCatalogSetFavorite(...args),
    },
    imageSelection: {
      takePhoto: jest.fn(),
      pickFromLibrary: jest.fn(),
    },
    users: {
      deleteOwnAccount: (...args: unknown[]) => mockDeleteOwnAccount(...args),
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
const alternateFavorite = parseCatalogEntry({
  ...favorite,
  id: 'cat-2',
  cat: {
    ...favorite.cat,
    name: 'Mittens',
    descShort: 'Quiet tuxedo cat',
  },
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
    mockUserRole = Role.Member;
    mockProfileSync.mockResolvedValue({
      ok: true,
      value: profile,
      warnings: [],
    });
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
    mockCatalogList.mockResolvedValue({
      ok: true,
      value: [
        { ...favorite, source: 'campus-cats' },
        { ...alternateFavorite, source: 'campus-cats' },
      ],
      warnings: [],
    });
    mockCatalogGet.mockResolvedValue({
      ok: true,
      value: { ...favorite, source: 'campus-cats' },
      warnings: [],
    });
    mockCatalogMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockCatalogSetFavorite.mockResolvedValue({
      ok: true,
      value: {
        userId: actor.id,
        catalogId: alternateFavorite.id,
        createdAt: new Date(),
      },
      warnings: [],
    });
    mockSignOut.mockResolvedValue(undefined);
    mockDeleteOwnAccount.mockResolvedValue({
      ok: true,
      value: undefined,
      warnings: [],
    });
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
    expect(screen.getByTestId('profile-avatar-placeholder')).toBeOnTheScreen();
    expect(
      screen.getByTestId('profile-avatar-placeholder-head', {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('profile-avatar-placeholder-body', {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('cat lover').length).toBeGreaterThan(0);
    const selectedTitle = screen.getByTestId('profile-selected-title');
    const displayName = screen.getByTestId('profile-display-name');
    expect(selectedTitle).toHaveTextContent('cat lover');
    expect(displayName).toHaveTextContent('Cat Watcher');
    expect(selectedTitle.parent).toBe(displayName.parent);
    expect(selectedTitle.parent?.children.indexOf(selectedTitle)).toBeLessThan(
      displayName.parent?.children.indexOf(displayName) ?? -1,
    );
    expect(screen.getByText('2 of 5 achievements unlocked')).toBeOnTheScreen();
    expect(screen.getByText('Previous sightings (1)')).toBeOnTheScreen();
    expect(screen.getAllByText('Goldie').length).toBeGreaterThan(0);
    expect(screen.getByTestId('form-action-bar')).toBeOnTheScreen();
    expect(screen.getByTestId('form-action-bar-glass')).toBeOnTheScreen();

    expect(
      screen.queryByRole('button', { name: 'Open account settings' }),
    ).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Log out' }));
    expect(mockAlert).toHaveBeenCalledWith(
      'Log out',
      'Are you sure you want to log out?',
      expect.any(Array),
    );
    expect(mockSignOut).not.toHaveBeenCalled();
    const confirmationButtons = mockAlert.mock.calls[0]?.[2] ?? [];
    await act(async () => {
      confirmationButtons.find(({ text }) => text === 'Log out')?.onPress?.();
    });
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith('/login');
    await user.press(screen.getByRole('button', { name: 'Edit profile' }));
    expect(mockPush).toHaveBeenCalledWith('/profiles/edit');
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

  it('leaves an empty bio blank on the member profile', async () => {
    mockProfileSync.mockResolvedValue({
      ok: true,
      value: { ...profile, bio: '' },
      warnings: [],
    });

    await renderThemed(<ViewProfile />);

    expect(await screen.findByText('Cat Watcher')).toBeOnTheScreen();
    expect(
      screen.queryByText('Add a bio to tell other members about yourself.'),
    ).not.toBeOnTheScreen();
  });

  it('labels iNaturalist account linking as coming soon', async () => {
    const user = userEvent.setup();
    await renderThemed(<ViewProfile />);

    expect(await screen.findByText('Connected accounts')).toBeOnTheScreen();
    expect(screen.getByText('iNaturalist')).toBeOnTheScreen();
    expect(screen.getByText('Coming soon')).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', {
        name: 'Learn about iNaturalist connection',
      }),
    );
    expect(mockPush).toHaveBeenCalledWith('/settings/integrations/inaturalist-account');
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
    expect(
      screen.queryByRole('button', { name: 'Edit profile' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Log out' }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('Connected accounts')).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Remove displayed title' }),
    ).not.toBeOnTheScreen();
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
      pathname: '/profiles/[id]',
      params: { id: actor.id },
    });
  });

  it('permanently deletes an account after confirmation from the danger zone', async () => {
    const user = userEvent.setup();
    await renderThemed(<EditProfile />);

    await user.press(
      await screen.findByRole('button', { name: 'Delete my account' }),
    );

    expect(mockDeleteOwnAccount).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith(
      'Permanently delete your account?',
      'This cannot be undone. Your account and personal contributions will be removed.',
      expect.any(Array),
    );
    const confirmationButtons = mockAlert.mock.calls.at(-1)?.[2] ?? [];
    await act(async () => {
      confirmationButtons
        .find(({ text }) => text === 'Delete my account')
        ?.onPress?.();
    });

    await waitFor(() => {
      expect(mockDeleteOwnAccount).toHaveBeenCalledWith(
        actor,
        'member@gatech.edu',
      );
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('requires a President to transfer the presidency before account deletion', async () => {
    mockUserRole = Role.President;
    await renderThemed(<EditProfile />);

    expect(
      await screen.findByText(
        'Transfer the club presidency before deleting this account.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Delete my account' }),
    ).not.toBeOnTheScreen();
  });

  it('sets an owned title and favorite cat while editing the profile', async () => {
    const user = userEvent.setup();
    mockSelectTitle.mockResolvedValue({
      ok: true,
      value: { ...profile, selectedTitleId: 'ten-sightings' },
      warnings: [],
    });

    await renderThemed(<EditProfile />);

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    expect(screen.getByText('cat lover')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Browse Cat-alog' }));
    expect(screen.getByText('Choose your favorite cat')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Select Goldie as favorite cat' }),
    ).toHaveProp('accessibilityState', { selected: true });
    await user.type(screen.getByLabelText('Search favorite cats'), 'Mittens');
    await user.press(
      screen.getByRole('button', { name: 'Select Mittens as favorite cat' }),
    );
    await user.press(screen.getByRole('button', { name: 'Change title' }));
    expect(screen.getByText('Title collection')).toBeOnTheScreen();
    expect(screen.getByText('Picture Purr-fect')).toBeOnTheScreen();
    expect(screen.getByText('Presidential Service')).toBeOnTheScreen();
    expect(screen.getAllByText('Locked')).toHaveLength(3);
    await user.press(
      screen.getByRole('button', { name: 'Equip “cat collector”' }),
    );
    await user.press(screen.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() => {
      expect(mockSelectTitle).toHaveBeenCalledWith(actor, 'ten-sightings');
      expect(mockCatalogSetFavorite).toHaveBeenCalledWith(actor, 'cat-2');
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/profiles/[id]',
      params: { id: actor.id },
    });
  });

  it('keeps profile editing available when favorite data is offline', async () => {
    const user = userEvent.setup();
    mockCatalogList.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Catalog offline' },
    });

    await renderThemed(<EditProfile />);

    expect(await screen.findByLabelText('Display name')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Favorite cat selection is unavailable right now. Your current favorite will not be changed.',
      ),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() => expect(mockProfileUpdate).toHaveBeenCalledTimes(1));
    expect(mockCatalogSetFavorite).not.toHaveBeenCalled();
  });

  it('checkpoints a saved title when a later favorite update fails', async () => {
    const user = userEvent.setup();
    mockCatalogSetFavorite
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'dependency_failure',
          message: 'Could not update your favorite cat',
        },
      })
      .mockResolvedValue({
        ok: true,
        value: {
          userId: actor.id,
          catalogId: alternateFavorite.id,
          createdAt: new Date(),
        },
        warnings: [],
      });

    await renderThemed(<EditProfile />);
    await user.press(
      await screen.findByRole('button', { name: 'Browse Cat-alog' }),
    );
    await user.press(
      screen.getByRole('button', { name: 'Select Mittens as favorite cat' }),
    );
    await user.press(screen.getByRole('button', { name: 'Change title' }));
    await user.press(
      screen.getByRole('button', { name: 'Equip “cat collector”' }),
    );
    await user.press(screen.getByRole('button', { name: 'Save Profile' }));

    expect(
      await screen.findByText(
        'Displayed title saved, but could not update your favorite cat',
      ),
    ).toBeOnTheScreen();
    expect(mockProfileUpdate).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Save Profile' }));
    await waitFor(() => expect(mockProfileUpdate).toHaveBeenCalledTimes(1));
    expect(mockSelectTitle).toHaveBeenCalledTimes(1);
    expect(mockCatalogSetFavorite).toHaveBeenCalledTimes(2);
  });

  it('does not allow an edit when authoritative profile media fails to load', async () => {
    const user = userEvent.setup();
    mockProfileMedia.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Profile media offline' },
    });

    await renderThemed(<EditProfile />);

    expect(
      await screen.findByText('Profile editor unavailable'),
    ).toBeOnTheScreen();
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
      pathname: '/profiles/[id]/sightings',
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
