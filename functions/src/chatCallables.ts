import { getApps, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/logger';
import {
  CallableRequest,
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';

import {
  ChatDependencies,
  ChatMessageRecord,
  handleMarkChatPingsRead,
  handleMuteChatUser,
  handleSendChatMessage,
  handleSetChatReaction,
  handleSetChatUserBanned,
} from './chat';
import { HandlerError, ManagedUser } from './handlers';

if (getApps().length === 0) initializeApp();

const firestore = getFirestore();
const tenantCollection = (clubId: string, collectionName: string) =>
  firestore.collection('clubs').doc(clubId).collection(collectionName);

const getUser = async (id: string): Promise<ManagedUser | undefined> => {
  const snapshot = await firestore.collection('users').doc(id).get();
  if (!snapshot.exists) return undefined;
  const data = snapshot.data();
  if (
    typeof data?.email !== 'string' ||
    (data.role !== 0 &&
      data.role !== 1 &&
      data.role !== 2 &&
      data.role !== 3 &&
      data.role !== 4)
  ) {
    throw new HandlerError('internal', 'Stored user profile is invalid');
  }
  const clubId = typeof data.clubId === 'string' ? data.clubId : 'campus-cats';
  const clubData = (
    await firestore.collection('clubs').doc(clubId).get()
  ).data();
  const now = new Date();
  const graceEndsAt =
    clubData?.graceEndsAt instanceof Timestamp
      ? clubData.graceEndsAt.toDate()
      : undefined;
  const scheduledEndAt =
    clubData?.scheduledEndAt instanceof Timestamp
      ? clubData.scheduledEndAt.toDate()
      : undefined;
  const hasAccess =
    clubData?.maintenanceMode !== true &&
    (clubData?.billingEnforcementEnabled !== true ||
      (clubData?.accessState === 'enabled' &&
        (!graceEndsAt || now < graceEndsAt) &&
        (!scheduledEndAt || now < scheduledEndAt)));
  if (!hasAccess) return undefined;
  return {
    id: snapshot.id,
    email: data.email,
    role: data.role,
    clubId,
    platformAdmin: data.platformAdmin === true,
    banned: data.banned === true,
  };
};

const storedChatMessage = (
  id: string,
  data: Record<string, unknown> | undefined,
): ChatMessageRecord => {
  if (
    !data ||
    typeof data.body !== 'string' ||
    typeof data.createdById !== 'string' ||
    !(data.createdAt instanceof Timestamp) ||
    typeof data.dayKey !== 'string' ||
    typeof data.isClubPing !== 'boolean'
  ) {
    throw new HandlerError('internal', 'Stored chat message is invalid');
  }
  return {
    id,
    body: data.body,
    createdById: data.createdById,
    createdAt: data.createdAt.toDate(),
    dayKey: data.dayKey,
    isClubPing: data.isClubPing,
  };
};

const chatDependencies: ChatDependencies = {
  now: () => new Date(),
  getUser,
  async getClub(clubId) {
    const snapshot = await firestore.collection('clubs').doc(clubId).get();
    const data = snapshot.data();
    if (
      !snapshot.exists ||
      typeof data?.name !== 'string' ||
      typeof data.timezone !== 'string'
    ) {
      throw new HandlerError('internal', 'Stored club is invalid');
    }
    return { name: data.name, timezone: data.timezone };
  },
  async getPublicProfileName(userId, clubId) {
    const snapshot = await tenantCollection(clubId, 'public-profiles')
      .doc(userId)
      .get();
    const displayName = snapshot.data()?.displayName;
    return typeof displayName === 'string' && displayName.trim()
      ? displayName.trim()
      : undefined;
  },
  async getMessage(clubId, id) {
    const snapshot = await tenantCollection(clubId, 'chat-messages')
      .doc(id)
      .get();
    return snapshot.exists
      ? storedChatMessage(snapshot.id, snapshot.data())
      : undefined;
  },
  async putMessage(clubId, message) {
    await tenantCollection(clubId, 'chat-messages')
      .doc(message.id)
      .create({
        body: message.body,
        createdById: message.createdById,
        createdAt: Timestamp.fromDate(message.createdAt),
        dayKey: message.dayKey,
        isClubPing: message.isClubPing,
      });
  },
  async getReaction(clubId, id) {
    const snapshot = await tenantCollection(clubId, 'chat-reactions')
      .doc(id)
      .get();
    const emoji = snapshot.data()?.emoji;
    return typeof emoji === 'string' ? emoji : undefined;
  },
  async putReaction(clubId, id, reaction) {
    await tenantCollection(clubId, 'chat-reactions')
      .doc(id)
      .set({
        messageId: reaction.messageId,
        messageDayKey: reaction.messageDayKey,
        userId: reaction.userId,
        emoji: reaction.emoji,
        updatedAt: Timestamp.fromDate(reaction.updatedAt),
      });
  },
  async removeReaction(clubId, id) {
    await tenantCollection(clubId, 'chat-reactions').doc(id).delete();
  },
  async getRestriction(clubId, userId) {
    const snapshot = await tenantCollection(clubId, 'chat-restrictions')
      .doc(userId)
      .get();
    if (!snapshot.exists) return undefined;
    const data = snapshot.data();
    if (
      typeof data?.chatBanned !== 'boolean' ||
      !(data.updatedAt instanceof Timestamp) ||
      typeof data.updatedById !== 'string' ||
      (data.mutedUntil !== undefined && !(data.mutedUntil instanceof Timestamp))
    ) {
      throw new HandlerError('internal', 'Stored chat restriction is invalid');
    }
    return {
      userId: snapshot.id,
      ...(data.mutedUntil instanceof Timestamp
        ? { mutedUntil: data.mutedUntil.toDate() }
        : {}),
      chatBanned: data.chatBanned,
      updatedAt: data.updatedAt.toDate(),
      updatedById: data.updatedById,
    };
  },
  async putRestriction(clubId, restriction) {
    await tenantCollection(clubId, 'chat-restrictions')
      .doc(restriction.userId)
      .set({
        chatBanned: restriction.chatBanned,
        ...(restriction.mutedUntil
          ? { mutedUntil: Timestamp.fromDate(restriction.mutedUntil) }
          : {}),
        updatedAt: Timestamp.fromDate(restriction.updatedAt),
        updatedById: restriction.updatedById,
      });
  },
  async latestPing(clubId) {
    const snapshot = await tenantCollection(clubId, 'chat-messages')
      .where('isClubPing', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    const document = snapshot.docs[0];
    return document
      ? storedChatMessage(document.id, document.data())
      : undefined;
  },
  async putPingReadState(clubId, state) {
    await tenantCollection(clubId, 'chat-ping-reads')
      .doc(state.userId)
      .set({
        lastReadPingId: state.lastReadPingId,
        lastReadPingAt: Timestamp.fromDate(state.lastReadPingAt),
      });
  },
  async listPushRecipients(clubId) {
    const snapshot = await firestore
      .collection('users')
      .where('clubId', '==', clubId)
      .get();
    return snapshot.docs.flatMap((document) => {
      const data = document.data();
      return data.banned !== true && typeof data.expoPushToken === 'string'
        ? [{ userId: document.id, token: data.expoPushToken }]
        : [];
    });
  },
  async sendPushBatch(messages) {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      throw new Error(`Expo push provider returned ${response.status}`);
    }
  },
};

const requestFor = <T>(request: CallableRequest<T>) => ({
  authUid: request.auth?.uid,
  data: request.data,
});

const execute = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HandlerError) {
      throw new HttpsError(error.code, error.message);
    }
    logger.error('Callable workflow failed', error);
    throw new HttpsError(
      'internal',
      'The requested operation could not be completed',
    );
  }
};

export const sendChatMessage = onCall((request) =>
  execute(() => handleSendChatMessage(requestFor(request), chatDependencies)),
);

export const setChatReaction = onCall((request) =>
  execute(() => handleSetChatReaction(requestFor(request), chatDependencies)),
);

export const markChatPingsRead = onCall((request) =>
  execute(() => handleMarkChatPingsRead(requestFor(request), chatDependencies)),
);

export const muteChatUser = onCall((request) =>
  execute(() => handleMuteChatUser(requestFor(request), chatDependencies)),
);

export const setChatUserBanned = onCall((request) =>
  execute(() => handleSetChatUserBanned(requestFor(request), chatDependencies)),
);
