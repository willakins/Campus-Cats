import * as admin from "firebase-admin"
import * as functions from "firebase-functions/v2"
import * as logger from "firebase-functions/logger";
import sgMail from '@sendgrid/mail';

if (admin.apps.length === 0) {
  admin.initializeApp()
}
import { defineSecret } from "firebase-functions/params";
const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");

export const sendWhitelistEmail = functions.https.onCall(
  {
    secrets: [SENDGRID_API_KEY],
  },
  async (request) => {
  sgMail.setApiKey(SENDGRID_API_KEY.value());
  const uid = request.auth?.uid
  if (uid === undefined) {
    throw new functions.https.HttpsError("unauthenticated", "You need to be authenticated to perform this action")
  }
  const { email, password } = request.data; // Access the email and password from the request data
  
  if (!email || !password) {
      throw new functions.https.HttpsError('invalid-argument', 'Email and password are required');
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
});

export const createWhitelistUser = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ email: string; password: string }>) => {
    const { email, password } = request.data;

    if (!email || !password) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing email or password');
    }
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
      });
      logger.debug("userRecord.uid", userRecord.uid);
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        email,
        password,
        role: 0,
      });

      return { success: true, uid: userRecord.uid };
    } catch (error) {
      console.error('Failed to create user:', error);
      throw new functions.https.HttpsError('internal', 'User creation failed');
    }
  }
);