import React from 'react';
import { Alert } from 'react-native';

import { act, render, screen, userEvent } from '@testing-library/react-native';

import {
  Role,
  parseManagedUser,
  parseWhitelistApplication,
} from '../../core/domain';
import { AppThemeProvider } from '../../theme';
import { UserItem } from './UserItem';
import { WhitelistItem } from './WhitelistItem';

const mockPromote = jest.fn();
const mockDemote = jest.fn();
const mockRemove = jest.fn();
const mockTransferPresidency = jest.fn();
const mockAddDisciplinaryNotice = jest.fn();
const mockSetBanned = jest.fn();
const mockAccept = jest.fn();
const mockDeny = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../composition/appModules', () => ({
  appModules: {
    users: {
      promote: (...args: unknown[]) => mockPromote(...args),
      demote: (...args: unknown[]) => mockDemote(...args),
      remove: (...args: unknown[]) => mockRemove(...args),
      transferPresidency: (...args: unknown[]) => mockTransferPresidency(...args),
      addDisciplinaryNotice: (...args: unknown[]) => mockAddDisciplinaryNotice(...args),
      setBanned: (...args: unknown[]) => mockSetBanned(...args),
    },
    whitelist: {
      accept: (...args: unknown[]) => mockAccept(...args),
      deny: (...args: unknown[]) => mockDeny(...args),
    },
  },
}));

