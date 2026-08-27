import React from 'react';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import CreateCommunityVote from '../../app/(app)/votes/create-vote';
import ViewCommunityVote from '../../app/(app)/votes/view-vote';
import {
  CommunityVote,
  Role,
  parseCommunityVote,
  parseUser,
} from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockCreate = jest.fn();
const mockCreateAnnouncement = jest.fn();
const mockGet = jest.fn();
const mockHasNomination = jest.fn();
const mockHasBallot = jest.fn();
const mockChoices = jest.fn();
const mockNominate = jest.fn();
const mockVote = jest.fn();
const mockResults = jest.fn();
let mockRole: Role = Role.Member;

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
    useLocalSearchParams: () => ({ id: 'vote-1' }),
    useRouter: () => ({ back: mockBack, replace: mockReplace, push: mockPush }),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    announcements: {
      create: (...args: unknown[]) => mockCreateAnnouncement(...args),
    },
    communityVoting: {
      create: (...args: unknown[]) => mockCreate(...args),
      get: (...args: unknown[]) => mockGet(...args),
      hasSubmittedNomination: (...args: unknown[]) => mockHasNomination(...args),
      hasSubmittedBallot: (...args: unknown[]) => mockHasBallot(...args),
      choices: (...args: unknown[]) => mockChoices(...args),
      submitNomination: (...args: unknown[]) => mockNominate(...args),
      submitBallot: (...args: unknown[]) => mockVote(...args),
      results: (...args: unknown[]) => mockResults(...args),
    },
    imageSelection: {
      takePhoto: jest.fn(),
      pickFromLibrary: jest.fn(),
    },
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'actor-1', email: 'actor@gatech.edu', role: mockRole },
  }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const president = parseUser({
  id: 'president-1',
  email: 'president@gatech.edu',
  role: Role.President,
});

const election = (
  phase: 'nominations' | 'voting' | 'closed',
  participationAudience: CommunityVote['participationAudience'] = 'all_members',
): CommunityVote => {
  const times = {
    nominations: {
      votingStartsAt: new Date('2096-08-10T12:00:00.000Z'),
      votingEndsAt: new Date('2096-08-17T12:00:00.000Z'),
    },
    voting: {
      votingStartsAt: new Date('2020-08-01T12:00:00.000Z'),
      votingEndsAt: new Date('2096-08-17T12:00:00.000Z'),
    },
    closed: {
      votingStartsAt: new Date('2020-08-01T12:00:00.000Z'),
      votingEndsAt: new Date('2020-08-05T12:00:00.000Z'),
    },
  }[phase];
  return parseCommunityVote({
    id: 'vote-1',
    kind: 'presidential_election',
    title: 'Club president election',
    details: 'Choose the next president.',
    participationAudience,
    options: [],
    createdAt: new Date('2020-07-20T12:00:00.000Z'),
    createdBy: president,
    nominationEndsAt: times.votingStartsAt,
    ...times,
  });
};

const renderCreate = async () =>
  render(
    <AppThemeProvider colorScheme="light">
      <CreateCommunityVote />
    </AppThemeProvider>,
  );

const renderView = async () =>
  render(
    <AppThemeProvider colorScheme="light">
      <ViewCommunityVote />
    </AppThemeProvider>,
  );

