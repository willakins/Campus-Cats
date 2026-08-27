import { HandlerError, ManagedUser, PushMessage } from './handlers';

export interface ChatMessageRecord {
  readonly id: string;
  readonly body: string;
  readonly createdById: string;
  readonly createdAt: Date;
  readonly dayKey: string;
  readonly isClubPing: boolean;
}

export interface ChatReactionRecord {
  readonly messageId: string;
  readonly messageDayKey: string;
  readonly userId: string;
  readonly emoji: string;
  readonly updatedAt: Date;
}

export interface ChatRestrictionRecord {
  readonly userId: string;
  readonly mutedUntil?: Date;
  readonly chatBanned: boolean;
  readonly updatedAt: Date;
  readonly updatedById: string;
}

export interface ChatPingReadRecord {
  readonly userId: string;
  readonly lastReadPingId: string;
  readonly lastReadPingAt: Date;
}

export interface ChatDependencies {
  now(): Date;
  getUser(id: string): Promise<ManagedUser | undefined>;
  getClub(clubId: string): Promise<{ readonly name: string; readonly timezone: string }>;
  getPublicProfileName(userId: string, clubId: string): Promise<string | undefined>;
  getMessage(clubId: string, id: string): Promise<ChatMessageRecord | undefined>;
  putMessage(clubId: string, message: ChatMessageRecord): Promise<void>;
  getReaction(clubId: string, id: string): Promise<string | undefined>;
  putReaction(clubId: string, id: string, reaction: ChatReactionRecord): Promise<void>;
  removeReaction(clubId: string, id: string): Promise<void>;
  getRestriction(clubId: string, userId: string): Promise<ChatRestrictionRecord | undefined>;
  putRestriction(clubId: string, restriction: ChatRestrictionRecord): Promise<void>;
  latestPing(clubId: string): Promise<ChatMessageRecord | undefined>;
  putPingReadState(clubId: string, state: ChatPingReadRecord): Promise<void>;
  listPushRecipients(clubId: string): Promise<readonly { readonly userId: string; readonly token: string }[]>;
  sendPushBatch(messages: readonly PushMessage[]): Promise<void>;
}

interface ChatRequest<T> {
  readonly authUid?: string;
  readonly data: T;
}

interface ChatMessageResult {
  readonly id: string;
  readonly body: string;
  readonly createdById: string;
  readonly createdAtMillis: number;
  readonly dayKey: string;
  readonly isClubPing: boolean;
}

interface ChatRestrictionResult {
  readonly userId: string;
  readonly mutedUntilMillis?: number;
  readonly chatBanned: boolean;
  readonly updatedAtMillis: number;
  readonly updatedById: string;
}

export async function handleSendChatMessage(
  request: ChatRequest<{
    readonly id?: unknown;
    readonly body?: unknown;
    readonly isClubPing?: unknown;
  }>,
  dependencies: ChatDependencies,
): Promise<{
  readonly message: ChatMessageResult;
  readonly notificationFailed: boolean;
}> {
  const actor = await requireActiveUser(request.authUid, dependencies);
  await requireCanParticipate(actor, dependencies);
  const id = validId(request.data.id, 'message ID');
  const body = requiredString(request.data.body, 'message').trim();
  if (body.length > 1_000) {
    throw new HandlerError('invalid-argument', 'Messages cannot exceed 1,000 characters');
  }
  const isClubPing = request.data.isClubPing === true;
  if (request.data.isClubPing !== undefined && typeof request.data.isClubPing !== 'boolean') {
    throw new HandlerError('invalid-argument', 'isClubPing must be a boolean');
  }
  if (isClubPing && actor.role < 1) {
    throw new HandlerError('permission-denied', 'Only officers can ping the club');
  }
  const existing = await dependencies.getMessage(actor.clubId, id);
  if (existing) {
    if (
      existing.createdById !== actor.id ||
      existing.body !== body ||
      existing.isClubPing !== isClubPing
    ) {
      throw new HandlerError('already-exists', 'Message ID is already in use');
    }
    return { message: messageResult(existing), notificationFailed: false };
  }

  const createdAt = dependencies.now();
  const club = await dependencies.getClub(actor.clubId);
  const message: ChatMessageRecord = {
    id,
    body,
    createdById: actor.id,
    createdAt,
    dayKey: dayKey(createdAt, club.timezone),
    isClubPing,
  };
  await dependencies.putMessage(actor.clubId, message);

  let notificationFailed = false;
  if (isClubPing) {
    try {
      const sender =
        (await dependencies.getPublicProfileName(actor.id, actor.clubId)) ??
        'Club officer';
      const recipients = (await dependencies.listPushRecipients(actor.clubId)).filter(
        ({ userId, token }) => userId !== actor.id && Boolean(token),
      );
      for (let offset = 0; offset < recipients.length; offset += 100) {
        try {
          await dependencies.sendPushBatch(
            recipients.slice(offset, offset + 100).map(({ token }) => ({
              to: token,
              sound: 'default',
              title: `${club.name} chat ping`,
              body: `${sender}: ${body}`.slice(0, 180),
            })),
          );
        } catch {
          notificationFailed = true;
        }
      }
    } catch {
      notificationFailed = true;
    }
  }
  return { message: messageResult(message), notificationFailed };
}