const administrator = parseManagedUser({
  id: 'super-admin-1',
  email: 'officer@gatech.edu',
  role: Role.VicePresident,
});
const officer = parseManagedUser({
  id: 'officer-1',
  email: 'officer-only@gatech.edu',
  role: Role.Officer,
});
const president = parseManagedUser({
  id: 'president-1',
  email: 'president@gatech.edu',
  role: Role.President,
});
const developer = parseManagedUser({
  id: 'developer-1',
  email: 'developer@gatech.edu',
  role: Role.Developer,
});
const member = parseManagedUser({
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

const renderThemed = async (content: React.ReactElement) =>
  await render(<AppThemeProvider colorScheme="light">{content}</AppThemeProvider>);

describe('administration cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockPromote.mockResolvedValue({ ok: true, value: member, warnings: [] });
    mockDemote.mockResolvedValue({ ok: true, value: member, warnings: [] });
    mockRemove.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockTransferPresidency.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockAddDisciplinaryNotice.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockSetBanned.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockAccept.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockDeny.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
  });

  it('shows readable roles and confirms an explicit promotion', async () => {
    const onChanged = jest.fn();
    const user = userEvent.setup();
    await renderThemed(<UserItem actor={administrator} user={member} onChanged={onChanged} />);

    expect(screen.getByText('Member')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Promote to Officer' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Promote to Officer',
      'Promote member@gatech.edu to Officer?',
      expect.any(Array),
    );

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => buttons?.find(({ text }: { text: string }) =>
      text === 'Promote to Officer')?.onPress?.());
    expect(mockPromote).toHaveBeenCalledWith(administrator, 'member-1');
    expect(onChanged).toHaveBeenCalled();
  });

  it('hides management actions for equal-role users', async () => {
    const peer = parseManagedUser({ id: 'peer', email: 'peer@gatech.edu', role: Role.VicePresident });
    await renderThemed(<UserItem actor={administrator} user={peer} onChanged={jest.fn()} />);

    expect(screen.queryByRole('button', { name: /^Promote to / })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Demote to / })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remove User' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Add Discipline Notice' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ban User' })).not.toBeOnTheScreen();
  });

  it('uses a separate irreversible action to appoint the first President', async () => {
    const vicePresident = parseManagedUser({
      id: 'super-2',
      email: 'super@gatech.edu',
      role: Role.VicePresident,
    });
    const user = userEvent.setup();
    await renderThemed(
      <UserItem
        actor={developer}
        user={vicePresident}
        hasPresident={false}
        onChanged={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /^Promote to / })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Crown New President' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Crown New President',
      'super@gatech.edu will become President. This creates the first President. Afterward, only that President can transfer the presidency.',
      expect.any(Array),
    );
  });

  it('warns that transferring the presidency demotes the current President', async () => {
    const vicePresident = parseManagedUser({
      id: 'vice-1',
      email: 'vice@gatech.edu',
      role: Role.VicePresident,
    });
    const onTransferred = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <UserItem
        actor={president}
        user={vicePresident}
        hasPresident
        onChanged={jest.fn()}
        onPresidencyTransferred={onTransferred}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Crown New President' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Crown New President',
      expect.stringContaining('You will immediately become an Officer'),
      expect.any(Array),
    );
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => buttons?.find(({ text }: { text: string }) =>
      text === 'Crown New President')?.onPress?.());
    expect(mockTransferPresidency).toHaveBeenCalledWith(
      president,
      'vice-1',
      true,
    );
    expect(onTransferred).toHaveBeenCalled();
  });

  it('does not show promotion or demotion controls to officers', async () => {
    await renderThemed(
      <UserItem actor={officer} user={member} onChanged={jest.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /^Promote to / })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Demote to / })).not.toBeOnTheScreen();
  });

  it('lets vice-presidents change officer status but not vice-president status', async () => {
    await renderThemed(
      <UserItem actor={administrator} user={officer} onChanged={jest.fn()} />,
    );
    expect(screen.queryByRole('button', { name: 'Promote to Vice-President' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Demote to Member' })).toBeOnTheScreen();
  });

  it('lets presidents promote officers to vice-president', async () => {
    await renderThemed(
      <UserItem actor={president} user={officer} onChanged={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Promote to Vice-President' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Demote to Member' })).toBeOnTheScreen();
  });

  it('lets power-role users record a disciplinary notice for a member', async () => {
    const onChanged = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <UserItem actor={officer} user={member} onChanged={onChanged} />,
    );

    await user.press(screen.getByRole('button', { name: 'Add Discipline Notice' }));
    await user.type(
      screen.getByLabelText('Disciplinary notice'),
      'Posted an inappropriate image',
    );
    await user.press(screen.getByRole('button', { name: 'Save Discipline Notice' }));

    expect(mockAddDisciplinaryNotice).toHaveBeenCalledWith(
      officer,
      'member-1',
      'Posted an inappropriate image',
    );
    expect(onChanged).toHaveBeenCalled();
  });

  it('confirms bans and renders disciplinary history with an unban action', async () => {
    const onChanged = jest.fn();
    const user = userEvent.setup();
    const bannedMember = parseManagedUser({
      ...member,
      banned: true,
      disciplinaryNotices: [
        {
          id: 'notice-1',
          message: 'Posted an inappropriate image',
          createdAt: new Date('2026-08-05T12:00:00.000Z'),
          issuedById: officer.id,
          issuedByEmail: officer.email,
        },
      ],
    });
    await renderThemed(
      <UserItem actor={officer} user={bannedMember} onChanged={onChanged} />,
    );

    expect(screen.getByText('Banned')).toBeOnTheScreen();
    expect(screen.getByText('1 disciplinary notice')).toBeOnTheScreen();
    expect(screen.getByText('Posted an inappropriate image')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Unban User' }));
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => buttons?.find(({ text }: { text: string }) =>
      text === 'Unban User')?.onPress?.());

    expect(mockSetBanned).toHaveBeenCalledWith(officer, 'member-1', false);
    expect(onChanged).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^Promote to / })).not.toBeOnTheScreen();
  });

  it('requires confirmation before banning a member', async () => {
    const onChanged = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <UserItem actor={officer} user={member} onChanged={onChanged} />,
    );

    await user.press(screen.getByRole('button', { name: 'Ban User' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Ban User',
      expect.stringContaining('unable to log in until a power-role user unbans them'),
      expect.any(Array),
    );
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => buttons?.find(({ text }: { text: string }) =>
      text === 'Ban User')?.onPress?.());

    expect(mockSetBanned).toHaveBeenCalledWith(officer, 'member-1', true);
    expect(onChanged).toHaveBeenCalled();
  });

  it('does not expose discipline or ban controls to members', async () => {
    const otherMember = parseManagedUser({
      id: 'member-2',
      email: 'other-member@gatech.edu',
      role: Role.Member,
    });
    await renderThemed(
      <UserItem actor={otherMember} user={member} onChanged={jest.fn()} />,
    );

    expect(screen.queryByRole('button', { name: 'Add Discipline Notice' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ban User' })).not.toBeOnTheScreen();
  });

  it('confirms whitelist acceptance and exposes application context', async () => {
    const onChanged = jest.fn();
    const setBusy = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
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
