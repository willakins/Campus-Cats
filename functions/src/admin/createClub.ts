import sgMail from '@sendgrid/mail';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import { ClubProvisioningService } from '../clubProvisioning';

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
  const service = new ClubProvisioningService({
    auth: getAuth(),
    firestore: getFirestore(),
    webOrigin: () => options.webOrigin,
    sendPasswordSetup: async (emailAddress, clubName, link) => {
      sgMail.setApiKey(sendgridKey);
      await sgMail.send({
        to: emailAddress,
        from: fromEmail,
        subject: `Set up ${clubName} on Campus Cats`,
        text: [
          `You have been invited as the President of ${clubName} on Campus Cats.`,
          'Set your password using the secure link below, then sign in on the web to choose monthly invoices or automatic payments.',
          link,
          '',
          'Questions? Contact willakins23@gmail.com.',
        ].join('\n\n'),
      });
    },
  });
  await service.provision({
    clubId: options.slug,
    clubName: options.name,
    timezone: options.timezone,
    presidentEmail: options.presidentEmail,
    billingEmail: options.billingEmail,
    primaryColor: '#18314F',
    accentColor: '#B58A16',
  });
  process.stdout.write(`Created club ${options.slug} and invited ${options.presidentEmail}.\n`);
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

function usage(): never {
  throw new Error(
    'Usage: npm run admin:create-club -- --name "Club" --slug club --timezone America/New_York --president-email president@example.com --billing-email billing@example.com [--web-origin https://app.example.com]',
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
