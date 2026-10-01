import React from 'react';
import { Animated } from 'react-native';

import {
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import Community from '../../app/(app)/(tabs)/community';
import {
  DEFAULT_APP_SETTINGS,
  Role,
  parseAlert,
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
    alerts: { list: (...args: unknown[]) => mockList(...args) },
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

jest.mock('../../presentation/screens/community/chat/components', () => {
  const { Text } = require('react-native');
  return { ChatSection: () => <Text>Club chat</Text> };
});

jest.mock('../../presentation/providers', () => ({
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

const renderAlerts = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <Community />
    </AppThemeProvider>,
  );

const alert = parseAlert({
  id: 'alert-1',
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

describe('community route', () => {
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
    const { rerender } = await renderAlerts();
    const user = userEvent.setup();

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(screen.getByText('Community')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Open Alerts' }),
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
    expect(screen.getByText('Club news and volunteer updates')).toHaveStyle({
      marginTop: 'auto',
    });
    expect(screen.queryByLabelText('Community sections')).not.toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Open Alerts' }),
    );
    expect(screen.queryByText('Alert access')).not.toBeOnTheScreen();
    expect(screen.getByText('No alerts yet')).toBeOnTheScreen();
    expect(screen.getByTestId('alerts-list')).toHaveProp(
      'contentContainerStyle',
      expect.objectContaining({ flexGrow: 1, justifyContent: 'center' }),
    );
    expect(
      screen.getByRole('button', { name: 'Create alert' }),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Community sections')).not.toBeOnTheScreen();

    mockRole = Role.Member;
    await rerender(
      <AppThemeProvider colorScheme="light">
        <Community />
      </AppThemeProvider>,
    );
    expect(
      screen.queryByRole('button', { name: 'Create alert' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(
        'Everyone can read club updates. Only officers can publish or edit alerts.',
      ),
    ).not.toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Show Community menu' }),
    );
    expect(
      screen.getByRole('button', { name: 'Open Alerts' }),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Community sections')).not.toBeOnTheScreen();
  });

  it('animates back from a section to the Community card grid', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    const timing = jest.spyOn(Animated, 'timing');
    const user = userEvent.setup();
    await renderAlerts();

    await user.press(screen.getByRole('button', { name: 'Open Alerts' }));
    expect(await screen.findByText('No alerts yet')).toBeOnTheScreen();
    timing.mockClear();

    await user.press(
      screen.getByRole('button', { name: 'Show Community menu' }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Open Alerts' }),
      ).toBeOnTheScreen(),
    );
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0 }),
    );
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1 }),
    );
    timing.mockRestore();
  });

  it('renders successful results and module errors', async () => {
    mockList.mockResolvedValue({
      ok: true,
      value: [{ ...alert, read: false }],
      warnings: [],
    });
    const { unmount } = await renderAlerts();
    expect(await screen.findByLabelText('Unread alerts')).toHaveStyle({
      backgroundColor: '#C65F00',
    });
    await userEvent.press(
      screen.getByRole('button', { name: 'Open Alerts' }),
    );
    expect(await screen.findByText('Volunteer workday')).toBeOnTheScreen();
    expect(screen.getByLabelText('Unread')).toBeOnTheScreen();
    await unmount();

    mockList.mockResolvedValue({
      ok: false,
      error: {
        code: 'dependency_failure',
        message: 'Could not load alerts',
      },
    });
    await renderAlerts();
    await userEvent.press(
      screen.getByRole('button', { name: 'Open Alerts' }),
    );
    expect(
      await screen.findByText('Could not load alerts'),
    ).toBeOnTheScreen();
  });

  it('does not badge the Community alerts card when all are read', async () => {
    mockList.mockResolvedValue({
      ok: true,
      value: [{ ...alert, read: true }],
      warnings: [],
    });
    await renderAlerts();

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(
      screen.queryByLabelText('Unread alerts'),
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
    const first = await renderAlerts();

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
    await renderAlerts();
    await waitFor(() => expect(mockEventList).toHaveBeenCalled());

    expect(screen.queryByLabelText('Unread events')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Incomplete surveys')).not.toBeOnTheScreen();
    expect(
      screen.queryByLabelText('Votes awaiting your ballot'),
    ).not.toBeOnTheScreen();
  });

  it('searches titles and sorts alerts from either date direction', async () => {
    const older = {
      ...alert,
      id: 'alert-older',
      title: 'Food pantry reminder',
      createdAt: new Date('2025-04-01T12:00:00.000Z'),
      read: true,
    };
    const newer = {
      ...alert,
      id: 'alert-newer',
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
    await renderAlerts();
    await user.press(
      screen.getByRole('button', { name: 'Open Alerts' }),
    );

    const alertButtons = () =>
      screen
        .getAllByRole('button')
        .filter(({ props }) =>
          String(props.accessibilityLabel).includes('alert:'),
        );
    expect(
      alertButtons().map(({ props }) => props.accessibilityLabel),
    ).toEqual([
      'Unread alert: Volunteer workday',
      'Read alert: Food pantry reminder',
    ]);
    expect(
      screen
        .getAllByRole('button')
        .map(({ props }) => String(props.accessibilityLabel))
        .filter(
          (label) => label.startsWith('Sort alerts') || label.startsWith('Filter alerts'),
        ),
    ).toEqual([
      'Sort alerts. Current: Most recent',
      'Filter alerts. Current: All alerts',
    ]);

    await user.press(
      screen.getByRole('button', {
        name: 'Sort alerts. Current: Most recent',
      }),
    );
    await user.press(screen.getByRole('button', { name: 'Least recent' }));
    expect(
      alertButtons().map(({ props }) => props.accessibilityLabel),
    ).toEqual([
      'Read alert: Food pantry reminder',
      'Unread alert: Volunteer workday',
    ]);

    await user.type(
      screen.getByLabelText('Search alerts by title'),
      'pantry',
    );
    expect(screen.getByText('Food pantry reminder')).toBeOnTheScreen();
    expect(screen.queryByText('Volunteer workday')).not.toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Search alerts by title'));
    await user.type(
      screen.getByLabelText('Search alerts by title'),
      'missing',
    );
    expect(screen.getByText('No matching alerts')).toBeOnTheScreen();
  });

  it('filters alerts by unread and read status', async () => {
    const readAlert = {
      ...alert,
      id: 'alert-read',
      title: 'Food pantry reminder',
      read: true,
    };
    const unreadAlert = {
      ...alert,
      id: 'alert-unread',
      title: 'Volunteer workday',
      read: false,
    };
    mockList.mockResolvedValue({
      ok: true,
      value: [unreadAlert, readAlert],
      warnings: [],
    });
    const user = userEvent.setup();
    await renderAlerts();
    await user.press(screen.getByRole('button', { name: 'Open Alerts' }));

    await user.press(
      screen.getByRole('button', {
        name: 'Filter alerts. Current: All alerts',
      }),
    );
    await user.press(screen.getByRole('button', { name: 'Unread' }));
    expect(screen.getByText('Volunteer workday')).toBeOnTheScreen();
    expect(screen.queryByText('Food pantry reminder')).not.toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Filter alerts. Current: Unread' }),
    );
    await user.press(screen.getByRole('button', { name: 'Read' }));
    expect(screen.queryByText('Volunteer workday')).not.toBeOnTheScreen();
    expect(screen.getByText('Food pantry reminder')).toBeOnTheScreen();
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
    await renderAlerts();

    expect(screen.getByText('Community')).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'Open Alerts' }),
    );
    expect(
      screen.getByRole('progressbar', { name: 'Loading alerts' }),
    ).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'Create alert' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/community/alerts/new');
    finish?.({ ok: true, value: [], warnings: [] });
    expect(await screen.findByText('No alerts yet')).toBeOnTheScreen();
  });

  it('groups events, surveys, and chat under the same Community tab', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockSection = 'events';
    const user = userEvent.setup();
    const eventsView = await renderAlerts();
    expect(await screen.findByText('No upcoming events')).toBeOnTheScreen();
    expect(screen.getByTestId('events-list')).toHaveProp(
      'contentContainerStyle',
      expect.objectContaining({ flexGrow: 1, justifyContent: 'center' }),
    );
    await user.press(screen.getByRole('button', { name: 'Past Events' }));
    expect(screen.getByText('No past events')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Create event' }));
    expect(mockPush).toHaveBeenCalledWith('/community/events/new');
    await eventsView.unmount();

    mockSection = 'surveys';
    const surveyView = await renderAlerts();
    expect(screen.queryByText('Survey privacy')).not.toBeOnTheScreen();
    expect(screen.getByText('No open surveys')).toBeOnTheScreen();
    expect(screen.getByTestId('surveys-list')).toHaveProp(
      'contentContainerStyle',
      expect.objectContaining({ flexGrow: 1, justifyContent: 'center' }),
    );
    await surveyView.unmount();

    mockSection = 'chat';
    const chatView = await renderAlerts();
    expect(screen.getByText('Club chat')).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Create chat' }),
    ).not.toBeOnTheScreen();
    await chatView.unmount();

    mockSection = 'votes';
    await renderAlerts();
    expect(await screen.findByText('No active votes')).toBeOnTheScreen();
    expect(screen.getByTestId('votes-list')).toHaveProp(
      'contentContainerStyle',
      expect.objectContaining({ flexGrow: 1, justifyContent: 'center' }),
    );
    expect(screen.getByRole('button', { name: 'Past Votes' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Past Votes' }));
    expect(screen.getByText('No past votes')).toBeOnTheScreen();
    expect(screen.queryByText('One member, one vote')).not.toBeOnTheScreen();
  });

  it('shows the configured donation page and reserves editing for the President', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockRole = Role.Member;
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
    await renderAlerts();

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
    expect(screen.getByTestId('donation-page-content')).toHaveProp(
      'contentContainerStyle',
      expect.objectContaining({ flexGrow: 1, justifyContent: 'center' }),
    );
    expect(screen.queryByLabelText('Community sections')).not.toBeOnTheScreen();

    mockRole = Role.President;
    await screen.rerender(
      <AppThemeProvider colorScheme="light">
        <Community />
      </AppThemeProvider>,
    );
    expect(
      screen.getByRole('button', { name: 'Edit donation page' }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('donation-page-manage-action')).toBeOnTheScreen();
  });

  it('shows a club-specific empty state and a President-only create action', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockRole = Role.President;
    const user = userEvent.setup();
    await renderAlerts();

    await user.press(screen.getByRole('button', { name: 'Open Donate' }));
    expect(
      screen.getByText('Your members cannot donate yet'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Set up your club donation page so members have a way to contribute.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('donation-page-empty')).toHaveStyle({
      flex: 1,
      justifyContent: 'center',
    });

    await user.press(
      screen.getByRole('button', { name: 'Set up donations' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/community/donations/manage');
  });

  it('does not show the donation setup action to non-President officers', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockRole = Role.Officer;
    mockSection = 'donate';
    await renderAlerts();

    expect(
      await screen.findByText('Campus Cats has not set up donations'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Create donation page' }),
    ).not.toBeOnTheScreen();
  });
});
