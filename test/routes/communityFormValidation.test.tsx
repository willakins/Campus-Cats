import React from 'react';

import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import CreateAlert from '../../app/(app)/community/alerts/new';
import CreateEvent from '../../app/(app)/community/events/new';
import CreateSurvey from '../../app/(app)/community/surveys/new';
import { AppThemeProvider } from '../../theme';

const mockCreateAlert = jest.fn();
const mockCreateEvent = jest.fn();
const mockCreateSurvey = jest.fn();
const mockScrollTo = jest.fn();

jest.mock('expo-router', () => ({
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
jest.mock('../../composition/appModules', () => ({
  appModules: {
    alerts: {
      create: (...args: unknown[]) => mockCreateAlert(...args),
    },
    events: { create: (...args: unknown[]) => mockCreateEvent(...args) },
    surveys: { create: (...args: unknown[]) => mockCreateSurvey(...args) },
    imageSelection: {
      takePhoto: jest.fn(),
      pickFromLibrary: jest.fn(),
    },
  },
}));
jest.mock('../../presentation/providers', () => ({
  useAuth: () => ({
    user: { id: 'officer-1', email: 'officer@gatech.edu', role: 1 },
  }),
}));
jest.mock('../../presentation/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'officer-1', email: 'officer@gatech.edu', role: 1 },
  }),
}));

const renderRoute = async (route: React.ReactElement) =>
  await render(
    <AppThemeProvider colorScheme="light">{route}</AppThemeProvider>,
  );

const layout = (y: number) => ({
  nativeEvent: { layout: { x: 0, y, width: 320, height: 48 } },
});

