import {
  ChatDay,
  ChatMessage,
  ChatRestriction,
  User,
} from '../domain';

export interface ChatSendReceipt {
  readonly message: ChatMessage;
  readonly notificationFailed: boolean;
}

export interface ChatPingState {
  readonly latestPing?: ChatMessage;
  readonly unread: boolean;
}

export class ChatGatewayError extends Error {
  constructor(
    readonly code: 'conflict' | 'forbidden' | 'validation',
    message: string,
  ) {
    super(message);
  }
}

export interface ChatGateway {
  getDay(actor: User, dayKey: string): Promise<ChatDay>;
  observeDay(
    actor: User,
    dayKey: string,
    onChange: (day: ChatDay) => void,
    onError: (error: unknown) => void,
  ): () => void;
  findPreviousActiveDay(
    actor: User,
    beforeDayKey: string,
  ): Promise<string | undefined>;
  sendMessage(
    actor: User,
    input: {
      readonly id: string;
      readonly body: string;
      readonly isClubPing: boolean;
    },
  ): Promise<ChatSendReceipt>;
  setReaction(
    actor: User,
    input: {
      readonly messageId: string;
      readonly messageDayKey: string;
      readonly emoji?: string;
    },
  ): Promise<void>;
  observePingState(
    actor: User,
    onChange: (state: ChatPingState) => void,
    onError: (error: unknown) => void,
  ): () => void;
  markPingsRead(actor: User): Promise<void>;
  observeCurrentRestriction(
    actor: User,
    onChange: (restriction: ChatRestriction | undefined) => void,
    onError: (error: unknown) => void,
  ): () => void;
  getRestriction(
    actor: User,
    userId: string,
  ): Promise<ChatRestriction | undefined>;
  muteForOneHour(actor: User, userId: string): Promise<ChatRestriction>;
  setChatBanned(
    actor: User,
    userId: string,
    banned: boolean,
  ): Promise<ChatRestriction>;
}
