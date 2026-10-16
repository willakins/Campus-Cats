import React from 'react';
import { Linking } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';
import SafetyReportScreen from '../../app/safety/report';
import SafetyInboxScreen from '../../app/safety/inbox';
import { AppThemeProvider } from '../../theme';

const mockSubmit = jest.fn();
const mockList = jest.fn();
const mockPush = jest.fn();
let mockCurrentUser:
  { id: string; email: string; platformAdmin: boolean } | undefined;
jest.mock('../../composition/appModules', () => ({
  appModules: {
    safetyReports: {
      newRequestId: () => 'request-one',
      submit: (...args: unknown[]) => mockSubmit(...args),
      list: (...args: unknown[]) => mockList(...args),
    },
  },
}));
jest.mock('../../presentation/providers', () => ({
  useAuth: () => ({ currentUser: mockCurrentUser }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => false,
  }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
const themed = (content: React.ReactElement) => (
  <AppThemeProvider colorScheme="light">{content}</AppThemeProvider>
);

describe('safety reporting routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = {
      id: 'member-1',
      email: 'member@example.test',
      platformAdmin: false,
    };
    mockSubmit.mockReset().mockResolvedValue({ id: 'receipt-one' });
    mockList.mockReset().mockResolvedValue({ reports: [], nextCursor: null });
  });

  it('shows confirmation only after persistence and retries the same submission after a network failure', async () => {
    mockSubmit.mockRejectedValueOnce({ code: 'functions/unavailable' });
    const user = userEvent.setup();
    await render(themed(<SafetyReportScreen />));
    await fireEvent.changeText(
      screen.getByLabelText('What happened?'),
      'Please review a safety concern.',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Content or account reference (optional)'),
      'Chat, Monday morning',
    );
    await user.press(
      screen.getByRole('button', { name: 'Send safety report' }),
    );
    expect(screen.queryByText('Reference: receipt-one')).toBeNull();
    expect(
      screen.getByDisplayValue('Please review a safety concern.'),
    ).toBeTruthy();
    await user.press(
      screen.getByRole('button', { name: 'Send safety report' }),
    );
    expect(mockSubmit.mock.calls[0][0]).toEqual(mockSubmit.mock.calls[1][0]);
    expect(screen.getByText('Reference: receipt-one')).toBeTruthy();
    expect(screen.queryByLabelText('What happened?')).toBeNull();
  });

  it('keeps the email address usable when signed out and no mail app is installed', async () => {
    mockCurrentUser = undefined;
    const open = jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValueOnce(new Error('No mail app'));
    const user = userEvent.setup();
    await render(themed(<SafetyReportScreen />));
    expect(screen.queryByLabelText('What happened?')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Email safety team' }));
    expect(screen.getByText(/An email app could not be opened/)).toBeTruthy();
    expect(mockSubmit).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('does not show an old receipt after the account changes during submission', async () => {
    let finish!: (value: { id: string }) => void;
    mockSubmit.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    const view = await render(themed(<SafetyReportScreen />));
    await fireEvent.changeText(
      screen.getByLabelText('What happened?'),
      'A private concern',
    );
    await user.press(
      screen.getByRole('button', { name: 'Send safety report' }),
    );
    mockCurrentUser = {
      id: 'member-2',
      email: 'other@example.test',
      platformAdmin: false,
    };
    await view.rerender(themed(<SafetyReportScreen />));
    await act(async () => {
      finish({ id: 'previous-account-receipt' });
    });
    expect(screen.queryByText(/previous-account-receipt/)).toBeNull();
    expect(screen.queryByDisplayValue('A private concern')).toBeNull();
  });

  it('does not request the inbox for an ordinary member and clears it after administrator access is lost', async () => {
    const view = await render(themed(<SafetyInboxScreen />));
    expect(mockList).not.toHaveBeenCalled();
    mockCurrentUser = { ...mockCurrentUser!, platformAdmin: true };
    await view.rerender(themed(<SafetyInboxScreen />));
    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith({ status: 'open' }),
    );
    mockCurrentUser = { ...mockCurrentUser, platformAdmin: false };
    await view.rerender(themed(<SafetyInboxScreen />));
    expect(screen.queryByText('Safety inbox')).toBeNull();
    expect(
      screen.getByText(
        'Only designated platform administrators may review safety reports.',
      ),
    ).toBeTruthy();
  });
});
