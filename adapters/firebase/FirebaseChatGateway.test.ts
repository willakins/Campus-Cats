import type { Firestore } from 'firebase/firestore';
import { getDocs } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';

import {
  Role,
  createPersistenceCodecs,
  dateObjectCodec,
  parseChatMessage,
  parseChatReaction,
  parseUser,
} from '../../core/domain';
import { FirebaseChatGateway } from './FirebaseChatGateway';
import { FirebaseTenantScope } from './FirebaseTenantScope';

const mockCallable = jest.fn();
const mockedGetDocs = jest.mocked(getDocs);

jest.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => (data: unknown) =>
    mockCallable(name, data),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));

const actor = parseUser({
  id: 'member-1',
  email: 'member@example.com',
  role: Role.Member,
});

const gateway = () => {
  const scope = new FirebaseTenantScope();
  scope.setAuthenticatedClub('campus-cats');
  const codecs = createPersistenceCodecs(dateObjectCodec);
  return new FirebaseChatGateway(
    {} as Firestore,
    {} as Functions,
    scope,
    {
      message: codecs.chatMessage,
      reaction: codecs.chatReaction,
      restriction: codecs.chatRestriction,
      pingReadState: codecs.chatPingReadState,
    },
  );
};

describe('FirebaseChatGateway', () => {
  beforeEach(() => {
    mockCallable.mockReset();
    mockedGetDocs.mockReset();
  });

  it('reads historical days without opening realtime listeners', async () => {
    const codecs = createPersistenceCodecs(dateObjectCodec);
    const message = parseChatMessage({
      id: 'message-1',
      body: 'Earlier message',
      createdById: actor.id,
      createdAt: new Date('2026-08-26T14:00:00.000Z'),
      dayKey: '2026-08-26',
      isClubPing: false,
    });
    const reaction = parseChatReaction({
      messageId: message.id,
      messageDayKey: message.dayKey,
      userId: actor.id,
      emoji: '👍',
      updatedAt: new Date('2026-08-26T14:01:00.000Z'),
    });
    mockedGetDocs
      .mockResolvedValueOnce({
        docs: [{ id: message.id, data: () => codecs.chatMessage.encode(message) }],
      } as unknown as Awaited<ReturnType<typeof getDocs>>)
      .mockResolvedValueOnce({
        docs: [{
          id: `${message.id}_${actor.id}`,
          data: () => codecs.chatReaction.encode(reaction),
        }],
      } as unknown as Awaited<ReturnType<typeof getDocs>>);

    await expect(gateway().getDay(actor, message.dayKey)).resolves.toMatchObject({
      dayKey: message.dayKey,
      messages: [{ id: message.id, body: message.body }],
      reactions: [{ messageId: message.id, emoji: '👍' }],
    });
    expect(mockedGetDocs).toHaveBeenCalledTimes(2);
  });

  it('translates trusted chat callable receipts into domain values', async () => {
    mockCallable
      .mockResolvedValueOnce({
        data: {
          message: {
            id: 'message-1',
            body: 'Hello 😺',
            createdById: actor.id,
            createdAtMillis: 1_788_187_600_000,
            dayKey: '2026-08-27',
            isClubPing: false,
          },
          notificationFailed: false,
        },
      })
      .mockResolvedValueOnce({ data: { selected: true } })
      .mockResolvedValueOnce({ data: { marked: true } })
      .mockResolvedValueOnce({
        data: {
          userId: 'member-2',
          mutedUntilMillis: 1_788_191_200_000,
          chatBanned: false,
          updatedAtMillis: 1_788_187_600_000,
          updatedById: 'officer-1',
        },
      });
    const chat = gateway();

    await expect(
      chat.sendMessage(actor, {
        id: 'message-1',
        body: 'Hello 😺',
        isClubPing: false,
      }),
    ).resolves.toMatchObject({ message: { body: 'Hello 😺' } });
    await chat.setReaction(actor, {
      messageId: 'message-1',
      messageDayKey: '2026-08-27',
      emoji: '👍',
    });
    await chat.markPingsRead(actor);
    await expect(chat.muteForOneHour(actor, 'member-2')).resolves.toMatchObject({
      userId: 'member-2',
      mutedUntil: new Date(1_788_191_200_000),
    });
    expect(mockCallable.mock.calls.map(([name]) => name)).toEqual([
      'sendChatMessage',
      'setChatReaction',
      'markChatPingsRead',
      'muteChatUser',
    ]);
  });

  it('maps trusted validation and authorization failures to gateway errors', async () => {
    const chat = gateway();
    mockCallable.mockRejectedValueOnce({
      code: 'functions/permission-denied',
      message: 'FirebaseError: Chat access is restricted',
    });
    await expect(
      chat.sendMessage(actor, { id: 'message-1', body: 'No', isClubPing: false }),
    ).rejects.toMatchObject({
      code: 'forbidden',
      message: 'Chat access is restricted',
    });
    mockCallable.mockRejectedValueOnce({
      code: 'functions/failed-precondition',
      message: 'Already banned',
    });
    await expect(
      chat.setChatBanned(actor, 'member-2', true),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});
