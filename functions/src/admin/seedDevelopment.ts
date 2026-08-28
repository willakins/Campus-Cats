import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import { universitySearchPrefixes } from '../universityCatalog';

const DEVELOPMENT_CLUB_FIXTURE = require('../../../config/developmentClubFixture.json') as {
  readonly university: {
    readonly id: string;
    readonly name: string;
    readonly city: string;
    readonly state: string;
    readonly websiteDomain: string;
    readonly emailDomains: readonly string[];
    readonly latitude: number;
    readonly longitude: number;
    readonly timezone: string;
    readonly aliases: readonly string[];
  };
  readonly club: {
    readonly id: string;
    readonly name: string;
    readonly emailEnabled: boolean;
    readonly logoUrl: string;
    readonly primaryColor: string;
    readonly accentColor: string;
    readonly sightingsAnonymous: boolean;
  };
};

const { university, club } = DEVELOPMENT_CLUB_FIXTURE;

const DEVELOPMENT_PROJECT_ID = 'campus-cats-development';

type DocumentData = Readonly<Record<string, unknown>>;

interface SeedDocument {
  readonly path: string;
  readonly data: DocumentData;
}

interface DevelopmentSeedDependencies {
  readonly now: () => Date;
  readonly findUserByEmail: (
    email: string,
  ) => Promise<{ readonly uid: string; readonly email?: string } | undefined>;
  readonly readDocument: (path: string) => Promise<DocumentData | undefined>;
  readonly writeDocuments: (
    documents: readonly SeedDocument[],
  ) => Promise<void>;
}

interface DevelopmentSeedOptions {
  readonly projectId: string;
  readonly presidentEmail: string;
}

interface DevelopmentSeedCliOptions extends DevelopmentSeedOptions {
  readonly apply: boolean;
}

interface DevelopmentSeedResult {
  readonly presidentUserId: string;
  readonly trialEndsAt: Date;
}

export async function seedDevelopmentProject(
  options: DevelopmentSeedOptions,
  dependencies: DevelopmentSeedDependencies,
): Promise<DevelopmentSeedResult> {
  if (options.projectId !== DEVELOPMENT_PROJECT_ID) {
    throw new Error(
      `The development seeder may only run against ${DEVELOPMENT_PROJECT_ID}`,
    );
  }

  const user = await dependencies.findUserByEmail(options.presidentEmail);
  if (!user) {
    throw new Error(
      `Create ${options.presidentEmail} in Campus Cats Development Authentication first`,
    );
  }
  const billingAccount = await dependencies.readDocument(
    `billing-accounts/${club.id}`,
  );
  const providerFields = [
    'customerId',
    'subscriptionId',
    'outstandingInvoiceId',
    'pendingCollectionMethod',
    'trialStartedAt',
  ] as const;
  if (providerFields.some((field) => billingAccount?.[field] != null)) {
    throw new Error(
      'Campus Cats Development already has Stripe billing state; remove it intentionally before creating a simulated trial',
    );
  }
  const now = dependencies.now();
  const trialEndsAt = new Date(now);
  trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + 30);
  const presidentEmail = (
    user.email ?? options.presidentEmail
  ).trim().toLowerCase();
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
      path: `universities/${university.id}`,
      data: {
        name: university.name,
        city: university.city,
        state: university.state,
        websiteDomain: university.websiteDomain,
        emailDomains: university.emailDomains,
        latitude: university.latitude,
        longitude: university.longitude,
        timezone: university.timezone,
        aliases: university.aliases,
        active: true,
        searchPrefixes: universitySearchPrefixes(
          university.name,
          university.aliases,
        ),
        source: 'development_seed',
        synchronizedAt: now,
      },
    },
    {
      path: `university-overrides/${university.id}`,
      data: {
        aliases: university.aliases,
        emailDomains: university.emailDomains,
        updatedAt: now,
      },
    },
    {
      path: `university-clubs/${university.id}`,
      data: {
        universityId: university.id,
        universityName: university.name,
        clubId: club.id,
        clubName: club.name,
        emailEnabled: club.emailEnabled,
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      path: `clubs/${club.id}`,
      data: {
        name: club.name,
        slug: club.id,
        universityId: university.id,
        timezone: university.timezone,
        billingEmail: presidentEmail,
        presidentUserId: user.uid,
        ...sharedAccess,
        trialUsageEndsAt: trialEndsAt,
      },
    },
    {
      path: `clubs/${club.id}/access/public`,
      data: {
        clubId: club.id,
        clubName: club.name,
        timezone: university.timezone,
        ...sharedAccess,
      },
    },
    {
      path: `clubs/${club.id}/app-settings/public`,
      data: {
        logoUrl: club.logoUrl,
        primaryColor: club.primaryColor,
        accentColor: club.accentColor,
        sightingsAnonymous: club.sightingsAnonymous,
      },
    },
    {
      path: `users/${user.uid}`,
      data: {
        email: presidentEmail,
        role: 3,
        clubId: club.id,
        platformAdmin: false,
        banned: false,
        disciplinaryNotices: [],
        agreedToTerms: false,
        termsVersion: '',
        updatedAt: now,
      },
    },
    {
      path: `clubs/${club.id}/public-profiles/${user.uid}`,
      data: {
        displayName: 'Development President',
        bio: '',
        profilePhotoUrl: '',
        role: 3,
        achievementIds: ['president'],
        selectedTitleId: 'president',
        clubId: club.id,
      },
    },
  ]);
  return { presidentUserId: user.uid, trialEndsAt };
}

