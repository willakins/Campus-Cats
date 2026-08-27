import {
  CHAT_MUTE_DURATION_MS,
  ChatDay,
  ChatMessage,
  ChatReaction,
  ChatRestriction,
  Role,
  User,
  chatDayKey,
  chatRestrictionActive,
  canManageFeature,
  parseChatDay,
  parseChatMessage,
  parseChatReaction,
  parseChatRestriction,
} from '../../core/domain';
import {
  ChatGateway,
  ChatGatewayError,
  ChatPingState,
  ChatSendReceipt,
} from '../../core/ports';

type DayObserver = (day: ChatDay) => void;
type PingObserver = (state: ChatPingState) => void;
type RestrictionObserver = (restriction: ChatRestriction | undefined) => void;

interface InMemoryChatOptions {
  readonly now?: () => Date;
  readonly timeZone?: string;
  readonly users?: readonly User[];
}

/** Deterministic chat adapter used by previews, tests, and local composition. */
export class InMemoryChatGateway implements ChatGateway {
  readonly #messages = new Map<string, ChatMessage>();
  readonly #reactions = new Map<string, ChatReaction>();
  readonly #restrictions = new Map<string, ChatRestriction>();
  readonly #readPingIds = new Map<string, string>();
  readonly #users = new Map<string, User>();
  readonly #dayObservers = new Map<string, Set<DayObserver>>();
  readonly #pingObservers = new Map<string, Set<PingObserver>>();
  readonly #restrictionObservers = new Map<string, Set<RestrictionObserver>>();
  readonly #now: () => Date;
  readonly #timeZone: string;
  notificationFailed = false;

  constructor(options: InMemoryChatOptions = {}) {
    this.#now = options.now ?? (() => new Date());
    this.#timeZone = options.timeZone ?? 'UTC';
    for (const user of options.users ?? []) this.#users.set(user.id, user);
  }

  seedMessage(message: ChatMessage): void {
    this.#messages.set(message.id, message);
    this.emitDay(message.dayKey);
    if (message.isClubPing) this.emitAllPingStates();
  }

  observeDay(
    _actor: User,
    dayKey: string,
    onChange: DayObserver,
    _onError: (error: unknown) => void,
  ): () => void {
    const observers = this.#dayObservers.get(dayKey) ?? new Set<DayObserver>();
    observers.add(onChange);
    this.#dayObservers.set(dayKey, observers);
    onChange(this.day(dayKey));
    return () => observers.delete(onChange);
  }