describe('community create form validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAlert.mockResolvedValue({
      ok: true,
      value: {},
      warnings: [],
    });
    mockCreateEvent.mockResolvedValue({
      ok: true,
      value: { id: 'event-1' },
      warnings: [],
    });
    mockCreateSurvey.mockResolvedValue({
      ok: true,
      value: { id: 'survey-1' },
      warnings: [],
    });
  });

  it('uses the header shield to explain officer-only survey creation', async () => {
    const user = userEvent.setup();
    await renderRoute(<CreateSurvey />);

    expect(screen.queryByText('Anonymous response')).not.toBeOnTheScreen();
    expect(screen.queryByText('Officer-only page')).not.toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    );

    expect(screen.getByText('Officer-only page')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Officer-level access is required to create or manage surveys.',
      ),
    ).toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Hide officer-only explanation' }),
    );
    expect(screen.queryByText('Officer-only page')).not.toBeOnTheScreen();
  });

  it('creates one free-response question type instead of short and long answers', async () => {
    const user = userEvent.setup();
    await renderRoute(<CreateSurvey />);

    expect(
      screen.getByRole('button', { name: 'Free response' }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Short answer' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Long answer' }),
    ).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Free response' }));
    await user.press(
      screen.getByRole('button', { name: 'Officers only' }),
    );
    await user.type(screen.getByLabelText('Title'), 'Volunteer feedback');
    await user.type(screen.getByLabelText('Question'), 'What should we know?');
    await user.press(screen.getByRole('button', { name: 'Publish Survey' }));

    await waitFor(() =>
      expect(mockCreateSurvey).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'officer-1' }),
        expect.objectContaining({
          participationAudience: 'officers_only',
          questions: [
            {
              type: 'long_text',
              prompt: 'What should we know?',
              options: [],
            },
          ],
        }),
      ),
    );
    expect(mockCreateAlert).not.toHaveBeenCalled();
  });

  it('optionally announces a newly created survey', async () => {
    mockCreateSurvey.mockResolvedValue({
      ok: true,
      value: { id: 'survey-1', title: 'Volunteer feedback' },
      warnings: [],
    });
    const user = userEvent.setup();
    await renderRoute(<CreateSurvey />);

    const alertOption = screen.getByRole('checkbox', {
      name: 'Create an alert for this survey',
    });
    expect(alertOption.props.accessibilityState).toEqual({
      checked: false,
    });

    await user.press(alertOption);
    await user.press(screen.getByRole('button', { name: 'Free response' }));
    await user.type(screen.getByLabelText('Title'), 'Volunteer feedback');
    await user.type(screen.getByLabelText('Question'), 'What should we know?');
    await user.press(screen.getByRole('button', { name: 'Publish Survey' }));

    await waitFor(() =>
      expect(mockCreateAlert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'officer-1' }),
        {
          title: 'Volunteer feedback',
          info: 'A new survey is open. Visit Community and choose Surveys to participate.',
          authorAlias: '',
          photos: [],
        },
      ),
    );
  });

  it('marks every missing alert field, scrolls to the first, and clears corrections', async () => {
    const user = userEvent.setup();
    await renderRoute(<CreateAlert />);
    await fireEvent(
      screen.getByTestId('form-screen-content'),
      'layout',
      layout(100),
    );
    await fireEvent(
      screen.getByTestId('alert-section-basics'),
      'layout',
      layout(200),
    );
    await fireEvent(
      screen.getByTestId('alert-field-title'),
      'layout',
      layout(30),
    );

    await user.press(
      screen.getByRole('button', { name: 'Create Alert' }),
    );

    expect(
      await screen.findByText('Alert title is required.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Alert description is required.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Title')).toHaveStyle({
      borderColor: '#B23A3A',
    });
    expect(
      screen.getByRole('alert', {
        name: 'Please fill in the missing information.',
      }),
    ).toBeOnTheScreen();
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 318, animated: true });
    expect(mockCreateAlert).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Title'), 'Volunteer day');
    await waitFor(() =>
      expect(
        screen.queryByText('Alert title is required.'),
      ).not.toBeOnTheScreen(),
    );
  });

  it('marks every missing event field and scrolls to the first one', async () => {
    const user = userEvent.setup();
    await renderRoute(<CreateEvent />);
    await fireEvent(
      screen.getByTestId('form-screen-content'),
      'layout',
      layout(100),
    );
    await fireEvent(
      screen.getByTestId('event-section-picture'),
      'layout',
      layout(200),
    );
    await fireEvent(
      screen.getByTestId('event-field-photo'),
      'layout',
      layout(30),
    );

    await user.press(screen.getByRole('button', { name: 'Create Event' }));

    expect(
      await screen.findByText('Event title is required.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('An event picture is required.')).toBeOnTheScreen();
    expect(screen.getByText('Event details are required.')).toBeOnTheScreen();
    expect(screen.getByText('Event location is required.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Add photos' })).toHaveStyle({
      borderColor: '#B23A3A',
      borderWidth: 2,
      borderRadius: 999,
    });
    expect(
      screen.getByRole('alert', {
        name: 'Please fill in the missing information.',
      }),
    ).toBeOnTheScreen();
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 318, animated: true });
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it('marks every missing survey field and scrolls to the survey title', async () => {
    const user = userEvent.setup();
    await renderRoute(<CreateSurvey />);
    await fireEvent(
      screen.getByTestId('form-screen-content'),
      'layout',
      layout(100),
    );
    await fireEvent(
      screen.getByTestId('survey-section-details'),
      'layout',
      layout(200),
    );
    await fireEvent(
      screen.getByTestId('survey-field-title'),
      'layout',
      layout(30),
    );

    await user.press(screen.getByRole('button', { name: 'Publish Survey' }));

    expect(
      await screen.findByText('Survey title is required.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Question 1 is required.')).toBeOnTheScreen();
    expect(screen.getByText('Option 1 is required.')).toBeOnTheScreen();
    expect(screen.getByText('Option 2 is required.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Title')).toHaveStyle({
      borderColor: '#B23A3A',
    });
    expect(
      screen.getByRole('alert', {
        name: 'Please fill in the missing information.',
      }),
    ).toBeOnTheScreen();
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 318, animated: true });
    expect(mockCreateSurvey).not.toHaveBeenCalled();
  });

  it('highlights an empty question list and scrolls to the add-question control', async () => {
    const user = userEvent.setup();
    await renderRoute(<CreateSurvey />);
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Campus input');
    await user.press(screen.getByRole('button', { name: 'Remove question' }));
    await fireEvent(
      screen.getByTestId('form-screen-content'),
      'layout',
      layout(100),
    );
    await fireEvent(
      screen.getByTestId('survey-section-questions'),
      'layout',
      layout(500),
    );
    await fireEvent(
      screen.getByTestId('survey-field-questions'),
      'layout',
      layout(30),
    );

    await user.press(screen.getByRole('button', { name: 'Publish Survey' }));

    expect(
      await screen.findByText('At least one question is required.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Survey questions field')).toHaveStyle({
      borderColor: '#B23A3A',
      borderWidth: 2,
    });
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 618, animated: true });
    expect(mockCreateSurvey).not.toHaveBeenCalled();
  });
});
