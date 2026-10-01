import { isDeepStrictEqual } from 'node:util';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Bucket, File } from '@google-cloud/storage';
import {
  App,
  applicationDefault,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  Firestore,
  QueryDocumentSnapshot,
  getFirestore,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const BATCH_SIZE = 400;
const PROJECTS = {
  'campus-cats-development': 'campus-cats-development.firebasestorage.app',
  'campuscats-d7a5e': 'campuscats-d7a5e.firebasestorage.app',
} as const;

interface Options {
  readonly apply: boolean;
  readonly deleteSource: boolean;
  readonly migrateStorage: boolean;
  readonly projectId: keyof typeof PROJECTS;
}

interface DocumentMove {
  readonly source: QueryDocumentSnapshot;
  readonly target: DocumentReference;
  readonly data: DocumentData;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const cleanupCredentials = await prepareApplicationDefaultCredentials();
  try {
    const app = firebaseApp(options.projectId);
    const firestore = getFirestore(app);
    const bucket = getStorage(app).bucket();

    process.stdout.write(
      `${options.apply ? 'Applying' : 'Planning'} alerts rename in ${options.projectId}.\n`,
    );

    const alertMoves = await planCollectionMoves(
      firestore,
      'announcements',
      'alerts',
    );
    const receiptMoves = await planCollectionMoves(
      firestore,
      'announcement-read-receipts',
      'alert-read-receipts',
      renameReceiptFields,
    );
    reportDocuments('alerts', alertMoves);
    reportDocuments('alert read receipts', receiptMoves);

    if (options.apply) {
      await assertDocumentTargetsSafe([...alertMoves, ...receiptMoves]);
      await copyDocuments(firestore, [...alertMoves, ...receiptMoves]);
      await verifyDocuments([...alertMoves, ...receiptMoves]);
    }

    const mediaMoves = options.migrateStorage
      ? await planMediaMoves(bucket)
      : [];
    process.stdout.write(`alert media: ${mediaMoves.length} objects\n`);
    if (options.apply && options.migrateStorage) {
      await assertMediaTargetsSafe(mediaMoves);
      await copyMedia(mediaMoves);
      await verifyMedia(mediaMoves);
    }

    if (options.apply && options.deleteSource) {
      const documentMoves = [...alertMoves, ...receiptMoves];
      await deleteDocuments(firestore, documentMoves);
      await verifyDocumentSourcesRemoved(documentMoves);
      if (options.migrateStorage) {
        await deleteMedia(mediaMoves);
        await verifyMediaSourcesRemoved(mediaMoves);
      }
      process.stdout.write(
        options.migrateStorage
          ? 'Verified source collections and media were removed.\n'
          : 'Verified source collections were removed; storage was skipped.\n',
      );
    } else if (options.apply) {
      process.stdout.write(
        'Copy and verification complete; source collections were retained.\n',
      );
    } else {
      process.stdout.write('Dry run complete; no data was changed.\n');
    }
  } finally {
    cleanupCredentials();
  }
}

function parseOptions(args: readonly string[]): Options {
  const projectArgument = args.find((argument) =>
    argument.startsWith('--project='),
  );
  const projectId = projectArgument?.slice('--project='.length);
  if (!projectId || !(projectId in PROJECTS)) {
    throw new Error(
      `--project must be one of: ${Object.keys(PROJECTS).join(', ')}`,
    );
  }
  const apply = args.includes('--apply');
  const deleteSource = args.includes('--delete-source');
  if (deleteSource && !apply) {
    throw new Error('--delete-source requires --apply');
  }
  if (deleteSource && !args.includes('--confirm-delete-source')) {
    throw new Error('--delete-source requires --confirm-delete-source');
  }
  return {
    apply,
    deleteSource,
    migrateStorage: !args.includes('--skip-storage'),
    projectId: projectId as keyof typeof PROJECTS,
  };
}

function firebaseApp(projectId: keyof typeof PROJECTS): App {
  const existing = getApps().find((app) => app.name === projectId);
  return (
    existing ??
    initializeApp(
      {
        credential: applicationDefault(),
        projectId,
        storageBucket: PROJECTS[projectId],
      },
      projectId,
    )
  );
}

async function prepareApplicationDefaultCredentials(): Promise<() => void> {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return () => undefined;

  const [auth, api] = await Promise.all([
    import('firebase-tools/lib/auth'),
    import('firebase-tools/lib/api'),
  ]);
  const account = auth.getGlobalDefaultAccount();
  const refreshToken = account?.tokens.refresh_token;
  if (!refreshToken) {
    throw new Error(
      'Set GOOGLE_APPLICATION_CREDENTIALS or run `npx firebase login` before this migration',
    );
  }
  const directory = mkdtempSync(join(tmpdir(), 'campus-cats-alerts-'));
  const credentialPath = join(directory, 'application-default.json');
  writeFileSync(
    credentialPath,
    JSON.stringify({
      type: 'authorized_user',
      client_id: api.clientId(),
      client_secret: api.clientSecret(),
      refresh_token: refreshToken,
    }),
    { mode: 0o600 },
  );
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
  return () => {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    rmSync(directory, { recursive: true });
  };
}

async function planCollectionMoves(
  firestore: Firestore,
  sourceCollection: string,
  targetCollection: string,
  transform: (data: DocumentData) => DocumentData = (data) => data,
): Promise<readonly DocumentMove[]> {
  const snapshot = await firestore.collectionGroup(sourceCollection).get();
  return snapshot.docs.flatMap((source) => {
    const segments = source.ref.path.split('/');
    if (!isSupportedDocumentPath(segments, sourceCollection)) return [];
    segments[segments.length - 2] = targetCollection;
    return [
      {
        source,
        target: firestore.doc(segments.join('/')),
        data: transform(source.data()),
      },
    ];
  });
}

function isSupportedDocumentPath(
  segments: readonly string[],
  collection: string,
): boolean {
  return (
    (segments.length === 2 && segments[0] === collection) ||
    (segments.length === 4 &&
      segments[0] === 'clubs' &&
      Boolean(segments[1]) &&
      segments[2] === collection)
  );
}

function renameReceiptFields(data: DocumentData): DocumentData {
  const { announcementId, ...rest } = data;
  if (typeof announcementId !== 'string' || !announcementId.trim()) {
    throw new Error('Alert read receipt is missing announcementId');
  }
  return { ...rest, alertId: announcementId };
}

function reportDocuments(label: string, moves: readonly DocumentMove[]): void {
  const parents = new Set(moves.map(({ target }) => target.parent.path));
  process.stdout.write(
    `${label}: ${moves.length} documents across ${parents.size} collections\n`,
  );
}

async function copyDocuments(
  firestore: Firestore,
  moves: readonly DocumentMove[],
): Promise<void> {
  for (const chunk of chunks(moves, BATCH_SIZE)) {
    const batch = firestore.batch();
    chunk.forEach(({ target, data }) => batch.set(target, data));
    await batch.commit();
  }
}

async function assertDocumentTargetsSafe(
  moves: readonly DocumentMove[],
): Promise<void> {
  for (const chunk of chunks(moves, BATCH_SIZE)) {
    const targets = await Promise.all(chunk.map(({ target }) => target.get()));
    targets.forEach((target, index) => {
      if (
        target.exists &&
        !isDeepStrictEqual(target.data(), chunk[index].data)
      ) {
        throw new Error(
          `Refusing to overwrite different data at ${target.ref.path}`,
        );
      }
    });
  }
}

async function verifyDocuments(moves: readonly DocumentMove[]): Promise<void> {
  for (const chunk of chunks(moves, BATCH_SIZE)) {
    const targets = await Promise.all(chunk.map(({ target }) => target.get()));
    targets.forEach((target, index) => {
      if (
        !target.exists ||
        !isDeepStrictEqual(target.data(), chunk[index].data)
      ) {
        throw new Error(`Verification failed for ${target.ref.path}`);
      }
    });
  }
}

async function deleteDocuments(
  firestore: Firestore,
  moves: readonly DocumentMove[],
): Promise<void> {
  for (const chunk of chunks(moves, BATCH_SIZE)) {
    const batch = firestore.batch();
    chunk.forEach(({ source }) => batch.delete(source.ref));
    await batch.commit();
  }
}

async function verifyDocumentSourcesRemoved(
  moves: readonly DocumentMove[],
): Promise<void> {
  for (const chunk of chunks(moves, BATCH_SIZE)) {
    const sources = await Promise.all(
      chunk.map(({ source }) => source.ref.get()),
    );
    const remaining = sources.find((source) => source.exists);
    if (remaining) {
      throw new Error(`Source deletion failed for ${remaining.ref.path}`);
    }
  }
}

interface MediaMove {
  readonly source: File;
  readonly target: File;
}

async function planMediaMoves(bucket: Bucket): Promise<readonly MediaMove[]> {
  const [files] = await bucket.getFiles();
  return files.flatMap((source) => {
    const segments = source.name.split('/');
    const collectionIndex =
      segments.length === 5 &&
      segments[0] === 'clubs' &&
      Boolean(segments[1]) &&
      segments[2] === 'announcements' &&
      Boolean(segments[3]) &&
      Boolean(segments[4])
        ? 2
        : -1;
    if (collectionIndex === -1) return [];
    segments[collectionIndex] = 'alerts';
    return [{ source, target: bucket.file(segments.join('/')) }];
  });
}

async function copyMedia(moves: readonly MediaMove[]): Promise<void> {
  for (const { source, target } of moves) {
    const [exists] = await target.exists();
    if (!exists) await source.copy(target);
  }
}

async function assertMediaTargetsSafe(
  moves: readonly MediaMove[],
): Promise<void> {
  for (const { source, target } of moves) {
    const [exists] = await target.exists();
    if (!exists) continue;
    const [[sourceMetadata], [targetMetadata]] = await Promise.all([
      source.getMetadata(),
      target.getMetadata(),
    ]);
    if (
      sourceMetadata.size !== targetMetadata.size ||
      sourceMetadata.md5Hash !== targetMetadata.md5Hash
    ) {
      throw new Error(
        `Refusing to overwrite different media at ${target.name}`,
      );
    }
  }
}

async function verifyMedia(moves: readonly MediaMove[]): Promise<void> {
  for (const { source, target } of moves) {
    const [[sourceMetadata], [targetMetadata]] = await Promise.all([
      source.getMetadata(),
      target.getMetadata(),
    ]);
    if (
      sourceMetadata.size !== targetMetadata.size ||
      sourceMetadata.md5Hash !== targetMetadata.md5Hash
    ) {
      throw new Error(`Verification failed for ${target.name}`);
    }
  }
}

async function deleteMedia(moves: readonly MediaMove[]): Promise<void> {
  for (const { source } of moves) await source.delete();
}

async function verifyMediaSourcesRemoved(
  moves: readonly MediaMove[],
): Promise<void> {
  for (const { source } of moves) {
    const [exists] = await source.exists();
    if (exists) throw new Error(`Source deletion failed for ${source.name}`);
  }
}

function chunks<T>(values: readonly T[], size: number): readonly T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
