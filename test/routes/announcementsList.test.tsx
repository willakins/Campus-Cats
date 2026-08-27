import React from 'react';

import {
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import Announcements from '../../app/(app)/(tabs)/announcements';
import {
  DEFAULT_APP_SETTINGS,
  Role,
  parseAnnouncement,
  parseClubEvent,
  parseUser,
} from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockList = jest.fn();
const mockEventList = jest.fn();
const mockSurveyList = jest.fn();
const mockSurveyAttention = jest.fn();
const mockVoteList = jest.fn();
const mockVoteAttention = jest.fn();
const mockObserveUnreadPing = jest.fn();
const mockPush = jest.fn();
const mockRefreshSettings = jest.fn();
let mockRole: Role = Role.Officer;
let mockSection: string | undefined;
let mockSettings = DEFAULT_APP_SETTINGS;
const mockClubName = 'Campus Cats';

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args) },
    useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }),
    useLocalSearchParams: () => ({ section: mockSection }),
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    announcements: { list: (...args: unknown[]) => mockList(...args) },
    events: { list: (...args: unknown[]) => mockEventList(...args) },
    surveys: {
      list: (...args: unknown[]) => mockSurveyList(...args),
      hasIncompleteOpenSurvey: (...args: unknown[]) =>
        mockSurveyAttention(...args),
    },
    communityVoting: {
      list: (...args: unknown[]) => mockVoteList(...args),
      hasUnsubmittedOpenBallot: (...args: unknown[]) =>
        mockVoteAttention(...args),
    },
    chat: {
      observeUnreadPing: (...args: unknown[]) => mockObserveUnreadPing(...args),
    },
  },
}));

jest.mock('../../components/chat', () => {
  const { Text } = require('react-native');
  return { ChatSection: () => <Text>Club chat</Text> };
});

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'actor-1', email: 'actor@gatech.edu', role: mockRole },
  }),
  useAppSettings: () => ({
    settings: mockSettings,
    refreshSettings: mockRefreshSettings,
  }),
  useClub: () => ({ access: { clubName: mockClubName } }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderAnnouncements = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <Announcements />
    </AppThemeProvider>,
  );

const announcement = parseAnnouncement({
  id: 'announcement-1',
  title: 'Volunteer workday',
  info: 'Meet at noon.',
  createdAt: new Date('2025-04-15T12:00:00.000Z'),
  createdBy: parseUser({
    id: 'admin-1',
    email: 'admin@gatech.edu',
    role: Role.Officer,
  }),
  authorAlias: 'Campus Cats',
});
const event = parseClubEvent({
  id: 'event-1',
  title: 'Volunteer workshop',
  details: 'Learn how to help.',
  location: 'Student Center',
  startsAt: new Date('2099-08-25T12:00:00.000Z'),
  expiresAt: new Date('2099-08-26T12:00:00.000Z'),
  imageUrl: 'https://example.com/event.jpg',
  createdAt: new Date('2026-08-20T12:00:00.000Z'),
  createdBy: parseUser({
    id: 'admin-1',
    email: 'admin@gatech.edu',
    role: Role.Officer,
  }),
});

