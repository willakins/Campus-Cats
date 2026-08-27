import { z } from 'zod';

import { chatMessageIdSchema, userIdSchema } from './ids';
import { publicProfileSchema } from './models';

const validDate = z.date().refine((date) => !Number.isNaN(date.getTime()), {
  message: 'Expected a valid date',
});

export const CHAT_MESSAGE_CHARACTER_LIMIT = 1_000;
export const CHAT_MUTE_DURATION_MS = 60 * 60 * 1_000;

export const chatDayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const chatMessageSchema = z.object({
  id: chatMessageIdSchema,
  body: z.string().trim().min(1).max(CHAT_MESSAGE_CHARACTER_LIMIT),
  createdById: userIdSchema,
  createdAt: validDate,
  dayKey: chatDayKeySchema,
  isClubPing: z.boolean().default(false),
  author: publicProfileSchema.optional(),
});

export const chatReactionSchema = z.object({
  messageId: chatMessageIdSchema,
  messageDayKey: chatDayKeySchema,
  userId: userIdSchema,
  emoji: z.string().trim().min(1).max(32),
  updatedAt: validDate,
});

export const chatRestrictionSchema = z.object({
  userId: userIdSchema,
  mutedUntil: validDate.optional(),
  chatBanned: z.boolean().default(false),
  updatedAt: validDate,
  updatedById: userIdSchema,
});

export const chatPingReadStateSchema = z.object({
  userId: userIdSchema,
  lastReadPingId: chatMessageIdSchema,
  lastReadPingAt: validDate,
});

export const chatDaySchema = z.object({
  dayKey: chatDayKeySchema,
  messages: z.array(chatMessageSchema),
  reactions: z.array(chatReactionSchema),
});

export type ChatMessage = Readonly<z.infer<typeof chatMessageSchema>>;
export type ChatReaction = Readonly<z.infer<typeof chatReactionSchema>>;
export type ChatRestriction = Readonly<z.infer<typeof chatRestrictionSchema>>;
export type ChatPingReadState = Readonly<
  z.infer<typeof chatPingReadStateSchema>
>;
export type ChatDay = Readonly<z.infer<typeof chatDaySchema>>;

export const parseChatMessage = (value: unknown): ChatMessage =>
  Object.freeze(chatMessageSchema.parse(value));
export const parseChatReaction = (value: unknown): ChatReaction =>
  Object.freeze(chatReactionSchema.parse(value));
export const parseChatRestriction = (value: unknown): ChatRestriction =>
  Object.freeze(chatRestrictionSchema.parse(value));
export const parseChatPingReadState = (value: unknown): ChatPingReadState =>
  Object.freeze(chatPingReadStateSchema.parse(value));
export const parseChatDay = (value: unknown): ChatDay =>
  Object.freeze(chatDaySchema.parse(value));

export const chatDayKey = (date: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');
  if (!year || !month || !day) throw new Error('Could not resolve club day');
  return chatDayKeySchema.parse(`${year}-${month}-${day}`);
};

export const isSingleEmoji = (value: string): boolean => {
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
  if (segments.length !== 1) return false;
  return (
    /\p{Extended_Pictographic}/u.test(normalized) ||
    /\p{Regional_Indicator}/u.test(normalized) ||
    /[0-9#*]\uFE0F?\u20E3/u.test(normalized)
  );
};

export const chatRestrictionActive = (
  restriction: ChatRestriction | undefined,
  now: Date,
): boolean =>
  Boolean(
    restriction?.chatBanned ||
      (restriction?.mutedUntil && restriction.mutedUntil.getTime() > now.getTime()),
  );

export const chatPingUnread = (
  latestPing: ChatMessage | undefined,
  readState: ChatPingReadState | undefined,
  userId: string,
): boolean =>
  Boolean(
    latestPing &&
      latestPing.createdById !== userId &&
      (!readState ||
        latestPing.createdAt.getTime() > readState.lastReadPingAt.getTime() ||
        (latestPing.createdAt.getTime() === readState.lastReadPingAt.getTime() &&
          latestPing.id !== readState.lastReadPingId)),
  );