describe('community voting routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Member;
    mockHasNomination.mockResolvedValue({ ok: true, value: false, warnings: [] });
    mockHasBallot.mockResolvedValue({ ok: true, value: false, warnings: [] });
    mockNominate.mockResolvedValue({ ok: true, value: {}, warnings: [] });
    mockVote.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockCreateAnnouncement.mockResolvedValue({
      ok: true,
      value: {},
      warnings: [],
    });
  });

  it('optionally announces a newly created vote', async () => {
    mockRole = Role.Officer;
    mockCreate.mockResolvedValue({
      ok: true,
      value: { id: 'vote-1', title: 'Choose our new logo' },
      warnings: [],
    });
    const user = userEvent.setup();
    await renderCreate();

    const announcementOption = screen.getByRole('checkbox', {
      name: 'Create an announcement for this vote',
    });
    expect(announcementOption.props.accessibilityState).toEqual({
      checked: false,
    });

    await user.press(announcementOption);
    await user.press(
      screen.getByRole('button', { name: 'Officers only' }),
    );
    await user.type(screen.getByLabelText('Title'), 'Choose our new logo');
    await user.type(screen.getByLabelText('Option 1 label'), 'Blue');
    await user.type(screen.getByLabelText('Option 2 label'), 'Gold');
    await user.press(screen.getByRole('button', { name: 'Open Contest Voting' }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-1' }),
        expect.objectContaining({ participationAudience: 'officers_only' }),
      ),
    );
    await waitFor(() =>
      expect(mockCreateAnnouncement).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-1' }),
        {
          title: 'Choose our new logo',
          info: 'A new vote is open. Visit Community and choose Votes to cast your vote.',
          authorAlias: '',
          photos: [],
        },
      ),
    );
  });

  it.each([Role.President, Role.Developer])(
    'lets President-level role %s configure both election rounds within one form',
    async (role) => {
    mockRole = role;
    mockCreate.mockResolvedValue({
      ok: true,
      value: { id: 'election-1' },
      warnings: [],
    });
    const user = userEvent.setup();
    await renderCreate();

    expect(screen.queryByText('Private ballots')).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'President election' }));
    await user.type(screen.getByLabelText('Title'), '2026 election');
    await user.clear(screen.getByLabelText('Nomination days'));
    await user.type(screen.getByLabelText('Nomination days'), '14');
    await user.clear(screen.getByLabelText('Voting days'));
    await user.type(screen.getByLabelText('Voting days'), '10');
    await user.press(screen.getByRole('button', { name: 'Start Election' }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ role }),
        expect.objectContaining({
          kind: 'presidential_election',
          nominationDays: 14,
          votingDays: 10,
        }),
      ),
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/votes/view-vote',
      params: { id: 'election-1' },
    });
    expect(mockCreateAnnouncement).not.toHaveBeenCalled();
    },
  );

  it('offers self-nomination or abstention once during round one', async () => {
    mockGet.mockResolvedValue({ ok: true, value: election('nominations'), warnings: [] });
    const user = userEvent.setup();
    await renderView();

    expect(await screen.findByText('Round one: nominations')).toBeOnTheScreen();
    expect(screen.getByText(/Nominations close/)).toBeOnTheScreen();
    expect(screen.queryByText(/Voting closes/)).not.toBeOnTheScreen();
    await user.type(
      screen.getByLabelText('Campaign pitch'),
      'I will publish reliable volunteer schedules.',
    );
    await user.press(screen.getByRole('button', { name: 'Nominate Myself' }));

    await waitFor(() =>
      expect(mockNominate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-1' }),
        'vote-1',
        'nominate',
        'I will publish reliable volunteer schedules.',
      ),
    );
    expect(await screen.findByText('You are now a nominee for club president.')).toBeOnTheScreen();
  });

  it('submits one selected nominee in the voting round', async () => {
    mockGet.mockResolvedValue({ ok: true, value: election('voting'), warnings: [] });
    mockChoices.mockResolvedValue({
      ok: true,
      value: [
        {
          id: 'candidate-1',
          label: 'Alex',
          pitch: 'I will expand feeding-station coverage.',
          profileUserId: 'candidate-1',
        },
        {
          id: 'candidate-2',
          label: 'Jordan',
          profileUserId: 'candidate-2',
        },
      ],
      warnings: [],
    });
    const user = userEvent.setup();
    await renderView();

    expect(await screen.findByText(/Voting closes/)).toBeOnTheScreen();
    expect(screen.queryByText(/Nominations close/)).not.toBeOnTheScreen();
    expect(
      screen.getByText('I will expand feeding-station coverage.'),
    ).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: "View Alex's profile" }),
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/profile/view-profile',
      params: { id: 'candidate-1' },
    });
    await user.press(await screen.findByRole('button', { name: 'Choose Alex' }));
    await user.press(screen.getByRole('button', { name: 'Submit Vote' }));

    await waitFor(() =>
      expect(mockVote).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-1' }),
        'vote-1',
        'candidate-1',
      ),
    );
    expect(await screen.findByText('Your private ballot has been recorded.')).toBeOnTheScreen();
  });

  it('shows final aggregate results after voting closes', async () => {
    mockGet.mockResolvedValue({ ok: true, value: election('closed'), warnings: [] });
    mockResults.mockResolvedValue({
      ok: true,
      value: {
        totalVotes: 3,
        options: [
          { id: 'candidate-1', label: 'Alex', votes: 2 },
          { id: 'candidate-2', label: 'Jordan', votes: 1 },
        ],
      },
      warnings: [],
    });
    await renderView();

    expect(await screen.findByText('Final results')).toBeOnTheScreen();
    expect(screen.getByText('67% of ballots')).toBeOnTheScreen();
    expect(screen.getByText('33% of ballots')).toBeOnTheScreen();
  });

  it('shows officer-only voting to members without ballot controls', async () => {
    mockGet.mockResolvedValue({
      ok: true,
      value: election('voting', 'officers_only'),
      warnings: [],
    });
    await renderView();

    expect(
      await screen.findByText('Officer participation only'),
    ).toBeOnTheScreen();
    expect(mockHasBallot).not.toHaveBeenCalled();
    expect(mockChoices).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Submit Vote' })).not.toBeOnTheScreen();
  });
});
