import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

admin.initializeApp();

// 🔑 Replace with your actual SendGrid API key (set in env)
sgMail.setApiKey(functions.config().sendgrid.key);

export const sendWhitelistEmail = functions.https.onCall(async (request) => {
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
