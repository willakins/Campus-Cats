import sgMail from '@sendgrid/mail';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

interface Options {
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
  readonly presidentEmail: string;
  readonly billingEmail: string;
  readonly webOrigin: string;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.INVITATION_FROM_EMAIL ?? 'gtcampuscats@gmail.com';
  if (!sendgridKey) {
    throw new Error('SENDGRID_API_KEY is required to send the President invitation');
  }

  if (getApps().length === 0) initializeApp();
  const auth = getAuth();
  const firestore = getFirestore();
  let authUser: UserRecord;
  let createdAuthUser = false;
  let profileProvisioned = false;
  try {
    authUser = await auth.getUserByEmail(options.presidentEmail);
  } catch (error) {
    if (!hasCode(error, 'auth/user-not-found')) throw error;
    authUser = await auth.createUser({
      email: options.presidentEmail,
      emailVerified: false,
      disabled: false,
    });
    createdAuthUser = true;
  }

  try {
    const userReference = firestore.collection('users').doc(authUser.uid);
    const clubReference = firestore.collection('clubs').doc(options.slug);
    const accessReference = clubReference.collection('access').doc('public');
    await firestore.runTransaction(async (transaction) => {
      const presidents = firestore
        .collection('users')
        .where('clubId', '==', options.slug)
        .where('role', '==', 3);
      const [club, user, existingPresidents] = await Promise.all([
        transaction.get(clubReference),
        transaction.get(userReference),
        transaction.get(presidents),
      ]);
      if (user.exists && user.data()?.clubId !== options.slug) {
        throw new Error('The President account already belongs to another club');
      }
      if (
        existingPresidents.docs.some(
          (president) => president.id !== authUser.uid,
        )
      ) {
        throw new Error('The club already has a different President');
      }
      if (club.exists) {
        const data = club.data();
        if (
          data?.name !== options.name ||
          data?.timezone !== options.timezone ||
          data?.billingEmail !== options.billingEmail
        ) {
          throw new Error('The club slug already exists with different details');
        }
      } else {
        transaction.create(clubReference, {
          name: options.name,
          slug: options.slug,
          timezone: options.timezone,
          billingEmail: options.billingEmail,
          billingEnforcementEnabled: true,
          accessState: 'pending_setup',
          paymentStanding: 'current',
          collectionMethod: 'manual',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        transaction.create(
          firestore.collection('billing-accounts').doc(options.slug),
          {
            collectionMethod: 'manual',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          },
        );
      }
      transaction.set(
        userReference,
        {
          email: options.presidentEmail,
          role: 3,
          clubId: options.slug,
          platformAdmin: false,
          banned: false,
          disciplinaryNotices: [],
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
      transaction.set(
        clubReference,
        { presidentUserId: authUser.uid, updatedAt: Timestamp.now() },
        { merge: true },
      );
      transaction.set(
        clubReference.collection('public-profiles').doc(authUser.uid),
        {
          displayName: displayName(options.presidentEmail),
          bio: '',
          profilePhotoUrl: '',
          role: 3,
          achievementIds: ['president'],
          selectedTitleId: 'president',
          clubId: options.slug,
        },
        { merge: true },
      );
      transaction.set(
        accessReference,
        {
          clubId: options.slug,
          clubName: options.name,
          timezone: options.timezone,
          billingEnforcementEnabled: true,
          maintenanceMode: false,
          accessState: 'pending_setup',
          paymentStanding: 'current',
          collectionMethod: 'manual',
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
    });
    profileProvisioned = true;

    const link = await auth.generatePasswordResetLink(options.presidentEmail, {
      url: `${options.webOrigin}/login`,
    });
    sgMail.setApiKey(sendgridKey);
    await sgMail.send({
      to: options.presidentEmail,
      from: fromEmail,
      subject: `Set up ${options.name} on Campus Cats`,
      text: [
        `You have been invited as the President of ${options.name} on Campus Cats.`,
        'Set your password using the secure link below, then sign in on the web to choose monthly invoices or automatic payments.',
        link,
        '',
        'Questions? Contact willakins23@gmail.com.',
      ].join('\n\n'),
    });
    await clubReference.set(
      {
        presidentInvitationSentAt: Timestamp.now(),
        presidentUserId: authUser.uid,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    process.stdout.write(`Created club ${options.slug} and invited ${options.presidentEmail}.\n`);
  } catch (error) {
    if (createdAuthUser && !profileProvisioned) {
      await auth.deleteUser(authUser.uid).catch(() => undefined);
    }
    throw error;
  }
}

function parseOptions(args: readonly string[]): Options {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || !value || value.startsWith('--')) {
      usage();
    }
    values.set(key.slice(2), value.trim());
  }
  const required = (key: string) => {
    const value = values.get(key);
    if (!value) usage();
    return value;
  };
  const slug = required('slug');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    throw new Error('slug must be lowercase letters, numbers, and single hyphens');
  }
  const timezone = required('timezone');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    throw new Error('timezone must be a valid IANA timezone');
  }
  const presidentEmail = email(required('president-email'), 'president-email');
  const billingEmail = email(required('billing-email'), 'billing-email');
  const webOrigin = origin(
    values.get('web-origin') ?? 'https://campuscats-d7a5e.web.app',
  );
  return {
    name: required('name').slice(0, 160),
    slug,
    timezone,
    presidentEmail,
    billingEmail,
    webOrigin,
  };
}

function email(value: string, field: string): string {
  const normalized = value.toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new Error(`${field} must be a valid email address`);
  }
  return normalized;
}

function origin(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error('web-origin must use HTTPS');
  }
  return parsed.origin;
}

function displayName(emailAddress: string): string {
  return (emailAddress.split('@')[0]?.trim() || 'Campus Cats President').slice(
    0,
    60,
  );
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

function usage(): never {
  throw new Error(
    'Usage: npm run admin:create-club -- --name "Club" --slug club --timezone America/New_York --president-email president@example.com --billing-email billing@example.com [--web-origin https://app.example.com]',
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
