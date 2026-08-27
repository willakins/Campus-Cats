import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import {
  Role,
  SequenceIdGenerator,
  createPersistenceCodecs,
  dateObjectCodec,
  parseChatDay,
  parseChatMessage,
  parseChatRestriction,
  parsePublicProfile,
  parseUser,
} from '../../core/domain';
import { ChatGateway, ChatGatewayError, ChatPingState } from '../../core/ports';
import { ChatModule } from './ChatModule';

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

class FakeChatGateway implements ChatGateway {
  sent?: { readonly body: string; readonly isClubPing: boolean };
  reaction?: string;
  day = parseChatDay({ dayKey: '2026-08-27', messages: [], reactions: [] });
  restriction = undefined;

  observeDay(
    _actor: typeof member,
    _dayKey: string,
    onChange: (day: typeof this.day) => void,
    _onError: (error: unknown) => void,
  ) {
    onChange(this.day);
    return () => undefined;
  }
  async findPreviousActiveDay() {
    return '2026-08-26';
  }
  async sendMessage(
    actor: typeof member,
    input: { id: string; body: string; isClubPing: boolean },
  ) {
    this.sent = input;
    return {
      message: parseChatMessage({
        ...input,
        createdById: actor.id,
        createdAt: new Date('2026-08-27T15:00:00.000Z'),
        dayKey: '2026-08-27',
      }),
      notificationFailed: input.isClubPing,
    };
  }
  async setReaction(
    _actor: typeof member,
    input: { messageId: string; messageDayKey: string; emoji?: string },
  ) {
    this.reaction = input.emoji;
  }
  observePingState(
    _actor: typeof member,
    onChange: (state: ChatPingState) => void,
    _onError: (error: unknown) => void,
  ) {
    onChange({ unread: false });
    return () => undefined;
  }
  async markPingsRead() {}
  observeCurrentRestriction(
    _actor: typeof member,
    onChange: (restriction: undefined) => void,
    _onError: (error: unknown) => void,
  ) {
    onChange(this.restriction);
    return () => undefined;
  }
  async getRestriction() {
    return this.restriction;
  }
  async muteForOneHour(_actor: typeof member, userId: string) {
    return parseChatRestriction({
      userId,
      mutedUntil: new Date('2026-08-27T16:00:00.000Z'),
      chatBanned: false,
      updatedAt: new Date('2026-08-27T15:00:00.000Z'),
      updatedById: officer.id,
    });
  }
  async setChatBanned(_actor: typeof member, userId: string, banned: boolean) {
    return parseChatRestriction({
      userId,
      chatBanned: banned,
      updatedAt: new Date('2026-08-27T15:00:00.000Z'),
      updatedById: officer.id,
    });
  }
}

const buildModule = async () => {
  const gateway = new FakeChatGateway();
  const documents = new InMemoryDocumentStore();
  const codecs = createPersistenceCodecs(dateObjectCodec);
  const profile = parsePublicProfile({
    id: member.id,
    displayName: 'Mina Member',
    profilePhotoUrl: 'https://example.com/mina.jpg',
    role: Role.Member,
  });
  await documents.put(
    'public-profiles',
    member.id,
    codecs.publicProfile.encode(profile),
  );
  return {
    chat: new ChatModule({
      gateway,
      documents,
      ids: new SequenceIdGenerator(['message-1', 'message-2', 'message-3']),
      codecs: { publicProfile: codecs.publicProfile },
    }),
    gateway,
    documents,
  };
};

