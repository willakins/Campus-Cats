import React from 'react';
import { Linking, Platform } from 'react-native';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import ClubBilling from '../../app/(app)/settings/club-billing';
import { Role } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

let mockRole: Role = Role.President;
let mockAccess: Record<string, unknown>;
const mockBack = jest.fn();
const mockSummary = jest.fn();
const mockPay = jest.fn();
const mockSetCollectionMethod = jest.fn();

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useRouter: () => ({ back: mockBack }),
    useFocusEffect: (callback: () => void) =>
      mockReact.useEffect(callback, [callback]),
  };
});

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: {
      id: 'president-1',
      email: 'president@example.com',
      role: mockRole,
      clubId: 'campus-cats',
      platformAdmin: false,
    },
  }),
  useClub: () => ({ access: mockAccess, loading: false }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    clubBilling: {
      summary: (...args: unknown[]) => mockSummary(...args),
      payOutstandingInvoice: (...args: unknown[]) => mockPay(...args),
      setCollectionMethod: (...args: unknown[]) =>
        mockSetCollectionMethod(...args),
      createSetupSession: jest.fn(),
      createPortalSession: jest.fn(),
      updateBillingEmail: jest.fn(),
      scheduleCancellation: jest.fn(),
      resumeSubscription: jest.fn(),
    },
  },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderRoute = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <ClubBilling />
    </AppThemeProvider>,
  );

describe('club billing route', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.President;
    mockAccess = {
      clubId: 'campus-cats',
      clubName: 'Campus Cats',
      timezone: 'America/New_York',
      billingEnforcementEnabled: true,
      maintenanceMode: false,
      accessState: 'enabled',
      paymentStanding: 'past_due',
      collectionMethod: 'manual',
      graceEndsAt: '2026-09-01T04:00:00.000Z',
    };
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    mockSummary.mockResolvedValue({
      ok: true,
      warnings: [],
      value: {
        clubId: 'campus-cats',
        clubName: 'Campus Cats',
        timezone: 'America/New_York',
        billingEnforcementEnabled: true,
        maintenanceMode: false,
        accessState: 'enabled',
        paymentStanding: 'past_due',
        collectionMethod: 'manual',
        invoiceDueAt: '2026-08-02T03:59:59.999Z',
        graceEndsAt: '2026-09-01T04:00:00.000Z',
        billingEmail: 'billing@example.com',
        currency: 'usd',
        outstandingBalance: 1250,
        activityUnitPriceLabel: '$0.01 per activity unit',
        mediaMegabytePriceLabel: '$0.02 per MB',
        currentUsage: {
          activityUnits: 42,
          mediaBytes: 2_500_000,
          periodStartsAt: '2026-08-01T04:00:00.000Z',
          periodEndsAt: '2026-09-01T04:00:00.000Z',
        },
        invoices: [
          {
            id: 'in_1',
            number: 'CC-001',
            status: 'open',
            currency: 'usd',
            amountDue: 1250,
            amountPaid: 0,
            createdAt: '2026-08-01T04:00:00.000Z',
            hostedInvoiceUrl: 'https://billing.example/invoice',
          },
        ],
      },
    });
    mockPay.mockResolvedValue({
      ok: true,
      warnings: [],
      value: { url: 'https://billing.example/invoice' },
    });
    mockSetCollectionMethod.mockResolvedValue({
      ok: true,
      warnings: [],
      value: { url: 'https://billing.example/setup' },
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

  it('renders President status, usage, balance, invoices, and payment controls', async () => {
    await renderRoute();

    expect(await screen.findByText('Lapsed')).toBeOnTheScreen();
    expect(screen.getAllByText('$12.50')).toHaveLength(2);
    expect(screen.getByText(/42 · \$0.01 per activity unit/)).toBeOnTheScreen();
    expect(screen.getByText(/3 MB · \$0.02 per MB/)).toBeOnTheScreen();
    expect(screen.getByText('CC-001')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Pay Outstanding Invoice' }),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Billing contact email')).toBeOnTheScreen();
  });

  it('opens Stripe-hosted invoice payment from the accessible action', async () => {
    const user = userEvent.setup();
    await renderRoute();
    await user.press(
      await screen.findByRole('button', { name: 'Pay Outstanding Invoice' }),
    );
    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://billing.example/invoice',
      ),
    );
  });

  it('denies non-Presidents and never loads monetary data', async () => {
    mockRole = Role.Officer;
    await renderRoute();
    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(mockSummary).not.toHaveBeenCalled();
  });

  it('shows read-only mobile status and warnings without purchasing actions', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    await renderRoute();
    expect(screen.getByText('Lapsed')).toBeOnTheScreen();
    expect(screen.getByText('Campus Cats')).toBeOnTheScreen();
    expect(screen.getByText(/latest balance is unpaid/)).toBeOnTheScreen();
    expect(
      screen.getByText(/Club billing is read-only in the mobile app/),
    ).toBeOnTheScreen();
    expect(mockSummary).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Pay Outstanding Invoice' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Set Up Automatic Payments' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Switch to Manual Invoices' }),
    ).not.toBeOnTheScreen();
  });
});
