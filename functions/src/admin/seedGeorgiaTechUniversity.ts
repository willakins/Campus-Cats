import { getApps, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

const GEORGIA_TECH_SCORECARD_ID = '139755';

async function main(): Promise<void> {
  if (getApps().length === 0) initializeApp();
  const firestore = getFirestore();
  const now = Timestamp.now();
  const batch = firestore.batch();
  batch.set(
    firestore.collection('university-overrides').doc(GEORGIA_TECH_SCORECARD_ID),
    {
      aliases: ['Georgia Tech', 'GT'],
      emailDomains: ['gatech.edu'],
      updatedAt: now,
    },
    { merge: true },
  );
  batch.set(
    firestore.collection('university-clubs').doc(GEORGIA_TECH_SCORECARD_ID),
    {
      universityId: GEORGIA_TECH_SCORECARD_ID,
      universityName: 'Georgia Institute of Technology-Main Campus',
      clubId: 'campus-cats',
      clubName: 'Campus Cats',
      emailEnabled: true,
      samlProvider: 'gt-sso',
      samlLabel: 'Georgia Tech SSO',
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
  batch.set(
    firestore.collection('clubs').doc('campus-cats'),
    { universityId: GEORGIA_TECH_SCORECARD_ID, updatedAt: now },
    { merge: true },
  );
  await batch.commit();
  process.stdout.write('Seeded Georgia Tech university mapping.\n');
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
