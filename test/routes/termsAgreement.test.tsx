import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import AppLayout from '../../app/(app)/_layout';
import { Role, parseUser } from '../../core/domain';
import { LEGAL_TERMS_VERSION } from '../../legal/policies';
import { AppThemeProvider } from '../../theme';

const mockAcceptTerms = jest.fn();
const mockPush = jest.fn();
let mockCurrentUser = parseUser({
  id: 'member-1',
  email: 'member@example.com',
  role: Role.Member,
});

jest.mock('expo-router', () => {
  const MockText = jest.requireActual('react-native').Text;
  return {
    Redirect: ({ href }: { readonly href: string }) => (
      <MockText>Redirect: {href}</MockText>
    ),
    Stack: () => <MockText>Authenticated home</MockText>,
    useRouter: () => ({ push: mockPush }),
  };
});

jest.mock('../../providers', () => ({
  useAuth: () => ({
    acceptTerms: (...args: unknown[]) => mockAcceptTerms(...args),
    currentUser: mockCurrentUser,
    loading: false,
  }),
  useClub: () => ({
    access: {
      maintenanceMode: false,
      billingEnforcementEnabled: false,
    },
    loading: false,
  }),
}));

jest.mock('../../components/billing', () => ({
  SubscriptionBanner: () => null,
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderLayout = () =>
  render(
    <AppThemeProvider colorScheme="light">
      <AppLayout />
    </AppThemeProvider>,
  );

describe('authenticated terms agreement gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAcceptTerms.mockResolvedValue(undefined);
    mockCurrentUser = parseUser({
      id: 'member-1',
      email: 'member@example.com',
      role: Role.Member,
    });
  });

  it('blocks the authenticated home until the account agrees', async () => {
    const user = userEvent.setup();
    await renderLayout();

    expect(screen.getByText('Authenticated home')).toBeOnTheScreen();
    expect(screen.getByText('Review and accept')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'I agree' }));

    expect(mockAcceptTerms).toHaveBeenCalledTimes(1);
  });

  it('does not show the gate for the current recorded agreement', async () => {
    mockCurrentUser = parseUser({
      id: 'member-1',
      email: 'member@example.com',
      role: Role.Member,
      agreedToTerms: true,
      termsVersion: LEGAL_TERMS_VERSION,
    });

    await renderLayout();

    expect(screen.getByText('Authenticated home')).toBeOnTheScreen();
    expect(screen.queryByText('Review and accept')).not.toBeOnTheScreen();
  });
});
