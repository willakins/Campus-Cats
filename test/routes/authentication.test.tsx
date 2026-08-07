import React from 'react';

import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import LoginScreen from '../../app/(auth)/login';
import CreateAccount from '../../app/(auth)/create-account';
import ForgotPassword from '../../app/(auth)/forgot-password';
import SamlSignIn from '../../app/(auth)/saml-sign-in';
import Whitelist from '../../app/(auth)/whitelist';
import type { UniversitySearchResult } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockRedirect = jest.fn();
const mockLogin = jest.fn();
const mockCreateAccount = jest.fn();
const mockSamlSignIn = jest.fn();
const mockRequestPasswordReset = jest.fn();
const mockSubmitWhitelist = jest.fn();
const mockRegisterPushToken = jest.fn();
const mockRequestPushToken = jest.fn();
const mockClearUniversity = jest.fn();

const mockGeorgiaTech: UniversitySearchResult = {
  id: '139755',
  name: 'Georgia Institute of Technology-Main Campus',
  city: 'Atlanta',
  state: 'GA',
  emailDomains: ['gatech.edu'],
  timezone: 'America/New_York',
  status: 'mapped',
  club: {
    id: 'campus-cats',
    name: 'Campus Cats',
    emailEnabled: true,
    saml: { provider: 'gt-sso', label: 'Georgia Tech SSO' },
  },
};
let mockSelectedUniversity: UniversitySearchResult = mockGeorgiaTech;

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate, replace: mockReplace, back: mockBack }),
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    login: (...args: unknown[]) => mockLogin(...args),
    createAccount: (...args: unknown[]) => mockCreateAccount(...args),
    samlSignIn: (...args: unknown[]) => mockSamlSignIn(...args),
    requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
  }),
  useUniversitySelection: () => ({
    university: mockSelectedUniversity,
    clearUniversity: (...args: unknown[]) => mockClearUniversity(...args),
  }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    session: { registerPushToken: (...args: unknown[]) => mockRegisterPushToken(...args) },
    whitelist: { submit: (...args: unknown[]) => mockSubmitWhitelist(...args) },
  },
}));

