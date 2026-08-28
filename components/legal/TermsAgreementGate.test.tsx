import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import { TermsAgreementGate } from './TermsAgreementGate';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderGate = async (onAgree: () => Promise<void> = async () => undefined) =>
  render(
    <AppThemeProvider colorScheme="light">
      <TermsAgreementGate visible onAgree={onAgree} />
    </AppThemeProvider>,
  );

describe('TermsAgreementGate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires agreement while providing both legal documents', async () => {
    const agree = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    await renderGate(agree);

    expect(screen.getByText('Review and accept')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'View Terms of Service' }));
    expect(screen.getByText('Terms of Service')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Back to agreement' }));
    await user.press(screen.getByRole('button', { name: 'View Privacy Policy' }));
    expect(screen.getByText('Privacy Policy')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Back to agreement' }));
    await user.press(screen.getByRole('button', { name: 'I agree' }));

    expect(agree).toHaveBeenCalledTimes(1);
  });

  it('stays actionable and explains when agreement cannot be recorded', async () => {
    const user = userEvent.setup();
    await renderGate(async () => {
      throw new Error('Could not record your agreement. Please try again.');
    });

    await user.press(screen.getByRole('button', { name: 'I agree' }));

    expect(
      await screen.findByText('Could not record your agreement. Please try again.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'I agree' })).toBeEnabled();
  });
});
