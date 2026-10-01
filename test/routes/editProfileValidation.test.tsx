import React from 'react';

import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from '@testing-library/react-native';

import EditProfile from '../../app/(app)/profiles/edit';
import { Role, parsePublicProfile } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockProfileUpdate = jest.fn();
const mockProfileSync = jest.fn();
const mockProfileMedia = jest.fn();
const mockCatalogList = jest.fn();
const mockFavoriteForUser = jest.fn();
const mockScrollTo = jest.fn();

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const mockReact = require('react');
    return mockReact.useEffect(effect, [effect]);
  },
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../presentation/ui', () => {
  const actual = jest.requireActual('../../presentation/ui');
  const ReactRuntime = require('react');
  const { View: NativeView } = require('react-native');
  return {
    ...actual,
    Screen: ({
      children,
      footer,
      scrollRef,
    }: {
      children: React.ReactNode;
      footer?: React.ReactNode;
      scrollRef?: {
        current: { scrollTo: (options: unknown) => void } | null;
      };
    }) => {
      ReactRuntime.useEffect(() => {
        if (!scrollRef) return undefined;
        scrollRef.current = { scrollTo: mockScrollTo };
        return () => {
          scrollRef.current = null;
        };
      }, [scrollRef]);
      return ReactRuntime.createElement(NativeView, null, children, footer);
    },
  };
});

const mockProfile = parsePublicProfile({
  id: 'member-1',
  displayName: 'Cat Watcher',
  bio: 'Tech Tower cat fan.',
  profilePhotoUrl: '',
  role: Role.Member,
  achievementIds: [],
  selectedTitleId: '',
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    profiles: {
      sync: (...args: unknown[]) => mockProfileSync(...args),
      media: (...args: unknown[]) => mockProfileMedia(...args),
      update: (...args: unknown[]) => mockProfileUpdate(...args),
      selectTitle: jest.fn(),
    },
    catalog: {
      list: (...args: unknown[]) => mockCatalogList(...args),
      favoriteForUser: (...args: unknown[]) => mockFavoriteForUser(...args),
      setFavorite: jest.fn(),
    },
    imageSelection: {
      takePhoto: jest.fn(),
      pickFromLibrary: jest.fn(),
    },
  },
}));
jest.mock('../../presentation/providers', () => ({
  useAuth: () => ({
    user: { id: 'member-1', email: 'member@gatech.edu', role: 0 },
  }),
}));

describe('edit profile validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileSync.mockResolvedValue({
      ok: true,
      value: mockProfile,
      warnings: [],
    });
    mockProfileMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockCatalogList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockFavoriteForUser.mockResolvedValue({
      ok: true,
      value: undefined,
      warnings: [],
    });
  });

  it('presents profile media as one profile photo instead of a photo gallery', async () => {
    mockProfileSync.mockResolvedValue({
      ok: true,
      value: { ...mockProfile, profilePhotoUrl: 'file://profile.jpg' },
      warnings: [],
    });
    mockProfileMedia.mockResolvedValue({
      ok: true,
      value: [
        { id: 'profile-photo-1', url: 'file://profile.jpg', role: 'profile' },
      ],
      warnings: [],
    });

    await render(
      <AppThemeProvider colorScheme="light">
        <EditProfile />
      </AppThemeProvider>,
    );

    expect(await screen.findByText('Profile')).toBeOnTheScreen();
    const profileCard = screen.getByTestId('profile-section-about');
    expect(
      within(profileCard).getByLabelText('Profile photo preview'),
    ).toBeOnTheScreen();
    const displayName = within(profileCard).getByLabelText('Display name');
    expect(displayName).toHaveStyle({
      height: 48,
      paddingVertical: 0,
      includeFontPadding: false,
      textAlignVertical: 'center',
      transform: [{ translateY: -5 }],
    });
    expect(displayName.parent).toHaveStyle({
      minHeight: 44,
      justifyContent: 'center',
    });
    expect(within(profileCard).getByLabelText('Bio')).toBeOnTheScreen();
    expect(screen.queryByText('About you')).not.toBeOnTheScreen();
    expect(
      screen.getByText(
        'Choose a photo, then move and crop it to fit your profile circle.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Profile photo preview')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Change profile photo' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Remove profile photo' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Photos')).not.toBeOnTheScreen();
    expect(screen.queryByText('Cover photo')).not.toBeOnTheScreen();
    expect(
      screen.queryByText(
        'The cover photo appears first on cards and detail pages.',
      ),
    ).not.toBeOnTheScreen();
  });

  it('marks a missing display name, scrolls to it, and shows guidance', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <EditProfile />
      </AppThemeProvider>,
    );

    const displayName = await screen.findByLabelText('Display name');
    const layout = (y: number) => ({
      nativeEvent: { layout: { x: 0, y, width: 320, height: 48 } },
    });
    await fireEvent(
      screen.getByTestId('form-screen-content'),
      'layout',
      layout(100),
    );
    await fireEvent(
      screen.getByTestId('profile-section-about'),
      'layout',
      layout(200),
    );
    await fireEvent(
      screen.getByTestId('profile-field-display-name'),
      'layout',
      layout(30),
    );
    await user.clear(displayName);
    await user.press(screen.getByRole('button', { name: 'Save Profile' }));

    expect(
      await screen.findByText('Display name is required.'),
    ).toBeOnTheScreen();
    expect(displayName).toHaveStyle({ borderColor: '#B23A3A' });
    expect(
      screen.getByRole('alert', {
        name: 'Please fill in the missing information.',
      }),
    ).toBeOnTheScreen();
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 318, animated: true });
    expect(mockProfileUpdate).not.toHaveBeenCalled();

    await user.type(displayName, 'Campus Cat Fan');
    await waitFor(() =>
      expect(
        screen.queryByText('Display name is required.'),
      ).not.toBeOnTheScreen(),
    );
  });

  it('shows the full locked title collection when no achievements are unlocked', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <EditProfile />
      </AppThemeProvider>,
    );

    await user.press(
      await screen.findByRole('button', { name: 'View title progress' }),
    );

    expect(screen.getByText('No title equipped.')).toHaveStyle({
      color: '#B23A3A',
    });
    expect(screen.getByText('Title collection')).toBeOnTheScreen();
    expect(screen.getByText('Collect them all')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Every achievement unlocks a title you can wear on your profile. Pick an unlocked favorite—or see what to chase next.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('0 / 5 collected')).toBeOnTheScreen();
    expect(screen.getByText('purr-trait pro')).toBeOnTheScreen();
    expect(screen.getByText('prez')).toBeOnTheScreen();
    expect(screen.getByText('cat lover')).toBeOnTheScreen();
    expect(screen.getByText('cat collector')).toBeOnTheScreen();
    expect(screen.getByText('cat cutie')).toBeOnTheScreen();
    expect(screen.getAllByText('Locked')).toHaveLength(5);

    await user.press(
      screen.getByRole('button', { name: 'Close title collection' }),
    );
    expect(screen.queryByText('Title collection')).not.toBeOnTheScreen();
  });
});
