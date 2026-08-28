import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { Functions, httpsCallable } from 'firebase/functions';

import {
  ChatDay,
  ChatMessage,
  ChatPingReadState,
  ChatReaction,
  ChatRestriction,
  COLLECTIONS,
  PersistenceCodec,
  User,
  chatPingUnread,
  parseChatDay,
  parseChatMessage,
  parseChatRestriction,
} from '../../core/domain';
import {
  ChatGateway,
  ChatGatewayError,
  ChatPingState,
  ChatSendReceipt,
} from '../../core/ports';
import { FirebaseTenantScope } from './FirebaseTenantScope';

interface FirebaseChatCodecs {
  readonly message: PersistenceCodec<ChatMessage>;
  readonly reaction: PersistenceCodec<ChatReaction>;
  readonly restriction: PersistenceCodec<ChatRestriction>;
  readonly pingReadState: PersistenceCodec<ChatPingReadState>;
}

interface CallableMessage {
  readonly id: string;
  readonly body: string;
  readonly createdById: string;
  readonly createdAtMillis: number;
  readonly dayKey: string;
  readonly isClubPing: boolean;
}

interface CallableRestriction {
  readonly userId: string;
  readonly mutedUntilMillis?: number;
  readonly chatBanned: boolean;
  readonly updatedAtMillis: number;
  readonly updatedById: string;
}

export class FirebaseChatGateway implements ChatGateway {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
    private readonly scope: FirebaseTenantScope,
    private readonly codecs: FirebaseChatCodecs,
  ) {}

  async getDay(_actor: User, dayKey: string): Promise<ChatDay> {
    const [messageSnapshot, reactionSnapshot] = await Promise.all([
      getDocs(
        query(
          collection(this.firestore, this.path(COLLECTIONS.chatMessages)),
          where('dayKey', '==', dayKey),
          orderBy('createdAt', 'asc'),
        ),
      ),
      getDocs(
        query(
          collection(this.firestore, this.path(COLLECTIONS.chatReactions)),
          where('messageDayKey', '==', dayKey),
        ),
      ),
    ]);
    return parseChatDay({
      dayKey,
      messages: messageSnapshot.docs.map((item) =>
        this.codecs.message.decode(item.id, item.data()),
      ),
      reactions: reactionSnapshot.docs.map((item) =>
        this.codecs.reaction.decode(item.id, item.data()),
      ),
    });
  }

  observeDay(
    _actor: User,
    dayKey: string,
    onChange: (day: ChatDay) => void,
    onError: (error: unknown) => void,
  ): () => void {
    let messages: readonly ChatMessage[] = [];
    let reactions: readonly ChatReaction[] = [];
    let messagesReady = false;
    let reactionsReady = false;
    const emit = () => {
      if (!messagesReady || !reactionsReady) return;
      onChange(parseChatDay({ dayKey, messages, reactions }));
    };
    const stopMessages = onSnapshot(
      query(
        collection(this.firestore, this.path(COLLECTIONS.chatMessages)),
        where('dayKey', '==', dayKey),
        orderBy('createdAt', 'asc'),
      ),
      (snapshot) => {
        try {
          messages = snapshot.docs.map((item) =>
            this.codecs.message.decode(item.id, item.data()),
          );
          messagesReady = true;
          emit();
        } catch (error) {
          onError(error);
        }
      },
      onError,
    );
    const stopReactions = onSnapshot(
      query(
        collection(this.firestore, this.path(COLLECTIONS.chatReactions)),
        where('messageDayKey', '==', dayKey),
      ),
      (snapshot) => {
        try {
          reactions = snapshot.docs.map((item) =>
            this.codecs.reaction.decode(item.id, item.data()),
          );
          reactionsReady = true;
          emit();
        } catch (error) {
          onError(error);
        }
      },
      onError,
    );
    return () => {
      stopMessages();
      stopReactions();
    };
  }

  async findPreviousActiveDay(
    _actor: User,
    beforeDayKey: string,
  ): Promise<string | undefined> {
    const snapshot = await getDocs(
      query(
        collection(this.firestore, this.path(COLLECTIONS.chatMessages)),
        where('dayKey', '<', beforeDayKey),
        orderBy('dayKey', 'desc'),
        limit(1),
      ),
    );
    const dayKey = snapshot.docs[0]?.data().dayKey;
    return typeof dayKey === 'string' ? dayKey : undefined;
  }

  async sendMessage(
    _actor: User,
    input: { readonly id: string; readonly body: string; readonly isClubPing: boolean },
  ): Promise<ChatSendReceipt> {
    try {
      const result = await httpsCallable<
        typeof input,
        { readonly message: CallableMessage; readonly notificationFailed: boolean }
      >(this.functions, 'sendChatMessage')(input);
      return {
        message: callableMessage(result.data.message),
        notificationFailed: result.data.notificationFailed === true,
      };
    } catch (error) {
      throw translateChatError(error, 'Could not send the message');
    }
  }

  async setReaction(
    _actor: User,
    input: {
      readonly messageId: string;
      readonly messageDayKey: string;
      readonly emoji?: string;
    },
  ): Promise<void> {
    try {
      await httpsCallable(this.functions, 'setChatReaction')(input);
    } catch (error) {
      throw translateChatError(error, 'Could not update the reaction');
    }
  }

  observePingState(
    actor: User,
    onChange: (state: ChatPingState) => void,
    onError: (error: unknown) => void,
  ): () => void {
    let latestPing: ChatMessage | undefined;
    let readState: ChatPingReadState | undefined;
    let pingReady = false;
    let readReady = false;
    const emit = () => {
      if (!pingReady || !readReady) return;
      onChange({
        latestPing,
        unread: chatPingUnread(latestPing, readState, actor.id),
      });
    };
    const stopPing = onSnapshot(
      query(
        collection(this.firestore, this.path(COLLECTIONS.chatMessages)),
        where('isClubPing', '==', true),
        orderBy('createdAt', 'desc'),
        limit(1),
      ),
      (snapshot) => {
        try {
          const item = snapshot.docs[0];
          latestPing = item
            ? this.codecs.message.decode(item.id, item.data())
            : undefined;
          pingReady = true;
          emit();
        } catch (error) {
          onError(error);
        }
      },
      onError,
    );
    const stopRead = onSnapshot(
      doc(
        this.firestore,
        this.path(COLLECTIONS.chatPingReadStates),
        actor.id,
      ),
      (snapshot) => {
        try {
          readState = snapshot.exists()
            ? this.codecs.pingReadState.decode(snapshot.id, snapshot.data())
            : undefined;
          readReady = true;
          emit();
        } catch (error) {
          onError(error);
        }
      },
      onError,
    );
    return () => {
      stopPing();
      stopRead();
    };
  }

  async markPingsRead(_actor: User): Promise<void> {
    await httpsCallable(this.functions, 'markChatPingsRead')({});
  }

  observeCurrentRestriction(
    actor: User,
    onChange: (restriction: ChatRestriction | undefined) => void,
    onError: (error: unknown) => void,
  ): () => void {
    return onSnapshot(
      doc(this.firestore, this.path(COLLECTIONS.chatRestrictions), actor.id),
      (snapshot) => {
        try {
          onChange(
            snapshot.exists()
              ? this.codecs.restriction.decode(snapshot.id, snapshot.data())
              : undefined,
          );
        } catch (error) {
          onError(error);
        }
      },
      onError,
    );
  }

  async getRestriction(
    _actor: User,
    userId: string,
  ): Promise<ChatRestriction | undefined> {
    const snapshot = await getDoc(
      doc(this.firestore, this.path(COLLECTIONS.chatRestrictions), userId),
    );
    return snapshot.exists()
      ? this.codecs.restriction.decode(snapshot.id, snapshot.data())
      : undefined;
  }

  async muteForOneHour(
    _actor: User,
    userId: string,
  ): Promise<ChatRestriction> {
    try {
      const result = await httpsCallable<
        { readonly userId: string },
        CallableRestriction
      >(this.functions, 'muteChatUser')({ userId });
      return callableRestriction(result.data);
    } catch (error) {
      throw translateChatError(error, 'Could not mute the member');
    }
  }

  async setChatBanned(
    _actor: User,
    userId: string,
    banned: boolean,
  ): Promise<ChatRestriction> {
    try {
      const result = await httpsCallable<
        { readonly userId: string; readonly banned: boolean },
        CallableRestriction
      >(this.functions, 'setChatUserBanned')({ userId, banned });
      return callableRestriction(result.data);
    } catch (error) {
      throw translateChatError(error, 'Could not update the chat ban');
    }
  }

  private path(collectionName: string): string {
    return this.scope.collection(collectionName);
  }
}