export async function handleSetChatReaction(
  request: ChatRequest<{
    readonly messageId?: unknown;
    readonly messageDayKey?: unknown;
    readonly emoji?: unknown;
  }>,
  dependencies: ChatDependencies,
): Promise<{ readonly selected: boolean }> {
  const actor = await requireActiveUser(request.authUid, dependencies);
  await requireCanParticipate(actor, dependencies);
  const messageId = validId(request.data.messageId, 'message ID');
  const messageDayKey = validDayKey(request.data.messageDayKey);
  const emoji = requiredString(request.data.emoji, 'emoji');
  if (!isSingleEmoji(emoji)) {
    throw new HandlerError('invalid-argument', 'Choose one valid emoji reaction');
  }
  const message = await dependencies.getMessage(actor.clubId, messageId);
  if (!message || message.dayKey !== messageDayKey) {
    throw new HandlerError('not-found', 'Message not found');
  }
  const reactionId = `${messageId}__${actor.id}`;
  const existing = await dependencies.getReaction(actor.clubId, reactionId);
  if (existing === emoji) {
    await dependencies.removeReaction(actor.clubId, reactionId);
    return { selected: false };
  }
  await dependencies.putReaction(actor.clubId, reactionId, {
    messageId,
    messageDayKey,
    userId: actor.id,
    emoji,
    updatedAt: dependencies.now(),
  });
  return { selected: true };
}

export async function handleMarkChatPingsRead(
  request: ChatRequest<Record<string, never>>,
  dependencies: ChatDependencies,
): Promise<{ readonly marked: boolean }> {
  const actor = await requireActiveUser(request.authUid, dependencies);
  const latest = await dependencies.latestPing(actor.clubId);
  if (!latest) return { marked: false };
  await dependencies.putPingReadState(actor.clubId, {
    userId: actor.id,
    lastReadPingId: latest.id,
    lastReadPingAt: latest.createdAt,
  });
  return { marked: true };
}

export async function handleMuteChatUser(
  request: ChatRequest<{ readonly userId?: unknown }>,
  dependencies: ChatDependencies,
): Promise<ChatRestrictionResult> {
  const actor = await requireOfficer(request.authUid, dependencies);
  const target = await requireMemberTarget(actor, request.data.userId, dependencies);
  const existing = await dependencies.getRestriction(actor.clubId, target.id);
  if (existing?.chatBanned) {
    throw new HandlerError('failed-precondition', 'Unban this member from chat before muting them');
  }
  const updatedAt = dependencies.now();
  const restriction: ChatRestrictionRecord = {
    userId: target.id,
    mutedUntil: new Date(updatedAt.getTime() + 3_600_000),
    chatBanned: false,
    updatedAt,
    updatedById: actor.id,
  };
  await dependencies.putRestriction(actor.clubId, restriction);
  return restrictionResult(restriction);
}

