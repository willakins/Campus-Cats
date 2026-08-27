import {
  Role,
  parseChatMessage,
  parseUser,
} from '../../core/domain';
import { InMemoryChatGateway } from './InMemoryChatGateway';

const member = parseUser({
  id: 'member-1',
  email: 'member@example.com',
  role: Role.Member,
});
const officer = parseUser({
  id: 'officer-1',
  email: 'officer@example.com',
  role: Role.Officer,
});

describe('InMemoryChatGateway', () => {
  it('finds the nearest active earlier day and toggles one reaction per user', async () => {
    const gateway = new InMemoryChatGateway({ users: [member, officer] });
    gateway.seedMessage(
      parseChatMessage({
        id: 'old-message',
        body: 'Earlier',
        createdById: member.id,
        createdAt: new Date('2026-08-24T12:00:00.000Z'),
        dayKey: '2026-08-24',
        isClubPing: false,
      }),
    );
    expect(await gateway.findPreviousActiveDay(member, '2026-08-27')).toBe('2026-08-24');

    let latestReaction = '';
    gateway.observeDay(member, '2026-08-24', (day) => {
      latestReaction = day.reactions[0]?.emoji ?? '';
    }, () => undefined);
    await gateway.setReaction(member, {
      messageId: 'old-message',
      messageDayKey: '2026-08-24',
      emoji: '👍',
    });
    expect(latestReaction).toBe('👍');
    await gateway.setReaction(member, {
      messageId: 'old-message',
      messageDayKey: '2026-08-24',
      emoji: '❤️',
    });
    expect(latestReaction).toBe('❤️');
    await gateway.setReaction(member, {
      messageId: 'old-message',
      messageDayKey: '2026-08-24',
      emoji: '❤️',
    });
    expect(latestReaction).toBe('');
  });

  it('tracks unread pings and enforces exact one-hour mutes', async () => {
    let now = new Date('2026-08-27T15:00:00.000Z');
    const gateway = new InMemoryChatGateway({
      users: [member, officer],
      now: () => now,
      timeZone: 'America/New_York',
    });
    let unread = false;
    gateway.observePingState(member, (state) => {
      unread = state.unread;
    }, () => undefined);
    await gateway.sendMessage(officer, {
      id: 'ping-1',
      body: 'Important',
      isClubPing: true,
    });
    expect(unread).toBe(true);
    let senderUnread = true;
    gateway.observePingState(officer, (state) => {
      senderUnread = state.unread;
    }, () => undefined);
    expect(senderUnread).toBe(false);
    await gateway.markPingsRead(member);
    expect(unread).toBe(false);

    const restriction = await gateway.muteForOneHour(officer, member.id);
    expect(restriction.mutedUntil?.toISOString()).toBe('2026-08-27T16:00:00.000Z');
    await expect(
      gateway.sendMessage(member, { id: 'blocked', body: 'Nope', isClubPing: false }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    now = new Date('2026-08-27T16:00:00.000Z');
    await expect(
      gateway.sendMessage(member, { id: 'allowed', body: 'Back', isClubPing: false }),
    ).resolves.toMatchObject({ message: { body: 'Back' } });
  });
});