const callableMessage = (value: CallableMessage): ChatMessage =>
  parseChatMessage({
    id: value.id,
    body: value.body,
    createdById: value.createdById,
    createdAt: validDate(value.createdAtMillis),
    dayKey: value.dayKey,
    isClubPing: value.isClubPing,
  });

const callableRestriction = (value: CallableRestriction): ChatRestriction =>
  parseChatRestriction({
    userId: value.userId,
    ...(value.mutedUntilMillis === undefined
      ? {}
      : { mutedUntil: validDate(value.mutedUntilMillis) }),
    chatBanned: value.chatBanned,
    updatedAt: validDate(value.updatedAtMillis),
    updatedById: value.updatedById,
  });

const validDate = (millis: number): Date => {
  const value = new Date(millis);
  if (!Number.isFinite(millis) || Number.isNaN(value.getTime())) {
    throw new Error('Chat returned an invalid timestamp');
  }
  return value;
};

const translateChatError = (error: unknown, fallback: string): Error => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message).replace(/^FirebaseError:\s*/u, '')
      : fallback;
  if (code.includes('invalid-argument')) {
    return new ChatGatewayError('validation', message);
  }
  if (code.includes('permission-denied')) {
    return new ChatGatewayError('forbidden', message);
  }
  if (code.includes('failed-precondition') || code.includes('already-exists')) {
    return new ChatGatewayError('conflict', message);
  }
  return error instanceof Error ? error : new Error(fallback);
};