jest.mock('../../utils/notifications', () => ({
  registerForPushNotificationsAsync: (...args: unknown[]) => mockRequestPushToken(...args),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderThemed = async (content: React.ReactElement) =>
  await render(<AppThemeProvider colorScheme="light">{content}</AppThemeProvider>);

describe('authentication routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedUniversity = mockGeorgiaTech;
    mockLogin.mockResolvedValue({ id: 'member-1' });
    mockCreateAccount.mockResolvedValue({ id: 'member-1' });
    mockSamlSignIn.mockResolvedValue({ status: 'cancelled' });
    mockRequestPasswordReset.mockResolvedValue(undefined);
    mockSubmitWhitelist.mockResolvedValue({ ok: true, value: {}, warnings: [] });
    mockRequestPushToken.mockResolvedValue(null);
    mockRegisterPushToken.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockClearUniversity.mockResolvedValue(undefined);
  });

  it('presents SSO first and completes email sign-in with busy-state protection', async () => {
    let finishLogin: (() => void) | undefined;
    mockLogin.mockImplementation(
      () => new Promise<void>((resolve) => { finishLogin = resolve; }),
    );
    const user = userEvent.setup();
    await renderThemed(<LoginScreen />);

    expect(screen.getByRole('button', { name: 'Sign in with Georgia Tech SSO' })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'student@gatech.edu');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'catscats');
    await user.press(screen.getByRole('button', { name: 'Sign in with email' }));

    expect(screen.getByRole('button', { name: 'Sign in with email' })).toBeDisabled();
    expect(screen.getByText('Signing in…')).toBeOnTheScreen();
    finishLogin?.();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)/(tabs)'));
    expect(mockLogin).toHaveBeenCalledWith('student@gatech.edu', 'catscats');
  });

  it('brands a newly provisioned club without offering Georgia Tech SSO', async () => {
    mockSelectedUniversity = {
      id: '139658',
      name: 'Emory University',
      city: 'Atlanta',
      state: 'GA',
      emailDomains: ['emory.edu'],
      timezone: 'America/New_York',
      status: 'mapped',
      club: {
        id: 'club-139658',
        name: 'Emory Campus Cats',
        emailEnabled: true,
      },
    };

    await renderThemed(<LoginScreen />);

    expect(screen.getByText('Welcome to Emory Campus Cats')).toBeOnTheScreen();
    expect(screen.getByText(/Emory University/)).toBeOnTheScreen();
    expect(screen.queryByText(/SSO/)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sign in with email' })).toBeEnabled();
  });

  it('shows email failures inline and keeps secondary routes available', async () => {
    mockLogin.mockRejectedValue(new Error('Check your email and password.'));
    const user = userEvent.setup();
    await renderThemed(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'student@gatech.edu');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'incorrect');
    await user.press(screen.getByRole('button', { name: 'Sign in with email' }));
    expect(await screen.findByRole('alert', { name: 'Check your email and password.' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Apply for community access' }));
    expect(mockNavigate).toHaveBeenCalledWith('/whitelist');
  });

  it('opens the dedicated password-reset route without submitting the login form', async () => {
    const user = userEvent.setup();
    await renderThemed(<LoginScreen />);

    await user.press(screen.getByRole('button', { name: 'Forgot password?' }));

    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('sends password-reset instructions from an email-only screen', async () => {
    let finishReset: (() => void) | undefined;
    mockRequestPasswordReset.mockImplementation(
      () => new Promise<void>((resolve) => { finishReset = resolve; }),
    );
    const user = userEvent.setup();
    await renderThemed(<ForgotPassword />);

    expect(screen.queryByLabelText('Password')).not.toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'member@example.com');
    await user.press(screen.getByRole('button', { name: 'Send reset link' }));

    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeDisabled();
    expect(screen.getByText('Sending reset link…')).toBeOnTheScreen();
    expect(mockRequestPasswordReset).toHaveBeenCalledWith('member@example.com');

    finishReset?.();
    expect(await screen.findByRole('alert', {
      name: 'If an account exists for that email, password-reset instructions are on the way.',
    })).toBeOnTheScreen();
  });

  it('shows password-reset validation failures inline', async () => {
    mockRequestPasswordReset.mockRejectedValue(
      new Error('Enter the email address for your account.'),
    );
    const user = userEvent.setup();
    await renderThemed(<ForgotPassword />);

    await user.press(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('alert', {
      name: 'Enter the email address for your account.',
    })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeEnabled();
  });

  it('keeps SAML cancellation recoverable and allows a successful retry', async () => {
    const user = userEvent.setup();
    await renderThemed(<SamlSignIn />);

    expect(await screen.findByText('Sign-in was cancelled. You can try again.')).toBeOnTheScreen();
    mockSamlSignIn.mockResolvedValue({ status: 'authenticated', user: { id: 'member-1' } });
    await user.press(screen.getByRole('button', { name: 'Retry Georgia Tech SSO' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)/(tabs)'));
    expect(mockSamlSignIn).toHaveBeenCalledTimes(2);
  });

  it('shows SAML connection failures inline', async () => {
    mockSamlSignIn.mockRejectedValue(new Error('You appear to be offline.'));
    await renderThemed(<SamlSignIn />);

    expect(await screen.findByRole('alert', { name: 'You appear to be offline.' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retry Georgia Tech SSO' })).toBeEnabled();
  });

  it('blocks the SAML route when the selected club does not advertise SSO', async () => {
    mockSelectedUniversity = {
      ...mockGeorgiaTech,
      club: {
        id: 'club-139658',
        name: 'Emory Campus Cats',
        emailEnabled: true,
      },
    };

    await renderThemed(<SamlSignIn />);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
    expect(mockSamlSignIn).not.toHaveBeenCalled();
  });

  it('protects whitelist submission and presents validation failures inline', async () => {
    mockSubmitWhitelist.mockResolvedValue({
      ok: false,
      error: { code: 'validation', message: 'Name, graduation year, and a valid email are required' },
    });
    const user = userEvent.setup();
    await renderThemed(<Whitelist />);

    await user.press(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByRole('alert', {
      name: 'Name, graduation year, and a valid email are required',
    })).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('keeps the approved-account creation route functional', async () => {
    const user = userEvent.setup();
    await renderThemed(<CreateAccount />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'alumni@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'catscats');
    await user.press(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledWith('alumni@example.com', 'catscats');
      expect(mockReplace).toHaveBeenCalledWith('/(app)/(tabs)');
    });
  });
});
