import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ChatDependencies,
  ChatMessageRecord,
  ChatRestrictionRecord,
  handleMarkChatPingsRead,
  handleMuteChatUser,
  handleSendChatMessage,
  handleSetChatReaction,
  handleSetChatUserBanned,
} from './chat';
import { ManagedUser } from './handlers';

const now = new Date('2026-08-27T15:00:00.000Z');
const users = new Map<string, ManagedUser>([
  ['member-1', { id: 'member-1', email: 'member@example.com', role: 0, clubId: 'cats' }],
  ['member-2', { id: 'member-2', email: 'other@example.com', role: 0, clubId: 'cats' }],
  ['officer-1', { id: 'officer-1', email: 'officer@example.com', role: 1, clubId: 'cats' }],
  ['other-club-member', { id: 'other-club-member', email: 'elsewhere@example.com', role: 0, clubId: 'dogs' }],
]);

const setup = () => {
  const messages = new Map<string, ChatMessageRecord>();
  const restrictions = new Map<string, ChatRestrictionRecord>();
  const reactions = new Map<string, string>();
  const reads: string[] = [];
  const pushes: string[] = [];
  const dependencies: ChatDependencies = {
    now: () => now,
    getUser: async (id) => users.get(id),
    getClub: async () => ({ name: 'Campus Cats', timezone: 'America/New_York' }),
    getPublicProfileName: async (id) => id === 'officer-1' ? 'Olivia Officer' : undefined,
    getMessage: async (_clubId, id) => messages.get(id),
    putMessage: async (_clubId, message) => void messages.set(message.id, message),
    getReaction: async (_clubId, id) => reactions.get(id),
    putReaction: async (_clubId, id, reaction) => void reactions.set(id, reaction.emoji),
    removeReaction: async (_clubId, id) => void reactions.delete(id),
    getRestriction: async (_clubId, id) => restrictions.get(id),
    putRestriction: async (_clubId, restriction) => void restrictions.set(restriction.userId, restriction),
    latestPing: async () => [...messages.values()].find((message) => message.isClubPing),
    putPingReadState: async (_clubId, state) => void reads.push(state.lastReadPingId),
    listPushRecipients: async () => [
      { userId: 'member-1', token: 'token-1' },
      { userId: 'officer-1', token: 'token-officer' },
    ],
    sendPushBatch: async (batch) => void pushes.push(...batch.map(({ to }) => to)),
  };
  return { dependencies, messages, restrictions, reactions, reads, pushes };
};

