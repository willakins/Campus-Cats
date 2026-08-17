import { getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, Timestamp, getFirestore } from 'firebase-admin/firestore';

const CLUB_ID = 'campus-cats';
const CLUB_NAME = 'Campus Cats';
const CLUB_TIMEZONE = 'America/New_York';
const CLUB_BILLING_EMAIL = 'willakins23@gmail.com';

export async function enableCampusCatsBilling(
  firestore: Firestore,
  apply: boolean,
): Promise<'pending_setup' | 'already_subscribed'> {
  return firestore.runTransaction(async (transaction) => {
    const clubReference = firestore.collection('clubs').doc(CLUB_ID);
    const accessReference = clubReference.collection('access').doc('public');
    const accountReference = firestore.collection('billing-accounts').doc(CLUB_ID);
    const [club, account] = await Promise.all([
      transaction.get(clubReference),
      transaction.get(accountReference),
    ]);
    if (!club.exists) throw new Error('Campus Cats club does not exist');
    const clubData = club.data()!;
    const clubName = typeof clubData.name === 'string'
      ? clubData.name
      : CLUB_NAME;
    const timezone = typeof clubData.timezone === 'string'
      ? clubData.timezone
      : CLUB_TIMEZONE;
    const billingEmail = typeof clubData.billingEmail === 'string'
      ? clubData.billingEmail
      : CLUB_BILLING_EMAIL;
    const collectionMethod = clubData.collectionMethod === 'automatic'
      ? 'automatic'
      : 'manual';
    const subscribed = typeof account.data()?.subscriptionId === 'string' &&
      account.data()!.subscriptionId.trim().length > 0;
    const existingAccessState =
      clubData.accessState === 'pending_setup' ||
      clubData.accessState === 'enabled' ||
      clubData.accessState === 'suspended'
        ? clubData.accessState
        : 'suspended';
    const accessState = subscribed ? existingAccessState : 'pending_setup';
    if (apply) {
      const now = Timestamp.now();
      transaction.set(
        clubReference,
        {
          name: clubName,
          slug: CLUB_ID,
          timezone,
          billingEmail,
          billingEnforcementEnabled: true,
          maintenanceMode: clubData.maintenanceMode === true,
          accessState,
          collectionMethod,
          ...(subscribed
            ? {}
            : {
                paymentStanding: 'current',
                suspensionReason: null,
                scheduledEndAt: null,
                graceEndsAt: null,
                invoiceDueAt: null,
              }),
          updatedAt: now,
        },
        { merge: true },
      );
      transaction.set(
        accessReference,
        {
          clubId: CLUB_ID,
          clubName,
          timezone,
          billingEnforcementEnabled: true,
          maintenanceMode: clubData.maintenanceMode === true,
          accessState,
          paymentStanding: subscribed && clubData.paymentStanding === 'past_due'
            ? 'past_due'
            : 'current',
          collectionMethod,
          ...(subscribed && clubData.invoiceDueAt
            ? { invoiceDueAt: clubData.invoiceDueAt }
            : {}),
          ...(subscribed && clubData.graceEndsAt
            ? { graceEndsAt: clubData.graceEndsAt }
            : {}),
          ...(subscribed && clubData.scheduledEndAt
            ? { scheduledEndAt: clubData.scheduledEndAt }
            : {}),
          ...(subscribed && clubData.suspensionReason
            ? { suspensionReason: clubData.suspensionReason }
            : {}),
          updatedAt: now,
        },
      );
      if (!account.exists) {
        transaction.create(accountReference, {
          collectionMethod: 'manual',
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    return subscribed ? 'already_subscribed' : 'pending_setup';
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const projectIndex = args.indexOf('--project');
  const projectId = projectIndex >= 0 ? args[projectIndex + 1] : undefined;
  const expectedArguments = new Set([
    '--apply',
    '--project',
    ...(projectId ? [projectId] : []),
  ]);
  if (
    !projectId ||
    projectId.startsWith('--') ||
    args.some((argument) => !expectedArguments.has(argument))
  ) {
    throw new Error(
      'Usage: npm run admin:enable-campus-cats-billing -- --project PROJECT_ID [--apply]',
    );
  }
  if (getApps().length === 0) initializeApp({ projectId });
  const result = await enableCampusCatsBilling(getFirestore(), apply);
  process.stdout.write(
    apply
      ? `Campus Cats billing enforcement enabled (${result}).\n`
      : `Dry run: Campus Cats would enter ${result}. Re-run with --apply to write.\n`,
  );
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
