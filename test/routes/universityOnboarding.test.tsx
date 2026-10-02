import React from 'react';
import { Keyboard, StyleSheet } from 'react-native';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import WelcomeScreen from '../../app/welcome';
import UniversitySearchScreen from '../../app/university-search';
import ClubSetupScreen from '../../app/club-setup';
import ClubSetupPendingScreen from '../../app/club-setup/pending';
import ClubSetupVerificationScreen from '../../app/club-setup/verify';
import { AppThemeProvider } from '../../theme';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSearch = jest.fn();
const mockRequestSetup = jest.fn();
const mockSelectUniversity = jest.fn();
const mockClearUniversity = jest.fn();
const mockRefreshUniversity = jest.fn();
const mockVerifySetup = jest.fn();
const mockRememberUniversitySearch = jest.fn(
  (query: string, results: readonly (typeof mockEmory)[]) => {
    mockUniversitySearchQuery = query;
    mockUniversitySearchResults = results;
  },
);
let mockSearchParameters: Record<string, string | undefined> = {};
let mockUniversitySearchQuery = '';
let mockUniversitySearchResults: readonly (typeof mockEmory)[] = [];

const mockEmory = {
  id: '139658',
  name: 'Emory University',
  city: 'Atlanta',
  state: 'GA',
  emailDomains: ['emory.edu'],
  timezone: 'America/New_York',
  status: 'unclaimed' as const,
};

jest.mock('expo-router', () => ({
  Redirect: () => null,
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    navigate: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => mockSearchParameters,
}));

