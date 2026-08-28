import {
  CHAT_MESSAGE_CHARACTER_LIMIT,
  ChatDay,
  ChatMessage,
  ChatRestriction,
  IdGenerator,
  Outcome,
  PersistenceCodec,
  PublicProfile,
  User,
  canManageFeature,
  failure,
  isSingleEmoji,
  parseChatDay,
  parseChatMessage,
  success,
} from '../../core/domain';
import {
  ChatGateway,
  ChatGatewayError,
  ChatPingState,
  DocumentStore,
} from '../../core/ports';

interface ChatDependencies {
  readonly gateway: ChatGateway;
  readonly documents: DocumentStore;
  readonly ids: IdGenerator;
  readonly codecs: {
    readonly publicProfile: PersistenceCodec<PublicProfile>;
  };
}

const MAX_PROFILE_CACHE_SIZE = 200;

export class ChatModule {
  readonly #profiles = new Map<string, PublicProfile | undefined>();
  readonly #profileLoads = new Map<
    string,
    Promise<PublicProfile | undefined>
  >();

  constructor(private readonly dependencies: ChatDependencies) {}

  async loadDay(
    actor: User | undefined,
    dayKey: string,
  ): Promise<Outcome<ChatDay>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view chat');
    try {
      return success(
        await this.withAuthors(
          await this.dependencies.gateway.getDay(actor, dayKey),
        ),
      );
    } catch {
      return failure('dependency_failure', 'Could not load chat');
    }
  }

  observeDay(
    actor: User | undefined,
    dayKey: string,
    onChange: (result: Outcome<ChatDay>) => void,
  ): () => void {
    if (!actor) {
      onChange(failure('unauthenticated', 'Sign in to view chat'));
      return () => undefined;
    }
    let active = true;
    let revision = 0;
    const stop = this.dependencies.gateway.observeDay(
      actor,
      dayKey,
      (day) => {
        const currentRevision = ++revision;
        void this.withAuthors(day).then((value) => {
          if (active && currentRevision === revision) onChange(success(value));
        });
      },
      () => {
        if (active) onChange(failure('dependency_failure', 'Could not load chat'));
      },
    );
    return () => {
      active = false;
      stop();
    };
  }

  async findPreviousActiveDay(
    actor: User | undefined,
    beforeDayKey: string,
  ): Promise<Outcome<string | undefined>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view chat');
    try {
      return success(
        await this.dependencies.gateway.findPreviousActiveDay(
          actor,
          beforeDayKey,
        ),
      );
    } catch {
      return failure('dependency_failure', 'Could not load earlier chat history');
    }
  }

  async sendMessage(
    actor: User | undefined,
    body: string,
    isClubPing: boolean,
  ): Promise<Outcome<ChatMessage>> {
    if (!actor) return failure('unauthenticated', 'Sign in to send a message');
    const normalized = body.trim();
    if (!normalized || normalized.length > CHAT_MESSAGE_CHARACTER_LIMIT) {
      return failure(
        'validation',
        `Messages must be between 1 and ${CHAT_MESSAGE_CHARACTER_LIMIT.toLocaleString()} characters`,
      );
    }
    if (isClubPing && !canManageFeature(actor.role)) {
      return failure('forbidden', 'Only officers can ping the club');
    }
    try {
      const receipt = await this.dependencies.gateway.sendMessage(actor, {
        id: this.dependencies.ids.next(),
        body: normalized,
        isClubPing,
      });
      const message = await this.withAuthor(receipt.message);
      return success(
        message,
        receipt.notificationFailed
          ? [
              {
                code: 'notification_failed',
                message:
                  'Message sent, but some push notifications could not be delivered',
              },
            ]
          : [],
      );
    } catch (error) {
      return gatewayFailure(error, 'Could not send the message');
    }
  }

  async setReaction(
    actor: User | undefined,
    messageId: string,
    messageDayKey: string,
    emoji: string,
  ): Promise<Outcome<void>> {
    if (!actor) return failure('unauthenticated', 'Sign in to react');
    if (!messageId.trim() || !isSingleEmoji(emoji)) {
      return failure('validation', 'Choose one valid emoji reaction');
    }
    try {
      await this.dependencies.gateway.setReaction(actor, {
        messageId,
        messageDayKey,
        emoji: emoji.trim(),
      });
      return success(undefined);
    } catch (error) {
      return gatewayFailure(error, 'Could not update the reaction');
    }
  }

  observeUnreadPing(
    actor: User | undefined,
    onChange: (result: Outcome<ChatPingState>) => void,
  ): () => void {
    if (!actor) {
      onChange(failure('unauthenticated', 'Sign in to view chat'));
      return () => undefined;
    }
    return this.dependencies.gateway.observePingState(
      actor,
      (state) => onChange(success(state)),
      () =>
        onChange(
          failure('dependency_failure', 'Could not load chat notification state'),
        ),
    );
  }

  async markPingsRead(actor: User | undefined): Promise<Outcome<void>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view chat');
    try {
      await this.dependencies.gateway.markPingsRead(actor);
      return success(undefined);
    } catch {
      return failure('dependency_failure', 'Could not update chat read status');
    }
  }

  observeCurrentRestriction(
    actor: User | undefined,
    onChange: (result: Outcome<ChatRestriction | undefined>) => void,
  ): () => void {
    if (!actor) {
      onChange(failure('unauthenticated', 'Sign in to view chat'));
      return () => undefined;
    }
    return this.dependencies.gateway.observeCurrentRestriction(
      actor,
      (restriction) => onChange(success(restriction)),
      () =>
        onChange(
          failure('dependency_failure', 'Could not load chat restrictions'),
        ),
    );
  }

  async getRestriction(
    actor: User | undefined,
    userId: string,
  ): Promise<Outcome<ChatRestriction | undefined>> {
    const denied = moderationDenied(actor);
    if (denied) return denied;
    try {
      return success(
        await this.dependencies.gateway.getRestriction(actor as User, userId),
      );
    } catch (error) {
      return gatewayFailure(error, 'Could not load the chat restriction');
    }
  }

  async muteForOneHour(
    actor: User | undefined,
    userId: string,
  ): Promise<Outcome<ChatRestriction>> {
    const denied = moderationDenied(actor);
    if (denied) return denied;
    try {
      return success(
        await this.dependencies.gateway.muteForOneHour(actor as User, userId),
      );
    } catch (error) {
      return gatewayFailure(error, 'Could not mute the member');
    }
  }

  async setChatBanned(
    actor: User | undefined,
    userId: string,
    banned: boolean,
  ): Promise<Outcome<ChatRestriction>> {
    const denied = moderationDenied(actor);
    if (denied) return denied;
    try {
      return success(
        await this.dependencies.gateway.setChatBanned(
          actor as User,
          userId,
          banned,
        ),
      );
    } catch (error) {
      return gatewayFailure(
        error,
        banned ? 'Could not ban the member from chat' : 'Could not unban the member',
      );
    }
  }

  private async withAuthors(day: ChatDay): Promise<ChatDay> {
    return parseChatDay({
      ...day,
      messages: await Promise.all(day.messages.map((message) => this.withAuthor(message))),
      reactions: [...day.reactions].sort(
        (left, right) => left.updatedAt.getTime() - right.updatedAt.getTime(),
      ),
    });
  }

  private async withAuthor(message: ChatMessage): Promise<ChatMessage> {
    if (message.author) return message;
    const author = await this.profile(message.createdById);
    return parseChatMessage({ ...message, ...(author ? { author } : {}) });
  }

  private profile(id: string): Promise<PublicProfile | undefined> {
    if (this.#profiles.has(id)) {
      const cached = this.#profiles.get(id);
      this.#profiles.delete(id);
      this.#profiles.set(id, cached);
      return Promise.resolve(cached);
    }
    const pending = this.#profileLoads.get(id);
    if (pending) return pending;

    const load = this.loadProfile(id)
      .then((profile) => {
        this.rememberProfile(id, profile);
        return profile;
      })
      .finally(() => this.#profileLoads.delete(id));
    this.#profileLoads.set(id, load);
    return load;
  }

  private async loadProfile(id: string): Promise<PublicProfile | undefined> {
    try {
      const document = await this.dependencies.documents.get('public-profiles', id);
      return document
        ? this.dependencies.codecs.publicProfile.decode(document.id, document.data)
        : undefined;
    } catch {
      return undefined;
    }
  }

  private rememberProfile(
    id: string,
    profile: PublicProfile | undefined,
  ): void {
    this.#profiles.set(id, profile);
    if (this.#profiles.size <= MAX_PROFILE_CACHE_SIZE) return;
    const oldest = this.#profiles.keys().next().value;
    if (oldest !== undefined) this.#profiles.delete(oldest);
  }
}

const moderationDenied = (
  actor: User | undefined,
): Outcome<never> | undefined => {
  if (!actor) return failure('unauthenticated', 'Sign in to moderate chat');
  if (!canManageFeature(actor.role)) {
    return failure('forbidden', 'Officer access is required to moderate chat');
  }
  return undefined;
};

const gatewayFailure = <T>(error: unknown, fallback: string): Outcome<T> => {
  if (error instanceof ChatGatewayError) return failure(error.code, error.message);
  return failure('dependency_failure', fallback);
};
