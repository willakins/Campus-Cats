import {
  CHAT_MESSAGE_CHARACTER_LIMIT,
  chatDayKey,
  chatPingUnread,
  chatRestrictionActive,
  isSingleEmoji,
  parseChatMessage,
  parseChatPingReadState,
  parseChatRestriction,
} from './chat';

describe('chat domain', () => {
  it('uses the club calendar date across midnight and daylight-saving changes', () => {
    expect(
      chatDayKey(new Date('2026-03-08T04:59:59.000Z'), 'America/New_York'),
    ).toBe('2026-03-07');
    expect(
      chatDayKey(new Date('2026-03-08T05:00:00.000Z'), 'America/New_York'),
    ).toBe('2026-03-08');
    expect(
      chatDayKey(new Date('2026-11-01T05:30:00.000Z'), 'America/New_York'),
    ).toBe('2026-11-01');
  });

  it('allows emoji messages up to 1,000 characters and rejects longer messages', () => {
    expect(
      parseChatMessage({
        id: 'message-1',
        body: `😺${'a'.repeat(CHAT_MESSAGE_CHARACTER_LIMIT - 2)}`,
        createdById: 'member-1',
        createdAt: new Date(),
        dayKey: '2026-08-27',
        isClubPing: false,
      }).body,
    ).toHaveLength(CHAT_MESSAGE_CHARACTER_LIMIT);
    expect(() =>
      parseChatMessage({
        id: 'message-2',
        body: 'a'.repeat(CHAT_MESSAGE_CHARACTER_LIMIT + 1),
        createdById: 'member-1',
        createdAt: new Date(),
        dayKey: '2026-08-27',
        isClubPing: false,
      }),
    ).toThrow();
  });

  it('recognizes one grapheme emoji and expires temporary restrictions', () => {
    expect(isSingleEmoji('❤️')).toBe(true);
    expect(isSingleEmoji('👩🏽‍💻')).toBe(true);
    expect(isSingleEmoji('🇺🇸')).toBe(true);
    expect(isSingleEmoji('1️⃣')).toBe(true);
    expect(isSingleEmoji('')).toBe(false);
    expect(isSingleEmoji('a'.repeat(33))).toBe(false);
    expect(isSingleEmoji('👍👎')).toBe(false);
    expect(isSingleEmoji('hello')).toBe(false);
    const restriction = parseChatRestriction({
      userId: 'member-1',
      mutedUntil: new Date('2026-08-27T16:00:00.000Z'),
      chatBanned: false,
      updatedAt: new Date('2026-08-27T15:00:00.000Z'),
      updatedById: 'officer-1',
    });
    expect(
      chatRestrictionActive(restriction, new Date('2026-08-27T15:59:59.000Z')),
    ).toBe(true);
    expect(
      chatRestrictionActive(restriction, new Date('2026-08-27T16:00:00.000Z')),
    ).toBe(false);
  });

  it('never marks a sender’s own ping unread and compares recipient read state', () => {
    const ping = parseChatMessage({
      id: 'ping-1',
      body: 'Heads up',
      createdById: 'officer-1',
      createdAt: new Date('2026-08-27T15:00:00.000Z'),
      dayKey: '2026-08-27',
      isClubPing: true,
    });
    expect(chatPingUnread(ping, undefined, 'officer-1')).toBe(false);
    expect(chatPingUnread(ping, undefined, 'member-1')).toBe(true);
    expect(
      chatPingUnread(
        ping,
        parseChatPingReadState({
          userId: 'member-1',
          lastReadPingId: ping.id,
          lastReadPingAt: ping.createdAt,
        }),
        'member-1',
      ),
    ).toBe(false);
  });
});
