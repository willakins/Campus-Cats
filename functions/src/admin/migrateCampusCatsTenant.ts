import { createHash } from 'node:crypto';

import { getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentReference,
  DocumentData,
  FieldPath,
  GeoPoint,
  Timestamp,
  getFirestore,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const CLUB_ID = 'campus-cats';
const DEFAULT_TIMEZONE = 'America/New_York';
const BATCH_SIZE = 400;

const TENANT_COLLECTIONS = [
  'cat-sightings',
  'catalog',
  'catalog-favorites',
  'catalog-tag-settings',
  'catalog-tag-assignments',
  'stations',
  'announcements',
  'contact-info',
  'whitelist',
  'inaturalist-observations',
  'inaturalist-guide-profiles',
  'inaturalist-public-links',
  'integration-state',
  'app-settings',
  'content-contributors',
  'community-events',
  'community-surveys',
  'survey-responses',
  'survey-submission-receipts',
  'community-votes',
  'community-vote-nominees',
  'community-vote-nomination-receipts',
  'community-vote-ballots',
  'community-vote-ballot-receipts',
  'public-profiles',
  'system',
] as const;

const MEDIA_PREFIXES = [
  'cat-sightings/',
  'catalog/',
  'stations/',
  'announcements/',
  'community-events/',
  'community-votes/',
  'public-profiles/',
  'app-branding/',
] as const;

interface Options {
  readonly apply: boolean;
  readonly backupReference?: string;
  readonly timezone: string;
}

interface CollectionReport {
  readonly collection: string;
  readonly count: number;
  readonly checksum: string;
}

interface MediaReport {
  readonly source: string;
  readonly target: string;
  readonly size: string;
  readonly checksum: string;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (getApps().length === 0) initializeApp();
  const firestore = getFirestore();
  const storage = getStorage();
  const startedAt = new Date();
  const existingClub = await firestore.collection('clubs').doc(CLUB_ID).get();
  if (options.apply && existingClub.data()?.migrationCompletedAt) {
    process.stdout.write(
      'Campus Cats is already migrated; the idempotent apply made no changes.\n',
    );
    return;
  }
  const resumableRunId =
    existingClub.data()?.billingMigrationMode === true &&
    typeof existingClub.data()?.migrationRunId === 'string'
      ? existingClub.data()!.migrationRunId
      : undefined;
  const runId =
    resumableRunId ??
    `campus-cats-${startedAt.toISOString().replace(/[:.]/g, '-')}`;
  const reports: CollectionReport[] = [];
  const mediaReports: MediaReport[] = [];
  const users = await firestore.collection('users').get();
  const profiles = await firestore.collection('public-profiles').get();
  const userRoles = new Map(
    users.docs.map((user) => {
      const role = user.data().role;
      return [user.id, typeof role === 'number' ? (role === 4 ? 1 : role) : 0];
    }),
  );
  const profilesById = new Map(profiles.docs.map((profile) => [profile.id, profile]));
  const verifiedBackupObject = options.apply
    ? await verifyBackupReference(storage, options.backupReference!)
    : undefined;

  if (options.apply) {
    const runReference = firestore.collection('migration-runs').doc(runId);
    const existingRun = await runReference.get();
    await runReference.set(
      {
        clubId: CLUB_ID,
        backupReference: options.backupReference,
        verifiedBackupObject,
        status: 'running',
        ...(existingRun.exists
          ? { resumedAt: Timestamp.fromDate(startedAt) }
          : { startedAt: Timestamp.fromDate(startedAt) }),
      },
      { merge: true },
    );
    await firestore.collection('clubs').doc(CLUB_ID).set(
      {
        name: 'Campus Cats',
        slug: CLUB_ID,
        timezone: options.timezone,
        billingEmail: 'willakins23@gmail.com',
        billingEnforcementEnabled: false,
        billingMigrationMode: true,
        maintenanceMode: true,
        accessState: 'enabled',
        paymentStanding: 'current',
        collectionMethod: 'manual',
        migrationRunId: runId,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    await firestore
      .collection('clubs')
      .doc(CLUB_ID)
      .collection('access')
      .doc('public')
      .set({
        clubId: CLUB_ID,
        clubName: 'Campus Cats',
        timezone: options.timezone,
        billingEnforcementEnabled: false,
        maintenanceMode: true,
        accessState: 'enabled',
        paymentStanding: 'current',
        collectionMethod: 'manual',
        updatedAt: Timestamp.now(),
      });
  }

  for (const collectionName of TENANT_COLLECTIONS) {
    const source = await firestore
      .collection(collectionName)
      .orderBy(FieldPath.documentId())
      .get();
    const transformed = source.docs.map((document) => {
      const data = transformEmbeddedUsers(document.data());
      return {
        id: document.id,
        data:
          collectionName === 'public-profiles'
            ? {
                ...data,
                clubId: CLUB_ID,
                role: userRoles.get(document.id) ?? (data.role === 4 ? 1 : data.role),
              }
            : data,
      };
    });
    if (collectionName === 'public-profiles') {
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
            clubId: CLUB_ID,
          },
        });
      }
      transformed.sort((left, right) => left.id.localeCompare(right.id));
    }
    const report = {
      collection: collectionName,
      count: transformed.length,
      checksum: checksum(transformed),
    };
    reports.push(report);
    process.stdout.write(
      `${options.apply ? 'migrate' : 'would migrate'} ${collectionName}: ${report.count} docs (${report.checksum})\n`,
    );
    if (options.apply) {
      await firestore.collection('migration-runs').doc(runId).set(
        { reports },
        { merge: true },
      );
    }
    if (!options.apply) continue;
    for (const chunk of chunks(transformed, BATCH_SIZE)) {
      const batch = firestore.batch();
      for (const document of chunk) {
        batch.set(
          firestore
            .collection('clubs')
            .doc(CLUB_ID)
            .collection(collectionName)
            .doc(document.id),
          document.data,
        );
      }
      await batch.commit();
    }
  }

  process.stdout.write(
    `${options.apply ? 'migrate' : 'would migrate'} identities: ${users.size} users, ${profiles.size} profiles\n`,
  );
  if (options.apply) {
    const identityBackups = await firestore
      .collection('migration-runs')
      .doc(runId)
      .collection('identities')
      .get();
    const backedUpIdentityIds = new Set(
      identityBackups.docs.map((identity) => identity.id),
    );
    for (const chunk of chunks(users.docs, 150)) {
      const batch = firestore.batch();
      for (const user of chunk) {
        const original = user.data();
        const role = userRoles.get(user.id) ?? 0;
        if (!backedUpIdentityIds.has(user.id)) {
          batch.set(
            firestore
              .collection('migration-runs')
              .doc(runId)
              .collection('identities')
              .doc(user.id),
            {
              role: original.role ?? null,
              clubId: original.clubId ?? null,
              platformAdmin: original.platformAdmin ?? null,
              hadRole: 'role' in original,
              hadClubId: 'clubId' in original,
              hadPlatformAdmin: 'platformAdmin' in original,
            },
          );
        }
        batch.set(
          user.ref,
          {
            clubId: CLUB_ID,
            role,
            platformAdmin:
              original.platformAdmin === true || original.role === 4,
          },
          { merge: true },
        );
        const profile = firestore
          .collection('clubs')
          .doc(CLUB_ID)
          .collection('public-profiles')
          .doc(user.id);
        const sourceProfile = profilesById.get(user.id)?.data();
        batch.set(
          profile,
          sourceProfile
            ? { clubId: CLUB_ID, role }
            : {
                displayName: String(original.email ?? '').split('@')[0] || 'Member',
                bio: '',
                profilePhotoUrl: '',
                role,
                achievementIds: [],
                selectedTitleId: '',
                clubId: CLUB_ID,
              },
          { merge: true },
        );
      }
      await batch.commit();
    }
  }

  let mediaCount = 0;
  for (const prefix of MEDIA_PREFIXES) {
    const [files] = await storage.bucket().getFiles({ prefix });
    const sourceFiles = files.filter(
      (file) => !file.name.startsWith('clubs/') && file.name !== prefix,
    );
    mediaCount += sourceFiles.length;
    process.stdout.write(
      `${options.apply ? 'migrate' : 'would migrate'} ${prefix}: ${sourceFiles.length} objects\n`,
    );
    if (!options.apply) continue;
    for (const file of sourceFiles) {
      const targetName = `clubs/${CLUB_ID}/${file.name}`;
      const target = storage.bucket().file(targetName);
      const [sourceMetadata] = await file.getMetadata();
      await file.copy(target);
      const [targetMetadata] = await target.getMetadata();
      const sourceChecksum = sourceMetadata.md5Hash ?? sourceMetadata.crc32c ?? '';
      const targetChecksum = targetMetadata.md5Hash ?? targetMetadata.crc32c ?? '';
      if (
        String(sourceMetadata.size) !== String(targetMetadata.size) ||
        !sourceChecksum ||
        sourceChecksum !== targetChecksum
      ) {
        throw new Error(`Media validation failed for ${file.name}`);
      }
      mediaReports.push({
        source: file.name,
        target: targetName,
        size: String(sourceMetadata.size),
        checksum: sourceChecksum,
      });
    }
  }

  if (!options.apply) {
    process.stdout.write(
      `Dry run complete: ${reports.reduce((sum, report) => sum + report.count, 0)} documents and ${mediaCount} media objects.\n`,
    );
    return;
  }

  for (const expected of reports) {
    const target = await firestore
      .collection('clubs')
      .doc(CLUB_ID)
      .collection(expected.collection)
      .orderBy(FieldPath.documentId())
      .get();
    const actual: CollectionReport = {
      collection: expected.collection,
      count: target.size,
      checksum: checksum(
        target.docs.map((document) => ({ id: document.id, data: document.data() })),
      ),
    };
    if (actual.count !== expected.count || actual.checksum !== expected.checksum) {
      throw new Error(
        `Validation failed for ${expected.collection}: expected ${expected.count}/${expected.checksum}, received ${actual.count}/${actual.checksum}`,
      );
    }
  }

  await Promise.all([
    firestore.collection('clubs').doc(CLUB_ID).set(
      {
        billingMigrationMode: false,
        maintenanceMode: false,
        billingEnforcementEnabled: false,
        migrationCompletedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    ),
    firestore
      .collection('clubs')
      .doc(CLUB_ID)
      .collection('access')
      .doc('public')
      .set(
        {
          maintenanceMode: false,
          billingEnforcementEnabled: false,
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      ),
    firestore.collection('migration-runs').doc(runId).set(
      {
        status: 'complete',
        completedAt: Timestamp.now(),
        reports,
        users: users.size,
        publicProfiles: profiles.size,
        mediaObjects: mediaCount,
        mediaChecksum: checksum(
          mediaReports.map(({ source, ...data }) => ({ id: source, data })),
        ),
        sourceCollectionsRetainedForRollback: true,
      },
      { merge: true },
    ),
  ]);
  process.stdout.write(
    `Migration ${runId} validated. Legacy source data remains available for rollback; billing enforcement remains disabled.\n`,
  );
}

async function verifyBackupReference(
  storage: ReturnType<typeof getStorage>,
  reference: string,
): Promise<string> {
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(reference);
  if (!match) {
    throw new Error('--backup-reference must be a non-empty gs:// bucket path');
  }
  const [, bucketName, prefix] = match;
  const [files] = await storage.bucket(bucketName).getFiles({
    prefix,
    maxResults: 1,
  });
  if (!files[0]) {
    throw new Error(`No backup objects were found at ${reference}`);
  }
  return `gs://${bucketName}/${files[0].name}`;
}

function parseOptions(args: readonly string[]): Options {
  const apply = args.includes('--apply');
  const dryRun = args.includes('--dry-run');
  if (apply === dryRun) usage();
  const value = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const backupReference = value('--backup-reference');
  if (apply && !backupReference) {
    throw new Error('--backup-reference is required for an apply run');
  }
  const timezone = value('--timezone') ?? DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    throw new Error('--timezone must be a valid IANA timezone');
  }
  return { apply, backupReference, timezone };
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
    next.clubId = CLUB_ID;
    next.platformAdmin = next.platformAdmin === true || next.role === 4;
    if (next.role === 4) next.role = 1;
  }
  return next;
}

function checksum(documents: readonly { id: string; data: DocumentData }[]): string {
  const hash = createHash('sha256');
  for (const document of documents) {
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

function usage(): never {
  throw new Error(
    'Usage: npm run admin:migrate-campus-cats -- --dry-run [--timezone America/New_York] OR --apply --backup-reference <verified-backup> [--timezone America/New_York]',
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.stderr.write(
    'If apply had started, the club remains in maintenance mode. Source collections and root media were not deleted and can be used for rollback.\n',
  );
  process.exitCode = 1;
});
