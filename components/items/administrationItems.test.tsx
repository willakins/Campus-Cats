import React from 'react';
import { Alert } from 'react-native';

import { act, render, screen, userEvent } from '@testing-library/react-native';

import { Role, parseUser, parseWhitelistApplication } from '../../core/domain';
import { AppThemeProvider } from '../../theme';
import { UserItem } from './UserItem';
import { WhitelistItem } from './WhitelistItem';

const mockPromote = jest.fn();
const mockDemote = jest.fn();
const mockRemove = jest.fn();
const mockAccept = jest.fn();
const mockDeny = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../composition/appModules', () => ({
  appModules: {
    users: {
      promote: (...args: unknown[]) => mockPromote(...args),
      demote: (...args: unknown[]) => mockDemote(...args),
      remove: (...args: unknown[]) => mockRemove(...args),
    },
    whitelist: {
      accept: (...args: unknown[]) => mockAccept(...args),
      deny: (...args: unknown[]) => mockDeny(...args),
    },
  },
}));

const administrator = parseUser({
  id: 'super-admin-1',
  email: 'officer@gatech.edu',
  role: Role.SuperAdmin,
});
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const application = parseWhitelistApplication({
  id: 'application-1',
  name: 'Alex Catfan',
  email: 'alex@gatech.edu',
  graduationYear: '2028',
  codeWord: 'Goldie',
});

const renderThemed = (content: React.ReactElement) =>
  render(<AppThemeProvider colorScheme="light">{content}</AppThemeProvider>);

describe('administration cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPromote.mockResolvedValue({ ok: true, value: member, warnings: [] });
    mockDemote.mockResolvedValue({ ok: true, value: member, warnings: [] });
    mockRemove.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockAccept.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockDeny.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
  });

  it('shows readable roles and confirms an explicit promotion', async () => {
    const onChanged = jest.fn();
    const user = userEvent.setup();
    renderThemed(<UserItem actor={administrator} user={member} onChanged={onChanged} />);

    expect(screen.getByText('Member')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Promote User' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Promote User',
      'Promote member@gatech.edu to Administrator?',
      expect.any(Array),
    );

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => buttons?.find(({ text }: { text: string }) => text === 'Promote')?.onPress?.());
    expect(mockPromote).toHaveBeenCalledWith(administrator, 'member-1');
    expect(onChanged).toHaveBeenCalled();
  });

  it('hides management actions for equal-role users', () => {
    const peer = parseUser({ id: 'peer', email: 'peer@gatech.edu', role: Role.SuperAdmin });
    renderThemed(<UserItem actor={administrator} user={peer} onChanged={jest.fn()} />);

    expect(screen.queryByRole('button', { name: 'Promote User' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Demote User' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remove User' })).not.toBeOnTheScreen();
  });

  it('confirms whitelist acceptance and exposes application context', async () => {
    const onChanged = jest.fn();
    const setBusy = jest.fn();
    const user = userEvent.setup();
    renderThemed(
      <WhitelistItem
        actor={administrator}
        application={application}
        onChanged={onChanged}
        setBusy={setBusy}
      />,
    );

    expect(screen.getByText('alex@gatech.edu')).toBeOnTheScreen();
    expect(screen.getByText('Graduation year: 2028')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Accept Application' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Accept Application',
      'Approve Alex Catfan and create their account?',
      expect.any(Array),
    );

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => buttons?.find(({ text }: { text: string }) => text === 'Accept')?.onPress?.());
    expect(setBusy).toHaveBeenNthCalledWith(1, true);
    expect(setBusy).toHaveBeenLastCalledWith(false);
    expect(mockAccept).toHaveBeenCalledWith(administrator, 'application-1');
    expect(onChanged).toHaveBeenCalled();
  });
});