export async function handleSetChatUserBanned(
  request: ChatRequest<{ readonly userId?: unknown; readonly banned?: unknown }>,
  dependencies: ChatDependencies,
): Promise<ChatRestrictionResult> {
  const actor = await requireOfficer(request.authUid, dependencies);
  const target = await requireMemberTarget(actor, request.data.userId, dependencies);
  if (typeof request.data.banned !== 'boolean') {
    throw new HandlerError('invalid-argument', 'banned must be a boolean');
  }
  const restriction: ChatRestrictionRecord = {
    userId: target.id,
    chatBanned: request.data.banned,
    updatedAt: dependencies.now(),
    updatedById: actor.id,
  };
  await dependencies.putRestriction(actor.clubId, restriction);
  return restrictionResult(restriction);
}

const requireActiveUser = async (
  id: string | undefined,
  dependencies: ChatDependencies,
): Promise<ManagedUser> => {
  if (!id) throw new HandlerError('unauthenticated', 'Authentication required');
  const user = await dependencies.getUser(id);
  if (!user || user.banned) {
    throw new HandlerError('permission-denied', 'Active membership required');
  }
  return user;
};

const requireOfficer = async (
  id: string | undefined,
  dependencies: ChatDependencies,
): Promise<ManagedUser> => {
  const actor = await requireActiveUser(id, dependencies);
  if (actor.role < 1) throw new HandlerError('permission-denied', 'Officer access required');
  return actor;
};

const requireMemberTarget = async (
  actor: ManagedUser,
  value: unknown,
  dependencies: ChatDependencies,
): Promise<ManagedUser> => {
  const id = validId(value, 'user ID');
  const target = await dependencies.getUser(id);
  if (!target) throw new HandlerError('not-found', 'User not found');
  if (target.clubId !== actor.clubId || target.id === actor.id || target.role !== 0) {
    throw new HandlerError(
      'permission-denied',
      'Only other member accounts can be moderated from chat',
    );
  }
  return target;
};

const requireCanParticipate = async (
  actor: ManagedUser,
  dependencies: ChatDependencies,
): Promise<void> => {
  const restriction = await dependencies.getRestriction(actor.clubId, actor.id);
  if (restriction?.chatBanned) {
    throw new HandlerError('permission-denied', 'You are banned from participating in chat');
  }
  if (restriction?.mutedUntil && restriction.mutedUntil.getTime() > dependencies.now().getTime()) {
    throw new HandlerError(
      'permission-denied',
      `You are muted from chat until ${restriction.mutedUntil.toISOString()}`,
    );
  }
};

const messageResult = (message: ChatMessageRecord): ChatMessageResult => ({
  id: message.id,
  body: message.body,
  createdById: message.createdById,
  createdAtMillis: message.createdAt.getTime(),
  dayKey: message.dayKey,
  isClubPing: message.isClubPing,
});

const restrictionResult = (
  restriction: ChatRestrictionRecord,
): ChatRestrictionResult => ({
  userId: restriction.userId,
  ...(restriction.mutedUntil
    ? { mutedUntilMillis: restriction.mutedUntil.getTime() }
    : {}),
  chatBanned: restriction.chatBanned,
  updatedAtMillis: restriction.updatedAt.getTime(),
  updatedById: restriction.updatedById,
});

const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HandlerError('invalid-argument', `${label} is required`);
  }
  return value.trim();
};

const validId = (value: unknown, label: string): string => {
  const id = requiredString(value, label);
  if (!/^[A-Za-z0-9_-]{1,200}$/u.test(id)) {
    throw new HandlerError('invalid-argument', `Choose a valid ${label}`);
  }
  return id;
};

const validDayKey = (value: unknown): string => {
  const result = requiredString(value, 'message day');
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(result)) {
    throw new HandlerError('invalid-argument', 'Choose a valid message day');
  }
  return result;
};

const dayKey = (date: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};

const isSingleEmoji = (value: string): boolean => {
  const normalized = value.trim();
  if (!normalized || normalized.length > 32) return false;
  const Segmenter = (
    Intl as unknown as {
      readonly Segmenter: new (
        locale?: string,
        options?: { readonly granularity: 'grapheme' },
      ) => { segment(input: string): Iterable<unknown> };
    }
  ).Segmenter;
  const segments = Array.from(
    new Segmenter(undefined, { granularity: 'grapheme' }).segment(normalized),
  );
  return segments.length === 1 && (
    /\p{Extended_Pictographic}/u.test(normalized) ||
    /\p{Regional_Indicator}/u.test(normalized) ||
    /[0-9#*]\uFE0F?\u20E3/u.test(normalized)
  );
};
