import { createHash } from 'node:crypto';

import sgMail from '@sendgrid/mail';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import {
  CallableRequest,
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';

import {
  HandlerDependencies,
  HandlerError,
  ManagedUser,
  WhitelistApplication,
  handleCreateWhitelistUser,
  handleRemoveManagedUser,
  handleSendAnnouncement,
  handleSendWhitelistEmail,
  handleSubmitWhitelistApplication,
  handleUpdateUserRole,
} from './handlers';

if (admin.apps.length === 0) admin.initializeApp();

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
const firestore = admin.firestore();
const auth = admin.auth();

const dependencies: HandlerDependencies = {
  async getUser(id): Promise<ManagedUser | undefined> {
    const snapshot = await firestore.collection('users').doc(id).get();
    if (!snapshot.exists) return undefined;
    const data = snapshot.data();
    if (
      typeof data?.email !== 'string' ||
      (data.role !== 0 && data.role !== 1 && data.role !== 2)
    ) {
      throw new HandlerError('internal', 'Stored user profile is invalid');
    }
    return { id: snapshot.id, email: data.email, role: data.role };
  },

  async listPushTokens() {
    const snapshot = await firestore.collection('users').get();
    return snapshot.docs
      .map((document) => document.data().expoPushToken)
      .filter((token): token is string => typeof token === 'string' && !!token);
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

  async createAuthUser(email, password) {
    return (await auth.createUser({ email, password })).uid;
  },

  async deleteAuthUser(id) {
    await auth.deleteUser(id);
  },

  async putUser(user) {
    await firestore.collection('users').doc(user.id).set({
      email: user.email,
      role: user.role,
    });
  },

  async deleteUser(id) {
    await firestore.collection('users').doc(id).delete();
  },

  async updateUserRole(id, role) {
    await firestore.collection('users').doc(id).update({ role });
  },

  async sendWhitelistCredentials(email, password) {
    sgMail.setApiKey(SENDGRID_API_KEY.value());
    await sgMail.send({
      to: email,
      from: 'gtcampuscats@gmail.com',
      subject: 'Campus Cats – Whitelist Approved!',
      text: `Your Campus Cats account is ready. Your temporary password is: ${password}`,
      html: `<p>Your Campus Cats account is ready.</p><p>Your temporary password is: <strong>${password}</strong></p>`,
    });
  },

  async findWhitelistByEmail(email) {
    const snapshot = await firestore
      .collection('whitelist')
      .where('email', '==', email)
      .limit(1)
      .get();
    return !snapshot.empty;
  },

  async createWhitelistApplication(application: WhitelistApplication) {
    const id = createHash('sha256')
      .update(application.email.toLowerCase())
      .digest('hex');
    try {
      await firestore.collection('whitelist').doc(id).create(application);
      return { created: true, id };
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : '';
      if (code === '6' || code.toLowerCase().includes('already-exists')) {
        return { created: false, id };
      }
      throw error;
    }
  },
};

async function execute<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HandlerError) {
      throw new HttpsError(error.code, error.message);
    }
    logger.error('Callable workflow failed', error);
    throw new HttpsError('internal', 'The requested operation could not be completed');
  }
}

const requestFor = <T>(request: CallableRequest<T>) => ({
  authUid: request.auth?.uid,
  data: request.data,
});

export const sendWhitelistEmail = onCall(
  { secrets: [SENDGRID_API_KEY] },
  (request) =>
    execute(() =>
      handleSendWhitelistEmail(requestFor(request), dependencies),
    ),
);

export const createWhitelistUser = onCall((request) =>
  execute(() => handleCreateWhitelistUser(requestFor(request), dependencies)),
);

export const removeWhitelistUser = onCall((request) =>
  execute(() => handleRemoveManagedUser(requestFor(request), dependencies)),
);

export const updateUserRole = onCall((request) =>
  execute(() => handleUpdateUserRole(requestFor(request), dependencies)),
);

export const removeManagedUser = onCall((request) =>
  execute(() => handleRemoveManagedUser(requestFor(request), dependencies)),
);

export const sendAnnouncement = onCall((request) =>
  execute(() => handleSendAnnouncement(requestFor(request), dependencies)),
);

export const submitWhitelistApplication = onCall((request) =>
  execute(() =>
    handleSubmitWhitelistApplication(requestFor(request), dependencies),
  ),
);