jest.mock('../../presentation/providers', () => ({
  useUniversitySelection: () => ({
    university: mockEmory,
    universitySearch: {
      query: mockUniversitySearchQuery,
      results: mockUniversitySearchResults,
    },
    rememberUniversitySearch: mockRememberUniversitySearch,
    selectUniversity: (...args: unknown[]) => mockSelectUniversity(...args),
    clearUniversity: (...args: unknown[]) => mockClearUniversity(...args),
    refreshUniversity: (...args: unknown[]) => mockRefreshUniversity(...args),
    verifySetup: (...args: unknown[]) => mockVerifySetup(...args),
  }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    universityOnboarding: {
      search: (...args: unknown[]) => mockSearch(...args),
      requestSetup: (...args: unknown[]) => mockRequestSetup(...args),
    },
  },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderScreen = async (screenElement: React.ReactElement) =>
  await render(
    <AppThemeProvider colorScheme="light">{screenElement}</AppThemeProvider>,
  );

describe('university onboarding routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockSearchParameters = {};
    mockUniversitySearchQuery = '';
    mockUniversitySearchResults = [];
    mockSearch.mockResolvedValue({
      ok: true,
      value: [mockEmory],
      warnings: [],
    });
    mockSelectUniversity.mockResolvedValue({
      ok: true,
      value: { universityId: mockEmory.id, universityName: mockEmory.name },
      warnings: [],
    });
    mockClearUniversity.mockResolvedValue(undefined);
    mockRefreshUniversity.mockResolvedValue(mockEmory);
    mockVerifySetup.mockResolvedValue({
      ok: true,
      value: {
        university: {
          ...mockEmory,
          status: 'mapped',
          club: {
            id: 'club-139658',
            name: 'Emory Campus Cats',
            emailEnabled: true,
          },
        },
        passwordSetupSent: true,
      },
      warnings: [],
    });
    mockRequestSetup.mockResolvedValue({
      ok: true,
      value: {
        requestId: 'request-1',
        universityId: mockEmory.id,
        maskedEmail: 'p***@emory.edu',
        expiresAt: '2026-08-08T12:00:00.000Z',
      },
      warnings: [],
    });
  });

  it('introduces Campus Cats and opens university search', async () => {
    await renderScreen(<WelcomeScreen />);

    expect(screen.getByText('Welcome to Campus Cats')).toBeOnTheScreen();
    expect(screen.getByText('Care together')).toBeOnTheScreen();
    fireEvent.press(
      screen.getByRole('button', { name: 'Find your university' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/university-search');
  });

  it('returns from university search to welcome without requiring history', async () => {
    await renderScreen(<UniversitySearchScreen />);

    fireEvent.press(screen.getByLabelText('Back to welcome'));
    expect(mockReplace).toHaveBeenCalledWith('/welcome');
  });

  it('adds scroll space after the keyboard opens and removes it when hidden', async () => {
    const listenerSpy = jest.spyOn(Keyboard, 'addListener');
    await renderScreen(<UniversitySearchScreen />);
    const bottomPadding = () =>
      StyleSheet.flatten(
        screen.getByTestId('screen-scroll-view').props.contentContainerStyle,
      ).paddingBottom;
    const initialPadding = bottomPadding();
    const shown = listenerSpy.mock.calls.find(
      ([event]) => event === 'keyboardDidShow',
    )?.[1];
    const hidden = listenerSpy.mock.calls.find(
      ([event]) => event === 'keyboardDidHide',
    )?.[1];

    await act(() => shown?.({ endCoordinates: { height: 300 } } as never));
    expect(bottomPadding()).toBe(initialPadding + 300);
    await act(() => hidden?.({} as never));
    expect(bottomPadding()).toBe(initialPadding);
    listenerSpy.mockRestore();
  });

  it('searches after the debounce and requires selecting a returned university', async () => {
    await renderScreen(<UniversitySearchScreen />);

    expect(screen.getByText('Select your university')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Campus Cats logo')).not.toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('University'), 'Emory');
    expect(mockSearch).not.toHaveBeenCalled();
    await waitFor(() => expect(mockSearch).toHaveBeenCalledWith('Emory'), {
      timeout: 1000,
    });
    expect(await screen.findByText('Emory University')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Select Emory University' }),
    );
    await waitFor(() =>
      expect(mockSelectUniversity).toHaveBeenCalledWith(mockEmory),
    );
    expect(mockPush).toHaveBeenCalledWith('/club-setup');
  });

  it('ignores an older search response after the query changes', async () => {
    const oldResult = {
      ...mockEmory,
      id: '100000',
      name: 'Old University Result',
    };
    let resolveOld: ((value: unknown) => void) | undefined;
    let resolveCurrent: ((value: unknown) => void) | undefined;
    mockSearch.mockImplementation(
      (query: string) =>
        new Promise((resolve) => {
          if (query === 'Em') resolveOld = resolve;
          else resolveCurrent = resolve;
        }),
    );
    await renderScreen(<UniversitySearchScreen />);

    await fireEvent.changeText(screen.getByLabelText('University'), 'Em');
    await waitFor(() => expect(mockSearch).toHaveBeenCalledWith('Em'));
    await fireEvent.changeText(screen.getByLabelText('University'), 'Emory');
    await waitFor(() => expect(mockSearch).toHaveBeenCalledWith('Emory'));

    await act(async () =>
      resolveCurrent?.({
        ok: true,
        value: [mockEmory],
        warnings: [],
      }),
    );
    expect(await screen.findByText('Emory University')).toBeOnTheScreen();

    await act(async () =>
      resolveOld?.({
        ok: true,
        value: [oldResult],
        warnings: [],
      }),
    );
    expect(screen.queryByText('Old University Result')).not.toBeOnTheScreen();
    expect(screen.getByText('Emory University')).toBeOnTheScreen();
  });

  it('restores the query and results when returning to a remounted search screen', async () => {
    const firstRender = await renderScreen(<UniversitySearchScreen />);

    await fireEvent.changeText(screen.getByLabelText('University'), 'Emory');
    expect(await screen.findByText('Emory University')).toBeOnTheScreen();
    await waitFor(() =>
      expect(mockRememberUniversitySearch).toHaveBeenLastCalledWith('Emory', [
        mockEmory,
      ]),
    );
    await act(async () => firstRender.unmount());

    await renderScreen(<UniversitySearchScreen />);

    expect(screen.getByLabelText('University')).toHaveProp('value', 'Emory');
    expect(screen.getByText('Emory University')).toBeOnTheScreen();
  });

  it('collects custom colors and President details while leaving SSO disabled', async () => {
    await renderScreen(<ClubSetupScreen />);

    expect(
      screen.getByRole('button', { name: 'Single sign-on · Coming soon' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Light theme preview')).toBeOnTheScreen();
    expect(screen.getByLabelText('Dark theme preview')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Campus Cats logo')).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Change university' }),
    ).not.toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Primary color' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Custom primary color'),
      '#012169',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Accent color' }));
    await fireEvent.changeText(
      screen.getByLabelText('Custom accent color'),
      '#F2A900',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await fireEvent.changeText(
      screen.getByLabelText('Your school email'),
      'president@emory.edu',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Email President for verification' }),
    );

    await waitFor(() =>
      expect(mockRequestSetup).toHaveBeenCalledWith(
        expect.objectContaining({
          universityId: '139658',
          presidentChoice: 'self',
          presidentEmail: 'president@emory.edu',
          primaryColor: '#012169',
          accentColor: '#F2A900',
        }),
      ),
    );
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/club-setup/pending',
      }),
    );
  });

  it('can nominate someone else as President using an approved school email', async () => {
    await renderScreen(<ClubSetupScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Someone else' }));
    await fireEvent.changeText(
      screen.getByLabelText("President's school email"),
      'nominee@dept.emory.edu',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Email President for verification' }),
    );

    await waitFor(() =>
      expect(mockRequestSetup).toHaveBeenCalledWith(
        expect.objectContaining({
          presidentChoice: 'other',
          presidentEmail: 'nominee@dept.emory.edu',
        }),
      ),
    );
  });

  it('discovers a completed mapping when the pending screen is refreshed', async () => {
    mockSearchParameters = { maskedEmail: 'p***@emory.edu' };
    mockRefreshUniversity.mockResolvedValue({
      ...mockEmory,
      status: 'mapped',
      club: {
        id: 'club-139658',
        name: 'Emory Campus Cats',
        emailEnabled: true,
      },
    });
    await renderScreen(<ClubSetupPendingScreen />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Refresh setup status' }),
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('shows an expired verification link without attempting club login', async () => {
    mockSearchParameters = { requestId: 'request-1', token: 'expired-token' };
    mockVerifySetup.mockResolvedValue({
      ok: false,
      error: {
        code: 'dependency_failure',
        message: 'This verification link has expired',
      },
    });
    await renderScreen(<ClubSetupVerificationScreen />);

    expect(
      await screen.findByRole('alert', {
        name: 'This verification link has expired',
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Choose a university' }),
    ).toBeEnabled();
    expect(mockReplace).not.toHaveBeenCalledWith('/login');
  });
});