describe('ChatModule', () => {
  it('posts trimmed profile-backed messages and reports ping delivery warnings', async () => {
    const { chat, gateway } = await buildModule();
    const ordinary = await chat.sendMessage(member, '  hello 😺  ', false);
    expect(ordinary).toMatchObject({
      ok: true,
      value: { body: 'hello 😺', author: { displayName: 'Mina Member' } },
      warnings: [],
    });
    expect(gateway.sent).toMatchObject({ body: 'hello 😺', isClubPing: false });

    const ping = await chat.sendMessage(officer, 'Important update', true);
    expect(ping).toMatchObject({
      ok: true,
      warnings: [{ code: 'notification_failed' }],
    });
  });

  it('validates messages, officer pings, and one emoji reaction', async () => {
    const { chat, gateway } = await buildModule();
    await expect(chat.sendMessage(member, '   ', false)).resolves.toMatchObject(
      {
        ok: false,
        error: { code: 'validation' },
      },
    );
    await expect(chat.sendMessage(member, 'Nope', true)).resolves.toMatchObject(
      {
        ok: false,
        error: { code: 'forbidden' },
      },
    );
    await expect(
      chat.setReaction(member, 'message-1', '2026-08-27', 'not emoji'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
    await expect(
      chat.setReaction(member, 'message-1', '2026-08-27', '❤️'),
    ).resolves.toMatchObject({ ok: true });
    expect(gateway.reaction).toBe('❤️');
  });

  it('limits chat moderation to officers while preserving member targets server-side', async () => {
    const { chat } = await buildModule();
    await expect(
      chat.muteForOneHour(member, 'member-2'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(
      chat.muteForOneHour(officer, 'member-2'),
    ).resolves.toMatchObject({
      ok: true,
      value: { userId: 'member-2', chatBanned: false },
    });
  });

  it('exposes live days, ping state, read state, restrictions, and history lookup', async () => {
    const { chat } = await buildModule();
    const dayObserver = jest.fn();
    const stopDay = chat.observeDay(member, '2026-08-27', dayObserver);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(dayObserver).toHaveBeenCalledWith({
      ok: true,
      value: expect.objectContaining({ dayKey: '2026-08-27' }),
      warnings: [],
    });
    stopDay();
    await expect(
      chat.findPreviousActiveDay(member, '2026-08-27'),
    ).resolves.toMatchObject({ ok: true, value: '2026-08-26' });

    const pingObserver = jest.fn();
    const stopPing = chat.observeUnreadPing(member, pingObserver);
    expect(pingObserver).toHaveBeenCalledWith({
      ok: true,
      value: { unread: false },
      warnings: [],
    });
    await expect(chat.markPingsRead(member)).resolves.toMatchObject({
      ok: true,
    });
    stopPing();

    const restrictionObserver = jest.fn();
    const stopRestriction = chat.observeCurrentRestriction(
      member,
      restrictionObserver,
    );
    expect(restrictionObserver).toHaveBeenCalledWith({
      ok: true,
      value: undefined,
      warnings: [],
    });
    stopRestriction();
    await expect(
      chat.getRestriction(officer, member.id),
    ).resolves.toMatchObject({
      ok: true,
      value: undefined,
    });
    await expect(
      chat.setChatBanned(officer, member.id, true),
    ).resolves.toMatchObject({
      ok: true,
      value: { chatBanned: true },
    });
  });

  it('returns authentication errors from every read boundary', async () => {
    const { chat } = await buildModule();
    const dayObserver = jest.fn();
    chat.observeDay(undefined, '2026-08-27', dayObserver)();
    expect(dayObserver).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'unauthenticated' }),
      }),
    );
    await expect(
      chat.findPreviousActiveDay(undefined, '2026-08-27'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
    await expect(chat.markPingsRead(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    const pingObserver = jest.fn();
    chat.observeUnreadPing(undefined, pingObserver)();
    expect(pingObserver).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false }),
    );
    const restrictionObserver = jest.fn();
    chat.observeCurrentRestriction(undefined, restrictionObserver)();
    expect(restrictionObserver).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false }),
    );
    await expect(
      chat.getRestriction(undefined, member.id),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
  });

  it('returns authentication errors from write and moderation boundaries', async () => {
    const { chat } = await buildModule();
    await expect(
      chat.sendMessage(undefined, 'Hello', false),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(
      chat.setReaction(undefined, 'message-1', '2026-08-27', '👍'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
    await expect(
      chat.setChatBanned(undefined, member.id, true),
    ).resolves.toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
    await expect(
      chat.setChatBanned(member, 'member-2', true),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
  });

  it('reports observer failures while active and ignores them after disposal', async () => {
    const { chat, gateway } = await buildModule();
    let dayError: ((error: unknown) => void) | undefined;
    jest
      .spyOn(gateway, 'observeDay')
      .mockImplementation((_actor, _dayKey, _onChange, onError) => {
        dayError = onError;
        return () => undefined;
      });
    const dayObserver = jest.fn();
    const stopDay = chat.observeDay(member, '2026-08-27', dayObserver);
    dayError?.(new Error('offline'));
    expect(dayObserver).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: { code: 'dependency_failure', message: 'Could not load chat' },
      }),
    );
    stopDay();
    dayObserver.mockClear();
    dayError?.(new Error('late'));
    expect(dayObserver).not.toHaveBeenCalled();

    jest
      .spyOn(gateway, 'observePingState')
      .mockImplementation((_actor, _onChange, onError) => {
        onError(new Error('offline'));
        return () => undefined;
      });
    const pingObserver = jest.fn();
    chat.observeUnreadPing(member, pingObserver)();
    expect(pingObserver).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'dependency_failure' }),
      }),
    );

    jest
      .spyOn(gateway, 'observeCurrentRestriction')
      .mockImplementation((_actor, _onChange, onError) => {
        onError(new Error('offline'));
        return () => undefined;
      });
    const restrictionObserver = jest.fn();
    chat.observeCurrentRestriction(member, restrictionObserver)();
    expect(restrictionObserver).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'dependency_failure' }),
      }),
    );
  });

  it('uses embedded authors and caches loaded public profiles', async () => {
    const { chat, gateway, documents } = await buildModule();
    const getProfile = jest.spyOn(documents, 'get');
    await chat.sendMessage(member, 'First', false);
    await chat.sendMessage(member, 'Second', false);
    expect(getProfile).toHaveBeenCalledTimes(1);

    const embedded = parsePublicProfile({
      id: officer.id,
      displayName: 'Olivia Officer',
      role: Role.Officer,
    });
    jest.spyOn(gateway, 'sendMessage').mockResolvedValueOnce({
      message: parseChatMessage({
        id: 'message-with-author',
        body: 'Already hydrated',
        createdById: officer.id,
        createdAt: new Date('2026-08-27T15:00:00.000Z'),
        dayKey: '2026-08-27',
        isClubPing: false,
        author: embedded,
      }),
      notificationFailed: false,
    });
    await expect(
      chat.sendMessage(officer, 'Already hydrated', false),
    ).resolves.toMatchObject({
      ok: true,
      value: { author: { displayName: 'Olivia Officer' } },
    });
    expect(getProfile).toHaveBeenCalledTimes(1);
  });

  it('maps gateway and dependency failures at every public boundary', async () => {
    const { chat, gateway } = await buildModule();
    jest
      .spyOn(gateway, 'findPreviousActiveDay')
      .mockRejectedValueOnce(new Error('offline'));
    await expect(
      chat.findPreviousActiveDay(member, '2026-08-27'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    jest
      .spyOn(gateway, 'sendMessage')
      .mockRejectedValueOnce(new ChatGatewayError('forbidden', 'Muted'));
    await expect(
      chat.sendMessage(member, 'Hello', false),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden', message: 'Muted' },
    });
    jest
      .spyOn(gateway, 'setReaction')
      .mockRejectedValueOnce(new Error('offline'));
    await expect(
      chat.setReaction(member, 'message-1', '2026-08-27', '👍'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    jest
      .spyOn(gateway, 'markPingsRead')
      .mockRejectedValueOnce(new Error('offline'));
    await expect(chat.markPingsRead(member)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    jest
      .spyOn(gateway, 'getRestriction')
      .mockRejectedValueOnce(new Error('offline'));
    await expect(
      chat.getRestriction(officer, member.id),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    jest
      .spyOn(gateway, 'muteForOneHour')
      .mockRejectedValueOnce(new Error('offline'));
    await expect(
      chat.muteForOneHour(officer, member.id),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    jest
      .spyOn(gateway, 'setChatBanned')
      .mockRejectedValueOnce(new Error('offline'));
    await expect(
      chat.setChatBanned(officer, member.id, false),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });
});