describe('announcements list route', () => {
  beforeEach(() => {
    mockObserveUnreadPing.mockImplementation(
      (_actor: unknown, observer: (result: unknown) => void) => {
        observer({ ok: true, value: { unread: false }, warnings: [] });
        return jest.fn();
      },
    );
    mockList.mockReset();
    mockPush.mockReset();
    mockRefreshSettings.mockReset();
    mockRefreshSettings.mockResolvedValue(undefined);
    mockEventList.mockReset();
    mockSurveyList.mockReset();
    mockSurveyAttention.mockReset();
    mockVoteList.mockReset();
    mockVoteAttention.mockReset();
    mockEventList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockSurveyList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockSurveyAttention.mockResolvedValue({
      ok: true,
      value: false,
      warnings: [],
    });
    mockVoteList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockVoteAttention.mockResolvedValue({
      ok: true,
      value: false,
      warnings: [],
    });
    mockRole = Role.Officer;
    mockSection = undefined;
    mockSettings = DEFAULT_APP_SETTINGS;
  });

  it('renders an empty result and limits creation to administrators', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    const { rerender } = await renderAnnouncements();
    const user = userEvent.setup();

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(screen.getByText('Community')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Open Announcements' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open Chat' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Open Events' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Open Surveys' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Open Votes' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Open Donate' }),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Community sections')).not.toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Open Announcements' }),
    );
    expect(screen.queryByText('Announcement access')).not.toBeOnTheScreen();
    expect(screen.getByText('No announcements yet')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Create announcement' }),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Community sections')).not.toBeOnTheScreen();

    mockRole = Role.Member;
    await rerender(
      <AppThemeProvider colorScheme="light">
        <Announcements />
      </AppThemeProvider>,
    );
    expect(
      screen.queryByRole('button', { name: 'Create announcement' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(
        'Everyone can read club updates. Only officers can publish or edit announcements.',
      ),
    ).not.toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Show Community menu' }),
    );
    expect(
      screen.getByRole('button', { name: 'Open Announcements' }),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Community sections')).not.toBeOnTheScreen();
  });

  it('renders successful results and module errors', async () => {
    mockList.mockResolvedValue({
      ok: true,
      value: [{ ...announcement, read: false }],
      warnings: [],
    });
    const { unmount } = await renderAnnouncements();
    expect(await screen.findByLabelText('Unread announcements')).toHaveStyle({
      backgroundColor: '#C65F00',
    });
    await userEvent.press(
      screen.getByRole('button', { name: 'Open Announcements' }),
    );
    expect(await screen.findByText('Volunteer workday')).toBeOnTheScreen();
    expect(screen.getByLabelText('Unread')).toBeOnTheScreen();
    await unmount();

    mockList.mockResolvedValue({
      ok: false,
      error: {
        code: 'dependency_failure',
        message: 'Could not load announcements',
      },
    });
    await renderAnnouncements();
    await userEvent.press(
      screen.getByRole('button', { name: 'Open Announcements' }),
    );
    expect(
      await screen.findByText('Could not load announcements'),
    ).toBeOnTheScreen();
  });

  it('does not badge the Community announcements card when all are read', async () => {
    mockList.mockResolvedValue({
      ok: true,
      value: [{ ...announcement, read: true }],
      warnings: [],
    });
    await renderAnnouncements();

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(
      screen.queryByLabelText('Unread announcements'),
    ).not.toBeOnTheScreen();
  });

  it('badges unread events, incomplete surveys, and unsubmitted open votes', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockEventList.mockResolvedValue({
      ok: true,
      value: [{ ...event, read: false }],
      warnings: [],
    });
    mockSurveyAttention.mockResolvedValue({
      ok: true,
      value: true,
      warnings: [],
    });
    mockVoteAttention.mockResolvedValue({
      ok: true,
      value: true,
      warnings: [],
    });
    const first = await renderAnnouncements();

    for (const label of [
      'Unread events',
      'Incomplete surveys',
      'Votes awaiting your ballot',
    ]) {
      expect(await screen.findByLabelText(label)).toHaveStyle({
        backgroundColor: '#C65F00',
      });
    }
    await first.unmount();

    mockEventList.mockResolvedValue({
      ok: true,
      value: [{ ...event, read: true }],
      warnings: [],
    });
    mockSurveyAttention.mockResolvedValue({
      ok: true,
      value: false,
      warnings: [],
    });
    mockVoteAttention.mockResolvedValue({
      ok: true,
      value: false,
      warnings: [],
    });
    await renderAnnouncements();
    await waitFor(() => expect(mockEventList).toHaveBeenCalled());

    expect(screen.queryByLabelText('Unread events')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Incomplete surveys')).not.toBeOnTheScreen();
    expect(
      screen.queryByLabelText('Votes awaiting your ballot'),
    ).not.toBeOnTheScreen();
  });

  it('searches titles and sorts announcements from either date direction', async () => {
    const older = {
      ...announcement,
      id: 'announcement-older',
      title: 'Food pantry reminder',
      createdAt: new Date('2025-04-01T12:00:00.000Z'),
      read: true,
    };
    const newer = {
      ...announcement,
      id: 'announcement-newer',
      title: 'Volunteer workday',
      createdAt: new Date('2025-04-15T12:00:00.000Z'),
      read: false,
    };
    mockList.mockResolvedValue({
      ok: true,
      value: [newer, older],
      warnings: [],
    });
    const user = userEvent.setup();
    await renderAnnouncements();
    await user.press(
      screen.getByRole('button', { name: 'Open Announcements' }),
    );

    const announcementButtons = () =>
      screen
        .getAllByRole('button')
        .filter(({ props }) =>
          String(props.accessibilityLabel).includes('announcement:'),
        );
    expect(
      announcementButtons().map(({ props }) => props.accessibilityLabel),
    ).toEqual([
      'Unread announcement: Volunteer workday',
      'Read announcement: Food pantry reminder',
    ]);

    await user.press(
      screen.getByRole('button', {
        name: 'Sort announcements. Current: Most recent',
      }),
    );
    await user.press(screen.getByRole('button', { name: 'Least recent' }));
    expect(
      announcementButtons().map(({ props }) => props.accessibilityLabel),
    ).toEqual([
      'Read announcement: Food pantry reminder',
      'Unread announcement: Volunteer workday',
    ]);

    await user.type(
      screen.getByLabelText('Search announcements by title'),
      'pantry',
    );
    expect(screen.getByText('Food pantry reminder')).toBeOnTheScreen();
    expect(screen.queryByText('Volunteer workday')).not.toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Search announcements by title'));
    await user.type(
      screen.getByLabelText('Search announcements by title'),
      'missing',
    );
    expect(screen.getByText('No matching announcements')).toBeOnTheScreen();
  });

  it('keeps stable loading geometry and routes the authorized create action', async () => {
    let finish: ((value: unknown) => void) | undefined;
    mockList.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    await renderAnnouncements();

    expect(screen.getByText('Community')).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'Open Announcements' }),
    );
    expect(
      screen.getByRole('progressbar', { name: 'Loading announcements' }),
    ).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'Create announcement' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/announcements/create-ann');
    finish?.({ ok: true, value: [], warnings: [] });
    expect(await screen.findByText('No announcements yet')).toBeOnTheScreen();
  });

  it('groups events, surveys, and chat under the same Community tab', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockSection = 'events';
    const user = userEvent.setup();
    const eventsView = await renderAnnouncements();
    expect(await screen.findByText('No upcoming events')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Create event' }));
    expect(mockPush).toHaveBeenCalledWith('/events/create-event');
    await eventsView.unmount();

    mockSection = 'surveys';
    const surveyView = await renderAnnouncements();
    expect(screen.queryByText('Survey privacy')).not.toBeOnTheScreen();
    expect(screen.getByText('No open surveys')).toBeOnTheScreen();
    await surveyView.unmount();

    mockSection = 'chat';
    const chatView = await renderAnnouncements();
    expect(screen.getByText('Club chat')).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Create chat' }),
    ).not.toBeOnTheScreen();
    await chatView.unmount();

    mockSection = 'votes';
    await renderAnnouncements();
    expect(await screen.findByText('No active votes')).toBeOnTheScreen();
    expect(screen.queryByText('One member, one vote')).not.toBeOnTheScreen();
  });

  it('shows the configured donation page and reserves editing for the President', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockSettings = {
      ...DEFAULT_APP_SETTINGS,
      donationPage: {
        title: 'Help feed the colony',
        description: 'Support food and veterinary care.',
        images: [],
        method: 'external',
        externalUrl: 'https://give.example.org/campus-cats',
      },
    };
    const user = userEvent.setup();
    await renderAnnouncements();

    await user.press(screen.getByRole('button', { name: 'Open Donate' }));
    await waitFor(() => expect(mockRefreshSettings).toHaveBeenCalled());
    expect(screen.getByText('Help feed the colony')).toBeOnTheScreen();
    expect(
      screen.getByText('Support food and veterinary care.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Donate on external website' }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Edit donation page' }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Community sections')).not.toBeOnTheScreen();

    mockRole = Role.President;
    await screen.rerender(
      <AppThemeProvider colorScheme="light">
        <Announcements />
      </AppThemeProvider>,
    );
    expect(
      screen.getByRole('button', { name: 'Edit donation page' }),
    ).toBeOnTheScreen();
  });

  it('shows a club-specific empty state and a President-only create action', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockRole = Role.President;
    const user = userEvent.setup();
    await renderAnnouncements();

    await user.press(screen.getByRole('button', { name: 'Open Donate' }));
    expect(
      screen.getByText('Campus Cats has not set up donations'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Please message the club President to ask them to set this up.',
      ),
    ).toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Create donation page' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/donations/edit-donation');
  });

  it('does not show the donation setup action to non-President officers', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockRole = Role.Officer;
    mockSection = 'donate';
    await renderAnnouncements();

    expect(
      await screen.findByText('Campus Cats has not set up donations'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Create donation page' }),
    ).not.toBeOnTheScreen();
  });
});
