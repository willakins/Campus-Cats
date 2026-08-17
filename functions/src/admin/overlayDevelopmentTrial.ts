import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DEVELOPMENT_PROJECT_ID = 'campus-cats-development';
const CLUB_ID = 'campus-cats';
const CLUB_NAME = 'Campus Cats';
const CLUB_TIMEZONE = 'America/New_York';

type DocumentData = Readonly<Record<string, unknown>>;

interface TrialDocument {
  readonly path: string;
  readonly data: DocumentData;
}

interface DevelopmentTrialDependencies {
  readonly now: () => Date;
  readonly readDocument: (
    path: string,
  ) => Promise<DocumentData | undefined>;
  readonly writeDocuments: (
    documents: readonly TrialDocument[],
  ) => Promise<void>;
}

interface DevelopmentTrialOptions {
  readonly projectId: string;
}

interface DevelopmentTrialCliOptions extends DevelopmentTrialOptions {
  readonly apply: boolean;
}

interface DevelopmentTrialResult {
  readonly trialEndsAt: Date;
}

export async function overlayDevelopmentTrial(
  options: DevelopmentTrialOptions,
  dependencies: DevelopmentTrialDependencies,
): Promise<DevelopmentTrialResult> {
  if (options.projectId !== DEVELOPMENT_PROJECT_ID) {
    throw new Error(
      `The development trial overlay may only run against ${DEVELOPMENT_PROJECT_ID}`,
    );
  }

  const club = await dependencies.readDocument(`clubs/${CLUB_ID}`);
  if (!club) {
    throw new Error(
      'Campus Cats does not exist in Campus Cats Development; clone Production first',
    );
  }

  const now = dependencies.now();
  const trialEndsAt = new Date(now);
  trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + 30);
  const clubName = typeof club.name === 'string' ? club.name : CLUB_NAME;
  const timezone =
    typeof club.timezone === 'string' ? club.timezone : CLUB_TIMEZONE;
  const sharedAccess = {
    billingEnforcementEnabled: true,
    maintenanceMode: false,
    accessState: 'enabled',
    paymentStanding: 'current',
    collectionMethod: 'automatic',
    invoiceDueAt: null,
    graceEndsAt: null,
    scheduledEndAt: trialEndsAt,
    suspensionReason: null,
    trialEndsAt,
    updatedAt: now,
  } as const;

  await dependencies.writeDocuments([
    {
      path: `clubs/${CLUB_ID}`,
      data: {
        ...sharedAccess,
        trialUsageEndsAt: trialEndsAt,
      },
    },
    {
      path: `clubs/${CLUB_ID}/access/public`,
      data: {
        clubId: CLUB_ID,
        clubName,
        timezone,
        ...sharedAccess,
      },
    },
  ]);

  return { trialEndsAt };
}

export async function runDevelopmentTrialOverlayCli(
  options: DevelopmentTrialCliOptions,
  dependencies: DevelopmentTrialDependencies,
): Promise<DevelopmentTrialResult> {
  return overlayDevelopmentTrial(options, {
    ...dependencies,
    writeDocuments: (documents) =>
      options.apply
        ? dependencies.writeDocuments(documents)
        : Promise.resolve(),
  });
}

export function parseDevelopmentTrialOverlayOptions(
  args: readonly string[],
): DevelopmentTrialCliOptions {
  let projectId: string | undefined;
  let apply = false;

  for (let index = 0; index < args.length;) {
    const argument = args[index];
    if (argument === '--apply') {
      apply = true;
      index += 1;
      continue;
    }
    if (argument !== '--project') usage();
    const value = args[index + 1];
    if (!value || value.startsWith('--') || projectId) usage();
    projectId = value.trim();
    index += 2;
  }

  if (!projectId) usage();
  return { projectId, apply };
}

function usage(): never {
  throw new Error(
    'Usage: npm run admin:overlay-development-trial -- --project campus-cats-development [--apply]',
  );
}

async function main(): Promise<void> {
  const options = parseDevelopmentTrialOverlayOptions(process.argv.slice(2));
  if (options.projectId !== DEVELOPMENT_PROJECT_ID) {
    throw new Error(
      `The development trial overlay may only run against ${DEVELOPMENT_PROJECT_ID}`,
    );
  }
  if (getApps().length === 0) initializeApp({ projectId: options.projectId });
  const firestore = getFirestore();
  const result = await runDevelopmentTrialOverlayCli(options, {
    now: () => new Date(),
    readDocument: async (path) => {
      const snapshot = await firestore.doc(path).get();
      return snapshot.exists ? snapshot.data() : undefined;
    },
    writeDocuments: async (documents) => {
      const batch = firestore.batch();
      documents.forEach(({ path, data }) =>
        batch.set(firestore.doc(path), data, { merge: true }),
      );
      await batch.commit();
    },
  });

  process.stdout.write(
    options.apply
      ? `Overlaid Campus Cats Development with a trial ending ${result.trialEndsAt.toISOString()}.\n`
      : `Dry run: Campus Cats Development would receive a trial ending ${result.trialEndsAt.toISOString()}. Re-run with --apply to write.\n`,
  );
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