  async findPreviousActiveDay(
    _actor: User,
    beforeDayKey: string,
  ): Promise<string | undefined> {
    return [...new Set([...this.#messages.values()].map(({ dayKey }) => dayKey))]
      .filter((dayKey) => dayKey < beforeDayKey)
      .sort()
      .at(-1);
  }

  async sendMessage(
    actor: User,
    input: { id: string; body: string; isClubPing: boolean },
  ): Promise<ChatSendReceipt> {
    this.assertCanParticipate(actor);
    if (input.isClubPing && !canManageFeature(actor.role)) {
      throw new ChatGatewayError('forbidden', 'Only officers can ping the club');
    }
    const createdAt = this.#now();
    const message = parseChatMessage({
      ...input,
      createdById: actor.id,
      createdAt,
      dayKey: chatDayKey(createdAt, this.#timeZone),
    });
    this.seedMessage(message);
    return { message, notificationFailed: this.notificationFailed };
  }

  async setReaction(
    actor: User,
    input: { messageId: string; messageDayKey: string; emoji?: string },
  ): Promise<void> {
    this.assertCanParticipate(actor);
    const message = this.#messages.get(input.messageId);
    if (!message || message.dayKey !== input.messageDayKey) {
      throw new ChatGatewayError('validation', 'Message not found');
    }
    const id = `${input.messageId}_${actor.id}`;
    const existing = this.#reactions.get(id);
    if (!input.emoji || existing?.emoji === input.emoji) {
      this.#reactions.delete(id);
    } else {
      this.#reactions.set(
        id,
        parseChatReaction({
          ...input,
          userId: actor.id,
          emoji: input.emoji,
          updatedAt: this.#now(),
        }),
      );
    }
    this.emitDay(input.messageDayKey);
  }

  observePingState(
    actor: User,
    onChange: PingObserver,
    _onError: (error: unknown) => void,
  ): () => void {
    const observers = this.#pingObservers.get(actor.id) ?? new Set<PingObserver>();
    observers.add(onChange);
    this.#pingObservers.set(actor.id, observers);
    onChange(this.pingState(actor.id));
    return () => observers.delete(onChange);
  }

  async markPingsRead(actor: User): Promise<void> {
    const latest = this.latestPing();
    if (latest) this.#readPingIds.set(actor.id, latest.id);
    this.emitPingState(actor.id);
  }

  observeCurrentRestriction(
    actor: User,
    onChange: RestrictionObserver,
    _onError: (error: unknown) => void,
  ): () => void {
    const observers =
      this.#restrictionObservers.get(actor.id) ?? new Set<RestrictionObserver>();
    observers.add(onChange);
    this.#restrictionObservers.set(actor.id, observers);
    onChange(this.#restrictions.get(actor.id));
    return () => observers.delete(onChange);
  }

  async getRestriction(
    actor: User,
    userId: string,
  ): Promise<ChatRestriction | undefined> {
    this.assertOfficerMemberTarget(actor, userId);
    return this.#restrictions.get(userId);
  }

  async muteForOneHour(actor: User, userId: string): Promise<ChatRestriction> {
    this.assertOfficerMemberTarget(actor, userId);
    const now = this.#now();
    return this.saveRestriction(
      parseChatRestriction({
        userId,
        mutedUntil: new Date(now.getTime() + CHAT_MUTE_DURATION_MS),
        chatBanned: false,
        updatedAt: now,
        updatedById: actor.id,
      }),
    );
  }

  async setChatBanned(
    actor: User,
    userId: string,
    banned: boolean,
  ): Promise<ChatRestriction> {
    this.assertOfficerMemberTarget(actor, userId);
    return this.saveRestriction(
      parseChatRestriction({
        userId,
        chatBanned: banned,
        updatedAt: this.#now(),
        updatedById: actor.id,
      }),
    );
  }

  private day(dayKey: string): ChatDay {
    return parseChatDay({
      dayKey,
      messages: [...this.#messages.values()]
        .filter((message) => message.dayKey === dayKey)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      reactions: [...this.#reactions.values()].filter(
        (reaction) => reaction.messageDayKey === dayKey,
      ),
    });
  }

  private pingState(userId: string): ChatPingState {
    const latestPing = this.latestPing();
    return {
      ...(latestPing ? { latestPing } : {}),
      unread: Boolean(
        latestPing &&
          latestPing.createdById !== userId &&
          this.#readPingIds.get(userId) !== latestPing.id,
      ),
    };
  }

  private latestPing(): ChatMessage | undefined {
    return [...this.#messages.values()]
      .filter(({ isClubPing }) => isClubPing)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  private assertCanParticipate(actor: User): void {
    if (chatRestrictionActive(this.#restrictions.get(actor.id), this.#now())) {
      throw new ChatGatewayError('forbidden', 'Your chat access is restricted');
    }
  }

  private assertOfficerMemberTarget(actor: User, userId: string): void {
    if (!canManageFeature(actor.role)) {
      throw new ChatGatewayError('forbidden', 'Officer access is required');
    }
    if (actor.id === userId || this.#users.get(userId)?.role !== Role.Member) {
      throw new ChatGatewayError('forbidden', 'Only another member can be moderated');
    }
  }

  private saveRestriction(restriction: ChatRestriction): ChatRestriction {
    this.#restrictions.set(restriction.userId, restriction);
    for (const observer of this.#restrictionObservers.get(restriction.userId) ?? []) {
      observer(restriction);
    }
    return restriction;
  }

  private emitDay(dayKey: string): void {
    const day = this.day(dayKey);
    for (const observer of this.#dayObservers.get(dayKey) ?? []) observer(day);
  }

  private emitAllPingStates(): void {
    for (const userId of this.#pingObservers.keys()) this.emitPingState(userId);
  }

  private emitPingState(userId: string): void {
    for (const observer of this.#pingObservers.get(userId) ?? []) {
      observer(this.pingState(userId));
    }
  }
}