async function main(): Promise<void> {
  const options = parseDevelopmentSeedOptions(process.argv.slice(2));
  if (options.projectId !== DEVELOPMENT_PROJECT_ID) {
    throw new Error(
      `The development seeder may only run against ${DEVELOPMENT_PROJECT_ID}`,
    );
  }
  if (getApps().length === 0) initializeApp({ projectId: options.projectId });
  const auth = getAuth();
  const firestore = getFirestore();
  const result = await runDevelopmentSeedCli(options, {
    now: () => new Date(),
    findUserByEmail: async (email) => {
      try {
        const user = await auth.getUserByEmail(email);
        return { uid: user.uid, ...(user.email ? { email: user.email } : {}) };
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'auth/user-not-found'
        ) {
          return undefined;
        }
        throw error;
      }
    },
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
      ? `Seeded Campus Cats Development for ${options.presidentEmail} (${result.presidentUserId}); trial ends ${result.trialEndsAt.toISOString()}.\n`
      : `Dry run: Campus Cats Development would be seeded for ${options.presidentEmail} (${result.presidentUserId}) with a trial ending ${result.trialEndsAt.toISOString()}. Re-run with --apply to write.\n`,
  );
}

export async function runDevelopmentSeedCli(
  options: DevelopmentSeedCliOptions,
  dependencies: DevelopmentSeedDependencies,
): Promise<DevelopmentSeedResult> {
  return seedDevelopmentProject(options, {
    ...dependencies,
    writeDocuments: (documents) =>
      options.apply
        ? dependencies.writeDocuments(documents)
        : Promise.resolve(),
  });
}

export function parseDevelopmentSeedOptions(
  args: readonly string[],
): DevelopmentSeedCliOptions {
  const values = new Map<string, string>();
  let apply = false;
  for (let index = 0; index < args.length;) {
    const key = args[index];
    if (key === '--apply') {
      apply = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (
      (key !== '--project' && key !== '--president-email') ||
      !value ||
      value.startsWith('--')
    ) {
      usage();
    }
    values.set(key.slice(2), value.trim());
    index += 2;
  }
  const projectId = values.get('project');
  const presidentEmail = values.get('president-email')?.toLowerCase();
  if (!projectId || !presidentEmail || values.size !== 2) usage();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(presidentEmail)) {
    throw new Error('president-email must be a valid email address');
  }
  return { projectId, presidentEmail, apply };
}

function usage(): never {
  throw new Error(
    'Usage: npm run admin:seed-development -- --project campus-cats-development --president-email developer@example.com [--apply]',
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
