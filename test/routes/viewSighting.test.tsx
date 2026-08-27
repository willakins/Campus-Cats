import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import {
  InaturalistSightingRecord,
  Role,
  localSightingRecord,
  parseSighting,
} from '../../core/domain';
import ViewSighting from '../../app/(app)/sighting/view-sighting';
import { AppThemeProvider } from '../../theme';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockGet = jest.fn();
const mockMedia = jest.fn();
const mockLinkedReporter = jest.fn();
const mockProfileGet = jest.fn();
const mockCommentsList = jest.fn();
let mockUserId = 'member-1';
let mockRole: Role = Role.Member;
let mockAnonymous = true;

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
    useLocalSearchParams: () => ({ id: 'sighting-1' }),
    useRouter: () => ({ push: mockPush, back: mockBack }),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    sightings: {
      get: (...args: unknown[]) => mockGet(...args),
      media: (...args: unknown[]) => mockMedia(...args),
      linkedReporter: (...args: unknown[]) => mockLinkedReporter(...args),
    },
    profiles: { getOrSync: (...args: unknown[]) => mockProfileGet(...args) },
    comments: {
      list: (...args: unknown[]) => mockCommentsList(...args),
    },
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: mockUserId, email: 'member@gatech.edu', role: mockRole },
  }),
  useAppSettings: () => ({
    settings: { sightingsAnonymous: mockAnonymous },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('../../components/entries/SightingEntry', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText } = require('react-native');
  return {
    SightingEntry: ({
      sighting,
      onReporterPress,
      showContributor,
    }: {
      sighting: { name: string };
      onReporterPress?: () => void;
      showContributor?: boolean;
    }) =>
      mockReact.createElement(
        mockReact.Fragment,
        null,
        mockReact.createElement(MockText, null, sighting.name),
        showContributor && onReporterPress
          ? mockReact.createElement(
              MockPressable,
              {
                accessibilityRole: 'button',
                accessibilityLabel: 'View reporter profile',
                onPress: onReporterPress,
              },
              mockReact.createElement(MockText, null, 'Reporter'),
            )
          : null,
      ),
  };
});

const renderSighting = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <ViewSighting />
    </AppThemeProvider>,
  );

const sighting = localSightingRecord(parseSighting({
  id: 'sighting-1',
  name: 'Goldie',
  info: 'Near Tech Tower',
  fed: true,
  health: true,
  date: new Date('2025-04-10T12:00:00.000Z'),
  location: { latitude: 33.772, longitude: -84.394 },
  createdBy: {
    id: 'member-1',
    email: 'member@gatech.edu',
    role: Role.Member,
  },
  timeOfDay: 'Afternoon',
}));
const importedSighting: InaturalistSightingRecord = {
  source: 'inaturalist',
  id: 'inat-observation-1001',
  sourceId: 1001,
  name: 'Mimi',
  info: '',
  date: new Date('2025-04-10T12:00:00.000Z'),
  observedOn: '2025-04-10',
  observedTimePrecision: 'exact',
  location: { latitude: 33.772, longitude: -84.394 },
  qualityGrade: 'research',
  observer: { id: 42, login: 'observer' },
  sourceUrl: 'https://www.inaturalist.org/observations/1001',
  positionalAccuracy: null,
  sourceActive: true,
  visible: true,
};

describe('view sighting route', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockProfileGet.mockClear();
    mockUserId = 'member-1';
    mockRole = Role.Member;
    mockAnonymous = true;
    mockGet.mockResolvedValue({ ok: true, value: sighting, warnings: [] });
    mockMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockLinkedReporter.mockResolvedValue({
      ok: true,
      value: undefined,
      warnings: [],
    });
    mockProfileGet.mockResolvedValue({
      ok: false,
      error: { code: 'not_found', message: 'Member profile not found' },
    });
    mockCommentsList.mockResolvedValue({ ok: true, value: [], warnings: [] });
  });

  it('renders the page header and detail geometry before data resolves', async () => {
    mockGet.mockImplementation(() => new Promise(() => undefined));
    await renderSighting();

    expect(screen.getByText('Sighting details')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading sighting' }),
    ).toBeOnTheScreen();
  });

  it('loads by route ID and lets the creator open the editor', async () => {
    const user = userEvent.setup();
    await renderSighting();

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Edit sighting' }));
    expect(mockGet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'member-1' }),
      'sighting-1',
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/sighting/edit-sighting',
      params: { id: 'sighting-1' },
    });
    expect(mockCommentsList).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'member-1' }),
      { kind: 'sighting', id: 'sighting-1' },
    );
  });

  it('returns to the route that opened the sighting', async () => {
    const user = userEvent.setup();
    await renderSighting();

    await user.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalledWith('/(app)/(tabs)');
  });

  it('opens the Campus Cats reporter’s public profile', async () => {
    mockRole = Role.Officer;
    const user = userEvent.setup();
    await renderSighting();

    await user.press(
      await screen.findByRole('button', { name: 'View reporter profile' }),
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/profile/view-profile',
      params: { id: 'member-1' },
    });
  });

  it('keeps the reporter hidden from a Member while preserving edit access', async () => {
    await renderSighting();

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Edit sighting' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'View reporter profile' }))
      .not.toBeOnTheScreen();
    expect(mockProfileGet).not.toHaveBeenCalled();
  });

  it('does not offer editing to a different user', async () => {
    mockUserId = 'member-2';
    await renderSighting();

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Edit sighting' })).not.toBeOnTheScreen();
  });

  it('never offers Campus Cats editing for imported sightings', async () => {
    mockGet.mockResolvedValue({
      ok: true,
      value: importedSighting,
      warnings: [],
    });
    await renderSighting();

    expect(await screen.findByText('Mimi')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Edit sighting' })).not.toBeOnTheScreen();
  });

  it('opens the linked Campus Cats profile for a verified iNaturalist observer', async () => {
    mockGet.mockResolvedValue({
      ok: true,
      value: importedSighting,
      warnings: [],
    });
    mockLinkedReporter.mockResolvedValue({
      ok: true,
      value: 'member-2',
      warnings: [],
    });
    mockProfileGet.mockResolvedValue({
      ok: true,
      value: {
        id: 'member-2',
        displayName: 'Cat Watcher',
        bio: '',
        profilePhotoUrl: '',
        role: Role.Member,
        achievementIds: [],
        selectedTitleId: '',
      },
      warnings: [],
    });
    const user = userEvent.setup();
    await renderSighting();

    await user.press(
      await screen.findByRole('button', { name: 'View reporter profile' }),
    );
    expect(mockLinkedReporter).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'member-1' }),
      42,
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/profile/view-profile',
      params: { id: 'member-2' },
    });
  });

  it('renders a module error instead of a dummy record', async () => {
    mockGet.mockResolvedValue({
      ok: false,
      error: { code: 'not_found', message: 'Sighting not found' },
    });
    await renderSighting();

    expect(await screen.findByText('Sighting not found')).toBeOnTheScreen();
  });
});
