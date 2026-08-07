import React from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import UniversitySearchScreen from '../../app/university-search';
import ClubSetupScreen from '../../app/club-setup';
import ClubSetupPendingScreen from '../../app/club-setup/pending';
import ClubSetupVerificationScreen from '../../app/club-setup/verify';
import { AppThemeProvider } from '../../theme';

const mockReplace = jest.fn();
const mockSearch = jest.fn();
const mockRequestSetup = jest.fn();
const mockSelectUniversity = jest.fn();
const mockClearUniversity = jest.fn();
const mockRefreshUniversity = jest.fn();
const mockVerifySetup = jest.fn();
let mockSearchParameters: Record<string, string | undefined> = {};

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
  useRouter: () => ({ replace: mockReplace, navigate: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockSearchParameters,
}));

jest.mock('../../providers', () => ({
  useUniversitySelection: () => ({
    university: mockEmory,
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
    mockSearch.mockResolvedValue({ ok: true, value: [mockEmory], warnings: [] });
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
          club: { id: 'club-139658', name: 'Emory Campus Cats', emailEnabled: true },
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

  it('searches after the debounce and requires selecting a returned university', async () => {
    await renderScreen(<UniversitySearchScreen />);

    await fireEvent.changeText(screen.getByLabelText('University'), 'Emory');
    expect(mockSearch).not.toHaveBeenCalled();
    await waitFor(() => expect(mockSearch).toHaveBeenCalledWith('Emory'), {
      timeout: 1000,
    });
    expect(await screen.findByText('Emory University')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Select Emory University' }));
    await waitFor(() => expect(mockSelectUniversity).toHaveBeenCalledWith(mockEmory));
    expect(mockReplace).toHaveBeenCalledWith('/club-setup');
  });

  it('ignores an older search response after the query changes', async () => {
    const oldResult = {
      ...mockEmory,
      id: '100000',
      name: 'Old University Result',
    };
    let resolveOld: ((value: unknown) => void) | undefined;
    let resolveCurrent: ((value: unknown) => void) | undefined;
    mockSearch.mockImplementation((query: string) => new Promise((resolve) => {
      if (query === 'Em') resolveOld = resolve;
      else resolveCurrent = resolve;
    }));
    await renderScreen(<UniversitySearchScreen />);

    await fireEvent.changeText(screen.getByLabelText('University'), 'Em');
    await waitFor(() => expect(mockSearch).toHaveBeenCalledWith('Em'));
    await fireEvent.changeText(screen.getByLabelText('University'), 'Emory');
    await waitFor(() => expect(mockSearch).toHaveBeenCalledWith('Emory'));

    await act(async () => resolveCurrent?.({
      ok: true,
      value: [mockEmory],
      warnings: [],
    }));
    expect(await screen.findByText('Emory University')).toBeOnTheScreen();

    await act(async () => resolveOld?.({
      ok: true,
      value: [oldResult],
      warnings: [],
    }));
    expect(screen.queryByText('Old University Result')).not.toBeOnTheScreen();
    expect(screen.getByText('Emory University')).toBeOnTheScreen();
  });

  it('collects custom colors and President details while leaving SSO disabled', async () => {
    await renderScreen(<ClubSetupScreen />);

    expect(
      screen.getByRole('button', { name: 'Single sign-on · Coming soon' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Light theme preview')).toBeOnTheScreen();
    expect(screen.getByLabelText('Dark theme preview')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Primary color'), '#012169');
    await fireEvent.changeText(screen.getByLabelText('Accent color'), '#F2A900');
    await fireEvent.changeText(
      screen.getByLabelText('Your school email'),
      'president@emory.edu',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Email President for verification' }),
    );

    await waitFor(() => expect(mockRequestSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        universityId: '139658',
        presidentChoice: 'self',
        presidentEmail: 'president@emory.edu',
        primaryColor: '#012169',
        accentColor: '#F2A900',
      }),
    ));
    expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({
      pathname: '/club-setup/pending',
    }));
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

    await waitFor(() => expect(mockRequestSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        presidentChoice: 'other',
        presidentEmail: 'nominee@dept.emory.edu',
      }),
    ));
  });

  it('discovers a completed mapping when the pending screen is refreshed', async () => {
    mockSearchParameters = { maskedEmail: 'p***@emory.edu' };
    mockRefreshUniversity.mockResolvedValue({
      ...mockEmory,
      status: 'mapped',
      club: { id: 'club-139658', name: 'Emory Campus Cats', emailEnabled: true },
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

    expect(await screen.findByRole('alert', {
      name: 'This verification link has expired',
    })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Choose a university' })).toBeEnabled();
    expect(mockReplace).not.toHaveBeenCalledWith('/login');
  });
});
