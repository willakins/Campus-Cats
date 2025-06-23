import sgMail from '@sendgrid/mail';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import * as functions from 'firebase-functions/v2';
import fetch from 'node-fetch';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');

export const sendWhitelistEmail = functions.https.onCall(
  {
    secrets: [SENDGRID_API_KEY],
  },
  async (request) => {
    sgMail.setApiKey(SENDGRID_API_KEY.value());
    const uid = request.auth?.uid;
    if (uid === undefined) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You need to be authenticated to perform this action',
      );
    }
    const { email, password } = request.data;

    if (!email || !password) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Email and password are required',
      );
    }

    const msg = {
      to: email,
      from: 'gtcampuscats@gmail.com',
      subject: 'Campus Cats – Whitelist Approved!',
      text: `Welcome! Your whitelist application has been approved. You can use this email as your username. Your login password is: ${password}`,
      html: `<p>Welcome to Campus Cats! 😺</p><p>You can use this email as your username.</p><p>Your password is: <strong>${password}</strong></p>`,
    };

    try {
      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new functions.https.HttpsError('unknown', 'Failed to send email');
    }
  },
);

export const createWhitelistUser = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<{
      email: string;
      password: string;
    }>,
  ) => {
    const { email, password } = request.data;

    if (!email || !password) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing email or password',
      );
    }
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
      });
      logger.debug('userRecord.uid', userRecord.uid);
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        email,
        role: 0,
      });

      return { success: true, uid: userRecord.uid };
    } catch (error) {
      console.error('Failed to create user:', error);
      throw new functions.https.HttpsError('internal', 'User creation failed');
    }
  },
);

export const sendAnnouncement = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unknown',
      'You need to be authenticated to perform this action',
    );
  }
  const uid = request.auth?.uid;
  if (uid === undefined) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'You need to be authenticated to perform this action',
    );
  }

  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role == 0) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can send announcements.',
    );
  }

  // Not really sure this is needed ngl
  const { title, message } = request.data;
  if (!title || !message) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing title or message',
    );
  }

  const usersSnap = await admin.firestore().collection('users').get();
  const tokens = usersSnap.docs
    .map((doc) => doc.data().expoPushToken) // get all the tokens
    .filter(Boolean); // remove everything that dont exist

  const chunks = [];
  for (let i = 0; i < tokens.length; i += 100) {
    chunks.push(tokens.slice(i, i + 100)); // Allows at most 100 notifications at a time, I genuinely don't think this is neccessary
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      await fetch('https://exp.host/--/api/v2/push/send', {
        // I think this is neccessary for notifications
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          chunk.map((token) => ({
            to: token,
            sound: 'default',
            title,
            body: message,
          })),
        ),
      });
    }),
  );

  return { success: true, sent: tokens.length };
});
