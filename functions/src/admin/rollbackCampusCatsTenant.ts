import { createHash } from 'node:crypto';

import { getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  FieldPath,
  FieldValue,
  GeoPoint,
  Timestamp,
  getFirestore,
} from 'firebase-admin/firestore';

import { compareFirestoreDocumentIds } from './firestoreDocumentOrder';

const BATCH_SIZE = 400;

async function main(): Promise<void> {
  const runId = requiredArgument(process.argv.slice(2), '--run-id');
  if (getApps().length === 0) initializeApp();
  const firestore = getFirestore();
  const runReference = firestore.collection('migration-runs').doc(runId);
  const run = await runReference.get();
  if (!run.exists) throw new Error(`Migration run ${runId} was not found`);
  const data = run.data()!;
  const clubId = typeof data.clubId === 'string' ? data.clubId : undefined;
  if (!clubId) throw new Error('Migration run has no club identity');
  if (data.status === 'rolled_back') {
    process.stdout.write(`Migration ${runId} is already rolled back.\n`);
    return;
  }

  const clubReference = firestore.collection('clubs').doc(clubId);
  const accessReference = clubReference.collection('access').doc('public');
  await Promise.all([
    clubReference.set(
      {
        maintenanceMode: true,
        billingEnforcementEnabled: false,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    ),
    accessReference.set(
      {
        maintenanceMode: true,
        billingEnforcementEnabled: false,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    ),
  ]);

  await validateLegacySources(firestore, data.reports);
  const identities = await runReference.collection('identities').get();
  for (const chunk of chunks(identities.docs, BATCH_SIZE)) {
    const batch = firestore.batch();
    for (const identity of chunk) {
      const original = identity.data();
      batch.set(
        firestore.collection('users').doc(identity.id),
        {
          role: original.hadRole ? original.role : FieldValue.delete(),
          clubId: original.hadClubId ? original.clubId : FieldValue.delete(),
          platformAdmin: original.hadPlatformAdmin
            ? original.platformAdmin
            : FieldValue.delete(),
        },
        { merge: true },
      );
    }
    await batch.commit();
  }

  await Promise.all([
    clubReference.set(
      {
        billingMigrationMode: false,
        maintenanceMode: false,
        billingEnforcementEnabled: false,
        migrationRolledBackAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    ),
    accessReference.set(
      {
        maintenanceMode: false,
        billingEnforcementEnabled: false,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    ),
    runReference.set(
      {
        status: 'rolled_back',
        rolledBackAt: Timestamp.now(),
        restoredIdentities: identities.size,
      },
      { merge: true },
    ),
  ]);
  process.stdout.write(
    `Migration ${runId} rolled back. Legacy roots were validated and identity fields restored; deploy the pre-migration application build to complete the code rollback.\n`,
  );
}

async function validateLegacySources(
  firestore: ReturnType<typeof getFirestore>,
  value: unknown,
): Promise<void> {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Migration has no completed source validation report');
  }
  const users = await firestore.collection('users').get();
  const userRoles = new Map(
    users.docs.map((user) => {
      const role = user.data().role;
      return [user.id, typeof role === 'number' ? (role === 4 ? 1 : role) : 0];
    }),
  );
  for (const item of value) {
    if (!isRecord(item) || typeof item.collection !== 'string') {
      throw new Error('Migration source validation report is invalid');
    }
    const source = await firestore
      .collection(item.collection)
      .orderBy(FieldPath.documentId())
      .get();
    const transformed = source.docs.map((document) => {
      const data = transformEmbeddedUsers(document.data());
      return {
        id: document.id,
        data:
          item.collection === 'public-profiles'
            ? {
                ...data,
                clubId: 'campus-cats',
                role:
                  userRoles.get(document.id) ??
                  (data.role === 4 ? 1 : data.role),
              }
            : data,
      };
    });
    if (item.collection === 'public-profiles') {
      const present = new Set(transformed.map(({ id }) => id));
      for (const user of users.docs) {
        if (present.has(user.id)) continue;
        const original = user.data();
        transformed.push({
          id: user.id,
          data: {
            displayName:
              String(original.email ?? '').split('@')[0] || 'Member',
            bio: '',
            profilePhotoUrl: '',
            role: userRoles.get(user.id) ?? 0,
            achievementIds: [],
            selectedTitleId: '',
            clubId: 'campus-cats',
          },
        });
      }
      transformed.sort((left, right) =>
        compareFirestoreDocumentIds(left.id, right.id),
      );
    }
    if (
      transformed.length !== item.count ||
      checksum(transformed) !== item.checksum
    ) {
      throw new Error(`Legacy source ${item.collection} no longer matches migration`);
    }
  }
}

function transformEmbeddedUsers(value: unknown): DocumentData {
  const transformed = transformValue(value);
  if (!isRecord(transformed)) throw new Error('Firestore document must be a map');
  return transformed;
}

function transformValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(transformValue);
  if (
    !isRecord(value) ||
    value instanceof Timestamp ||
    value instanceof GeoPoint ||
    value instanceof DocumentReference ||
    Buffer.isBuffer(value)
  ) {
    return value;
  }
  const next = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, transformValue(child)]),
  );
  if (
    typeof next.id === 'string' &&
    typeof next.email === 'string' &&
    typeof next.role === 'number'
  ) {
    next.clubId = 'campus-cats';
    next.platformAdmin = next.platformAdmin === true || next.role === 4;
    if (next.role === 4) next.role = 1;
  }
  return next;
}

function checksum(documents: readonly { id: string; data: DocumentData }[]): string {
  const hash = createHash('sha256');
  const orderedDocuments = [...documents].sort((left, right) =>
    compareFirestoreDocumentIds(left.id, right.id),
  );
  for (const document of orderedDocuments) {
    hash.update(document.id);
    hash.update('\0');
    hash.update(stableValue(document.data));
    hash.update('\n');
  }
  return hash.digest('hex');
}

function stableValue(value: unknown): string {
  if (value instanceof Timestamp) return `timestamp:${value.seconds}:${value.nanoseconds}`;
  if (value instanceof GeoPoint) return `geopoint:${value.latitude}:${value.longitude}`;
  if (value instanceof DocumentReference) return `reference:${value.path}`;
  if (value instanceof Date) return `date:${value.toISOString()}`;
  if (Buffer.isBuffer(value)) return `buffer:${value.toString('base64')}`;
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function requiredArgument(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value) throw new Error(`Usage: npm run admin:rollback-campus-cats -- ${flag} <migration-run-id>`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function chunks<T>(values: readonly T[], size: number): readonly T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.stderr.write('Rollback stopped with maintenance mode enabled.\n');
  process.exitCode = 1;
});
