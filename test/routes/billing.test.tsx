import React from 'react';
import { Linking } from 'react-native';

import { render, screen, userEvent } from '@testing-library/react-native';

import Billing from '../../app/(app)/settings/billing';
import { Role } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

let mockRole: Role = Role.Member;
const mockBack = jest.fn();
const mockSummary = jest.fn();

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
    user: { id: 'actor-1', email: 'officer@gatech.edu', role: mockRole },
  }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    billing: {
      summary: (...args: unknown[]) => mockSummary(...args),
      presentation: {
        settingsSubtitle: 'Review monthly Firebase and Google Cloud costs',
        consoleDescription:
          'Firebase and Google Cloud share this project and billing account.',
        consoleLinks: (projectId: string) => [
          {
            label: 'Open Firebase Console',
            url: `https://console.firebase.google.com/project/${encodeURIComponent(projectId)}/overview`,
          },
          {
            label: 'Open Google Cloud Billing',
            url: `https://console.cloud.google.com/billing?project=${encodeURIComponent(projectId)}`,
          },
        ],
        setup: (summary: {
          readonly projectId: string;
          readonly exportProjectId: string;
          readonly datasetId: string;
        }) => ({
          message: 'Connect the cloud billing export.',
          title: 'Connect the billing export',
          steps: [
            'Enable the Standard usage cost export in Google Cloud Billing.',
            `Export it to ${summary.exportProjectId}.${summary.datasetId} in the US location.`,
            'Give the Functions service account BigQuery access.',
          ],
          action: {
            label: 'Set Up Billing Export',
            url: `https://console.cloud.google.com/billing/export?project=${encodeURIComponent(summary.projectId)}`,
          },
        }),
      },
    },
  },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderBilling = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <Billing />
    </AppThemeProvider>,
  );

describe('billing officer route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Member;
    mockSummary.mockResolvedValue({
      ok: true,
      warnings: [],
      value: {
        status: 'ready',
        projectId: 'campuscats-d7a5e',
        exportProjectId: 'campuscats-d7a5e',
        datasetId: 'billing_export',
        generatedAt: '2026-08-05T12:00:00.000Z',
        dataThrough: '2026-08-05T10:00:00.000Z',
        months: [
          {
            month: '2026-08',
            currency: 'USD',
            grossCost: 12.5,
            credits: 10,
            netCost: 2.5,
          },
        ],
      },
    });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('denies members before requesting billing data', async () => {
    await renderBilling();

    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(mockSummary).not.toHaveBeenCalled();
  });

  it('keeps the billing header visible while monthly costs load', async () => {
    mockRole = Role.Officer;
    mockSummary.mockImplementation(() => new Promise(() => undefined));
    await renderBilling();

    expect(screen.getByText('App billing')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading app billing' }),
    ).toBeOnTheScreen();
  });

  it('lists monthly usage, credits, and net cost for officers', async () => {
    mockRole = Role.Officer;
    await renderBilling();

    expect(await screen.findByText('August 2026')).toBeOnTheScreen();
    expect(screen.getAllByText('$2.50')).toHaveLength(2);
    expect(screen.getByText('$12.50')).toBeOnTheScreen();
    expect(screen.getByText('−$10.00')).toBeOnTheScreen();
    expect(screen.getByText('Connected')).toBeOnTheScreen();
  });

  it('hides every Cloud Console link from non-developer officers', async () => {
    mockRole = Role.VicePresident;
    await renderBilling();
    await screen.findByText('Connected');

    expect(screen.queryByText('Cloud consoles')).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Open Firebase Console' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Open Google Cloud Billing' }),
    ).not.toBeOnTheScreen();
  });

  it('links developers to both project consoles', async () => {
    mockRole = Role.Developer;
    const user = userEvent.setup();
    await renderBilling();
    await screen.findByText('Connected');

    await user.press(
      screen.getByRole('button', { name: 'Open Firebase Console' }),
    );
    await user.press(
      screen.getByRole('button', { name: 'Open Google Cloud Billing' }),
    );

    expect(Linking.openURL).toHaveBeenNthCalledWith(
      1,
      'https://console.firebase.google.com/project/campuscats-d7a5e/overview',
    );
    expect(Linking.openURL).toHaveBeenNthCalledWith(
      2,
      'https://console.cloud.google.com/billing?project=campuscats-d7a5e',
    );
  });

  it('explains how to connect a missing billing export', async () => {
    mockRole = Role.Officer;
    mockSummary.mockResolvedValue({
      ok: true,
      warnings: [],
      value: {
        status: 'setup-required',
        projectId: 'campuscats-d7a5e',
        exportProjectId: 'campuscats-d7a5e',
        datasetId: 'billing_export',
        generatedAt: '2026-08-05T12:00:00.000Z',
        reason: 'export-not-configured',
      },
    });
    await renderBilling();

    expect(
      await screen.findByText('Connect the billing export'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/campuscats-d7a5e.billing_export/),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Set Up Billing Export' }),
    ).not.toBeOnTheScreen();
  });

  it('shows the billing export setup link only to developers', async () => {
    mockRole = Role.Developer;
    mockSummary.mockResolvedValue({
      ok: true,
      warnings: [],
      value: {
        status: 'setup-required',
        projectId: 'campuscats-d7a5e',
        exportProjectId: 'campuscats-d7a5e',
        datasetId: 'billing_export',
        generatedAt: '2026-08-05T12:00:00.000Z',
        reason: 'export-not-configured',
      },
    });
    await renderBilling();

    expect(
      await screen.findByRole('button', { name: 'Set Up Billing Export' }),
    ).toBeOnTheScreen();
  });
});
