/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();

// 🔑 Replace with your actual SendGrid API key (set in env)
sgMail.setApiKey(functions.config().sendgrid.key);

exports.sendWhitelistEmail = functions.https.onCall(async (data: { email: any; password: any; }, context: any) => {
  const { email, password } = data;

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
