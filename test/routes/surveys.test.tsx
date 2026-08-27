import React from 'react';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import RespondToSurvey from '../../app/(app)/surveys/respond';
import { Role, Survey, parseSurvey, parseUser } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockGet = jest.fn();
const mockHasSubmitted = jest.fn();
const mockSubmit = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockRole: Role = Role.Member;

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
    useLocalSearchParams: () => ({ id: 'survey-1' }),
    useRouter: () => ({ push: mockPush, back: mockBack }),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    surveys: {
      get: (...args: unknown[]) => mockGet(...args),
      hasSubmitted: (...args: unknown[]) => mockHasSubmitted(...args),
      submit: (...args: unknown[]) => mockSubmit(...args),
    },
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'member-1', email: 'member@gatech.edu', role: mockRole },
  }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const officer = parseUser({
  id: 'officer-1',
  email: 'officer@gatech.edu',
  role: Role.Officer,
});

const survey = (
  anonymous: boolean,
  status: Survey['status'] = 'open',
  participationAudience: Survey['participationAudience'] = 'all_members',
) =>
  parseSurvey({
    id: 'survey-1',
    title: 'Volunteer interests',
    details: 'Help plan the next activity.',
    anonymous,
    participationAudience,
    status,
    questions: [
      {
        id: 'question-1',
        type: 'single_choice',
        prompt: 'Which activity?',
        options: [
          { id: 'option-1', label: 'Workshop' },
          { id: 'option-2', label: 'Cleanup' },
        ],
      },
      {
        id: 'question-2',
        type: 'long_text',
        prompt: 'Anything else?',
        options: [],
      },
    ],
    createdAt: new Date('2026-08-06T12:00:00.000Z'),
    createdBy: officer,
    ...(status === 'closed'
      ? { closedAt: new Date('2026-08-07T12:00:00.000Z') }
      : {}),
  });

const renderRoute = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <RespondToSurvey />
    </AppThemeProvider>,
  );

describe('survey response route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Member;
    mockHasSubmitted.mockResolvedValue({ ok: true, value: false, warnings: [] });
    mockSubmit.mockResolvedValue({ ok: true, value: {}, warnings: [] });
  });

  it('makes anonymous response handling explicit before and at submission', async () => {
    mockGet.mockResolvedValue({ ok: true, value: survey(true), warnings: [] });
    await renderRoute();

    expect(await screen.findByText('Anonymous response')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Officers can see your answers, but your name and email are not attached. A private receipt only prevents duplicate submissions.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Submit Anonymous Response' }),
    ).toBeOnTheScreen();
  });

  it('makes named response handling explicit and submits typed answers', async () => {
    mockGet.mockResolvedValue({ ok: true, value: survey(false), warnings: [] });
    const user = userEvent.setup();
    await renderRoute();

    expect(await screen.findByText('Response includes your name')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Officers will see your account identity with these answers. You can submit this survey once.',
      ),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'Workshop' }));
    await user.type(screen.getByLabelText('Free response'), 'Weekend mornings');
    await user.press(
      screen.getByRole('button', { name: 'Submit Response With My Name' }),
    );

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'member-1' }),
      'survey-1',
      [
        { questionId: 'question-1', value: 'option-1' },
        { questionId: 'question-2', value: 'Weekend mornings' },
      ],
    ));
    expect(await screen.findByText('Response submitted')).toBeOnTheScreen();
  });

  it('shows closed surveys without a submission action', async () => {
    mockGet.mockResolvedValue({ ok: true, value: survey(true, 'closed'), warnings: [] });
    await renderRoute();

    expect(await screen.findByText('This survey is closed')).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Submit Anonymous Response' }),
    ).not.toBeOnTheScreen();
  });

  it('shows officer-only surveys to members without response controls', async () => {
    mockGet.mockResolvedValue({
      ok: true,
      value: survey(true, 'open', 'officers_only'),
      warnings: [],
    });
    await renderRoute();

    expect(
      await screen.findByText('Officer participation only'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Workshop' })).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Submit Anonymous Response' }),
    ).not.toBeOnTheScreen();
  });
});
