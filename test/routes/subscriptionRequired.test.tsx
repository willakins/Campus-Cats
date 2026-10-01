import React from 'react';
import { Linking, Platform } from 'react-native';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import SubscriptionRequired from '../../app/subscription-required';
import { ClubAccess, Role, parseClubAccess } from '../../core/domain';
import { PLATFORM_INFO } from '../../config/platformInfo';
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

jest.mock('../../presentation/providers', () => ({
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

  it('tells members their club subscription ended without showing President controls', async () => {
    await renderScreen();
    expect(
      screen.getByText("Your club's subscription has ended."),
    ).toBeOnTheScreen();
    expect(screen.getByText('Subscription ended')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Ask your club President to renew it. Access will return automatically once the subscription is active.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Club logo')).not.toBeOnTheScreen();
    expect(screen.queryByText('Renew your club subscription')).not.toBeOnTheScreen();
    expect(
      screen.queryByLabelText('Explain president-level access'),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Renew Subscription' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(`For questions, contact ${PLATFORM_INFO.supportEmail}.`),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('Need help?')).not.toBeOnTheScreen();
  });

  it('opens the centralized support email address', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByRole('button', { name: 'Email Support' }));

    expect(Linking.openURL).toHaveBeenCalledWith(
      `mailto:${PLATFORM_INFO.supportEmail}`,
    );
  });

  it('gives a web President a dedicated subscription renewal view', async () => {
    mockRole = Role.President;
    const user = userEvent.setup();
    await renderScreen();
    expect(screen.getByText('Renew your club subscription')).toBeOnTheScreen();
    expect(
      screen.getByText('Renew now to restore access for everyone in your club.'),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Club logo')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Renew Subscription' }));
    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://billing.example/invoice',
      ),
    );
  });

  it('requires a card for the President to start the first 30-day trial', async () => {
    mockRole = Role.President;
    mockAccess = access({
      accessState: 'pending_setup',
      paymentStanding: 'current',
      suspensionReason: undefined,
    });

    await renderScreen();

    expect(
      screen.getByRole('button', { name: 'Start 30-Day Free Trial' }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Use Monthly Invoices' }),
    ).not.toBeOnTheScreen();
  });

  it('tells members to ask their President when setup is still pending', async () => {
    mockAccess = access({
      accessState: 'pending_setup',
      paymentStanding: 'current',
      suspensionReason: undefined,
    });

    await renderScreen();

    expect(screen.getByText('Your club needs a subscription')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Ask your club President to start it. Access will open automatically once setup is complete.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByLabelText('Explain president-level access'),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Start 30-Day Free Trial' }),
    ).not.toBeOnTheScreen();
  });

  it('opens Stripe-hosted renewal directly from native apps', async () => {
    mockRole = Role.Developer;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const user = userEvent.setup();
    await renderScreen();

    expect(
      screen.queryByText(/completed securely on the web/),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Renew on Web' }),
    ).not.toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Renew Subscription' }),
    );

    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://billing.example/invoice',
      ),
    );
  });

  it('renews cancelled subscriptions with one automatic-payment action', async () => {
    mockRole = Role.President;
    mockAccess = access({
      accessState: 'suspended',
      paymentStanding: 'current',
      collectionMethod: 'manual',
      suspensionReason: 'cancellation',
    });
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const user = userEvent.setup();
    await renderScreen();

    expect(
      screen.queryByRole('button', { name: 'Use Monthly Invoices' }),
    ).not.toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'Renew Subscription' }),
    );

    await waitFor(() =>
      expect(mockSetCollectionMethod).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.President }),
        'automatic',
        `${PLATFORM_INFO.webAppOrigin}/subscription-required`,
      ),
    );
  });

  it('uses the hosted app as the Stripe return destination from native apps', async () => {
    mockRole = Role.President;
    mockAccess = access({
      accessState: 'pending_setup',
      paymentStanding: 'current',
      suspensionReason: undefined,
    });
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const user = userEvent.setup();
    await renderScreen();

    await user.press(
      screen.getByRole('button', { name: 'Start 30-Day Free Trial' }),
    );

    await waitFor(() =>
      expect(mockSetup).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.President }),
        `${PLATFORM_INFO.webAppOrigin}/subscription-required`,
      ),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://billing.example/setup',
    );
  });
});
