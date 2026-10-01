import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import PrivacyScreen from '../../app/legal/privacy';
import TermsScreen from '../../app/legal/terms';
import { AppThemeProvider } from '../../theme';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = false;
let mockReturnTo = '/settings';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ returnTo: mockReturnTo }),
  useRouter: () => ({
    back: mockBack,
    canGoBack: () => mockCanGoBack,
    replace: mockReplace,
  }),
}));

const renderThemed = async (content: React.ReactElement) =>
  await render(
    <AppThemeProvider colorScheme="light">{content}</AppThemeProvider>,
  );

describe('legal document routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = false;
    mockReturnTo = '/settings';
  });

  it.each([
    ['Privacy Policy', <PrivacyScreen key="privacy" />],
    ['Terms of Service', <TermsScreen key="terms" />],
  ])('returns to the previous page from %s', async (_title, screenContent) => {
    const user = userEvent.setup();
    await renderThemed(screenContent);

    await user.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockReplace).toHaveBeenCalledWith('/settings');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('returns to the originating profile page instead of unrelated stack history', async () => {
    mockCanGoBack = true;
    const user = userEvent.setup();
    await renderThemed(<PrivacyScreen />);

    await user.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockReplace).toHaveBeenCalledWith('/settings');
    expect(mockBack).not.toHaveBeenCalled();
  });
});
