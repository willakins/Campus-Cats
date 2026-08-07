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
const mockCreate = jest.fn();
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
    useRouter: () => ({ back: mockBack, replace: mockReplace }),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
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

const election = (phase: 'nominations' | 'voting' | 'closed'): CommunityVote => {
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
  });

  it('lets the President configure both election rounds within one form', async () => {
    mockRole = Role.President;
    mockCreate.mockResolvedValue({
      ok: true,
      value: { id: 'election-1' },
      warnings: [],
    });
    const user = userEvent.setup();
    await renderCreate();

    await user.press(screen.getByRole('button', { name: 'President election' }));
    await user.type(screen.getByLabelText('Title'), '2026 election');
    await user.clear(screen.getByLabelText('Nomination days'));
    await user.type(screen.getByLabelText('Nomination days'), '14');
    await user.clear(screen.getByLabelText('Voting days'));
    await user.type(screen.getByLabelText('Voting days'), '10');
    await user.press(screen.getByRole('button', { name: 'Start Election' }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.President }),
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
  });

  it('offers self-nomination or abstention once during round one', async () => {
    mockGet.mockResolvedValue({ ok: true, value: election('nominations'), warnings: [] });
    const user = userEvent.setup();
    await renderView();

    expect(await screen.findByText('Round one: nominations')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Nominate Myself' }));

    await waitFor(() =>
      expect(mockNominate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-1' }),
        'vote-1',
        'nominate',
      ),
    );
    expect(await screen.findByText('You are now a nominee for club president.')).toBeOnTheScreen();
  });

  it('submits one selected nominee in the voting round', async () => {
    mockGet.mockResolvedValue({ ok: true, value: election('voting'), warnings: [] });
    mockChoices.mockResolvedValue({
      ok: true,
      value: [
        { id: 'candidate-1', label: 'Alex' },
        { id: 'candidate-2', label: 'Jordan' },
      ],
      warnings: [],
    });
    const user = userEvent.setup();
    await renderView();

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
});
