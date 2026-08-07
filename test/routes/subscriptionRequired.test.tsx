import React from 'react';
import { Linking, Platform } from 'react-native';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import SubscriptionRequired from '../../app/subscription-required';
import { ClubAccess, Role, parseClubAccess } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

let mockRole: Role = Role.Member;
let mockAccess: ClubAccess;
const mockReplace = jest.fn();
const mockSignOut = jest.fn();
const mockPay = jest.fn();
const mockSetup = jest.fn();
const mockSetCollectionMethod = jest.fn();

jest.mock('expo-router', () => ({
  Redirect: () => null,
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('../../providers', () => ({
  useAuth: () => {
    const currentUser = {
      id: 'actor-1',
      email: 'actor@example.com',
      role: mockRole,
      clubId: 'campus-cats',
      platformAdmin: false,
    };
    return { currentUser, user: currentUser, signOut: mockSignOut };
  },
  useClub: () => ({ access: mockAccess, loading: false, error: undefined }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    clubBilling: {
      payOutstandingInvoice: (...args: unknown[]) => mockPay(...args),
      createSetupSession: (...args: unknown[]) => mockSetup(...args),
      setCollectionMethod: (...args: unknown[]) =>
        mockSetCollectionMethod(...args),
    },
  },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const access = (overrides: Partial<ClubAccess> = {}) =>
  parseClubAccess({
    clubId: 'campus-cats',
    clubName: 'Campus Cats',
    timezone: 'America/New_York',
    billingEnforcementEnabled: true,
    maintenanceMode: false,
    accessState: 'suspended',
    paymentStanding: 'past_due',
    collectionMethod: 'manual',
    suspensionReason: 'nonpayment',
    ...overrides,
  });

const renderScreen = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <SubscriptionRequired />
    </AppThemeProvider>,
  );

describe('subscription-required route', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Member;
    mockAccess = access();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    mockPay.mockResolvedValue({
      ok: true,
      value: { url: 'https://billing.example/invoice' },
      warnings: [],
    });
    mockSetup.mockResolvedValue({
      ok: true,
      value: { url: 'https://billing.example/setup' },
      warnings: [],
    });
    mockSetCollectionMethod.mockResolvedValue({
      ok: true,
      value: undefined,
      warnings: [],
    });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    });
    jest.restoreAllMocks();
  });

  it('shows the required nonpayment message without payment controls to members', async () => {
    await renderScreen();
    expect(
      screen.getByText(
        'Your club has not paid for this app. Please contact them to let them know.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText(/willakins23@gmail.com/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Pay to Re-enable' })).not.toBeOnTheScreen();
  });

  it('lets a web President open the outstanding Stripe invoice', async () => {
    mockRole = Role.President;
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByRole('button', { name: 'Pay to Re-enable' }));
    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://billing.example/invoice',
      ),
    );
  });

  it('shows status but no purchasing action on native apps', async () => {
    mockRole = Role.President;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    await renderScreen();
    expect(
      screen.getByText(
        'Billing status is read-only in the mobile app.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Pay to Re-enable' })).not.toBeOnTheScreen();
  });
});