describe('chat callable behavior', () => {
  it('stores an officer ping in the club day and excludes the sender from push', async () => {
    const context = setup();
    const result = await handleSendChatMessage(
      { authUid: 'officer-1', data: { id: 'message-1', body: ' Feeding at 5 😺 ', isClubPing: true } },
      context.dependencies,
    );
    assert.equal(result.message.dayKey, '2026-08-27');
    assert.equal(result.message.createdAtMillis, now.getTime());
    assert.equal(result.message.body, 'Feeding at 5 😺');
    assert.deepEqual(context.pushes, ['token-1']);
  });

  it('keeps the message and attempts later push batches after a partial failure', async () => {
    const context = setup();
    let batches = 0;
    const dependencies: ChatDependencies = {
      ...context.dependencies,
      listPushRecipients: async () => [
        { userId: 'officer-1', token: 'sender-token' },
        ...Array.from({ length: 200 }, (_, index) => ({
          userId: `member-${index + 10}`,
          token: `token-${index + 10}`,
        })),
      ],
      sendPushBatch: async () => {
        batches += 1;
        if (batches === 1) throw new Error('Expo batch failed');
      },
    };
    const result = await handleSendChatMessage(
      {
        authUid: 'officer-1',
        data: { id: 'message-partial', body: 'Important update', isClubPing: true },
      },
      dependencies,
    );
    assert.equal(result.notificationFailed, true);
    assert.equal(batches, 2);
    assert.equal(context.messages.get('message-partial')?.body, 'Important update');
  });

  it('blocks restricted participation and toggles one reaction per user', async () => {
    const context = setup();
    context.messages.set('message-1', {
      id: 'message-1', body: 'Hi', createdById: 'officer-1', createdAt: now,
      dayKey: '2026-08-27', isClubPing: false,
    });
    await handleSetChatReaction(
      { authUid: 'member-1', data: { messageId: 'message-1', messageDayKey: '2026-08-27', emoji: '❤️' } },
      context.dependencies,
    );
    assert.equal(context.reactions.get('message-1__member-1'), '❤️');
    await handleSetChatReaction(
      { authUid: 'member-1', data: { messageId: 'message-1', messageDayKey: '2026-08-27', emoji: '❤️' } },
      context.dependencies,
    );
    assert.equal(context.reactions.size, 0);

    context.restrictions.set('member-1', {
      userId: 'member-1', chatBanned: false,
      mutedUntil: new Date('2026-08-27T16:00:00.000Z'), updatedAt: now,
      updatedById: 'officer-1',
    });
    await assert.rejects(
      handleSendChatMessage(
        { authUid: 'member-1', data: { id: 'message-2', body: 'Blocked', isClubPing: false } },
        context.dependencies,
      ),
      /muted/i,
    );
    context.restrictions.set('member-1', {
      userId: 'member-1', chatBanned: true, updatedAt: now,
      updatedById: 'officer-1',
    });
    await assert.rejects(
      handleSetChatReaction(
        { authUid: 'member-1', data: { messageId: 'message-1', messageDayKey: '2026-08-27', emoji: '👍' } },
        context.dependencies,
      ),
      /banned/i,
    );
    context.restrictions.delete('member-1');
    await assert.rejects(
      handleSetChatReaction(
        { authUid: 'member-1', data: { messageId: 'message-1', messageDayKey: '2026-08-27', emoji: 'not emoji' } },
        context.dependencies,
      ),
      /valid emoji/i,
    );
  });

  it('mutes and chat-bans members only, clears mutes on ban, and marks latest pings read', async () => {
    const context = setup();
    const muted = await handleMuteChatUser(
      { authUid: 'officer-1', data: { userId: 'member-1' } },
      context.dependencies,
    );
    assert.equal(muted.mutedUntilMillis, now.getTime() + 3_600_000);
    const banned = await handleSetChatUserBanned(
      { authUid: 'officer-1', data: { userId: 'member-1', banned: true } },
      context.dependencies,
    );
    assert.equal(banned.chatBanned, true);
    assert.equal(banned.mutedUntilMillis, undefined);
    const unbanned = await handleSetChatUserBanned(
      { authUid: 'officer-1', data: { userId: 'member-1', banned: false } },
      context.dependencies,
    );
    assert.equal(unbanned.chatBanned, false);

    context.messages.set('ping-1', {
      id: 'ping-1', body: 'Heads up', createdById: 'officer-1', createdAt: now,
      dayKey: '2026-08-27', isClubPing: true,
    });
    await handleMarkChatPingsRead(
      { authUid: 'member-1', data: {} },
      context.dependencies,
    );
    assert.deepEqual(context.reads, ['ping-1']);

    await assert.rejects(
      handleMuteChatUser(
        { authUid: 'officer-1', data: { userId: 'officer-1' } },
        context.dependencies,
      ),
      /member accounts/i,
    );
    await assert.rejects(
      handleSetChatUserBanned(
        { authUid: 'officer-1', data: { userId: 'other-club-member', banned: true } },
        context.dependencies,
      ),
      /member accounts/i,
    );
    await assert.rejects(
      handleSendChatMessage(
        { authUid: 'member-1', data: { id: 'member-ping', body: 'No', isClubPing: true } },
        context.dependencies,
      ),
      /officers/i,
    );
  });
});
