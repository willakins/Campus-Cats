import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import sgMail from '@sendgrid/mail';
import { verifiedAccountRequest } from '../shared/firebaseCallableAccess';
import { PLATFORM_INFO } from '../platformInfo';
import { SafetyActor, SafetyReports } from './reports';
import { revokeMemberSessions } from '../platform/sessionRevocation';

if (getApps().length === 0) initializeApp();
const db = getFirestore();
const reports = new SafetyReports(db);

const callable = (
  operation: (actor: SafetyActor, data: unknown) => Promise<unknown>,
) =>
  onCall(async (request) => {
    const verified = await verifiedAccountRequest(request);
    return operation(
      {
        uid: verified.authUid,
        authTime: request.auth!.token.auth_time,
        email: request.auth!.token.email ?? '',
      },
      verified.data,
    );
  });

export const submitSafetyReport = callable((actor, data) =>
  reports.submit(actor, data),
);
export const listSafetyReports = callable((actor, data) =>
  reports.list(actor, data),
);
export const updateSafetyReport = callable((actor, data) =>
  reports.update(actor, data),
);
export const moderateSafetyReport = callable(async (actor, data) => {
  const result = await reports.moderate(actor, data);
  const action = data as { action: string; targetId: string };
  if (action.action === 'restrict-account') {
    // The database restriction is already effective if Auth is temporarily unavailable.
    // Retrying the action repeats this revocation safely.
    await revokeMemberSessions(db, getAuth(), action.targetId);
  }
  return result;
});

const apiKey = defineSecret('SENDGRID_API_KEY');
const sender = defineString('INVITATION_FROM_EMAIL', {
  default: 'gtcampuscats@gmail.com',
});

export const notifySafetyReport = onDocumentCreated(
  {
    document: 'safety-reports/{reportId}',
    secrets: [apiKey],
    retry: true,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const current = await snapshot.ref.get();
    if (!current.exists || current.data()?.notificationState === 'sent') return;
    sgMail.setApiKey(apiKey.value());
    try {
      // Never email the report text, content link, or reporter identity.
      await sgMail.send({
        to: PLATFORM_INFO.supportEmail,
        from: sender.value(),
        subject: 'Campus Cats: new safety report',
        text: `A safety report was received. Sign in as a platform administrator to review it at ${PLATFORM_INFO.webAppOrigin}/safety/inbox. Reference: ${snapshot.id}`,
      });
    } catch {
      // Do not propagate provider errors containing request bodies or contact information.
      throw new Error(
        'Safety report notification delivery failed; retry required',
      );
    }
    await snapshot.ref.update({ notificationState: 'sent' });
  },
);
