import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseDevelopmentSeedOptions,
  runDevelopmentSeedCli,
  seedDevelopmentProject,
} from './admin/seedDevelopment';

describe('development project seeder', () => {
  it('requires an explicit apply flag before the CLI may write', () => {
    assert.deepEqual(
      parseDevelopmentSeedOptions([
        '--project',
        'campus-cats-development',
        '--president-email',
        'Developer@Example.com',
      ]),
      {
        projectId: 'campus-cats-development',
        presidentEmail: 'developer@example.com',
        apply: false,
      },
    );
    assert.equal(
      parseDevelopmentSeedOptions([
        '--project',
        'campus-cats-development',
        '--president-email',
        'developer@example.com',
        '--apply',
      ]).apply,
      true,
    );
  });

  it('commits documents only when the parsed CLI options include --apply', async () => {
    let commits = 0;
    const dependencies = {
      now: () => new Date('2026-08-17T12:00:00.000Z'),
      findUserByEmail: async () => ({
        uid: 'user-1',
        email: 'developer@example.com',
      }),
      readDocument: async () => undefined,
      writeDocuments: async () => {
        commits += 1;
      },
    };
    const options = {
      projectId: 'campus-cats-development',
      presidentEmail: 'developer@example.com',
    };

    await runDevelopmentSeedCli({ ...options, apply: false }, dependencies);
    assert.equal(commits, 0);

    await runDevelopmentSeedCli({ ...options, apply: true }, dependencies);
    assert.equal(commits, 1);
  });

  it('refuses to inspect or write any project except Campus Cats Development', async () => {
    let touchedFirebase = false;

    await assert.rejects(
      () =>
        seedDevelopmentProject(
          {
            projectId: 'campuscats-d7a5e',
            presidentEmail: 'developer@example.com',
          },
          {
            now: () => new Date('2026-08-17T12:00:00.000Z'),
            findUserByEmail: async () => {
              touchedFirebase = true;
              return { uid: 'user-1', email: 'developer@example.com' };
            },
            readDocument: async () => {
              touchedFirebase = true;
              return undefined;
            },
            writeDocuments: async () => {
              touchedFirebase = true;
            },
          },
        ),
      /only run against campus-cats-development/,
    );
    assert.equal(touchedFirebase, false);
  });

  it('requires the test President to exist in development Authentication', async () => {
    await assert.rejects(
      () =>
        seedDevelopmentProject(
          {
            projectId: 'campus-cats-development',
            presidentEmail: 'developer@example.com',
          },
          {
            now: () => new Date('2026-08-17T12:00:00.000Z'),
            findUserByEmail: async () => undefined,
            readDocument: async () => undefined,
            writeDocuments: async () => undefined,
          },
        ),
      /Create developer@example.com in Campus Cats Development Authentication first/,
    );
  });

  it('refuses to overwrite an existing Stripe-backed billing account', async () => {
    let wrote = false;

    await assert.rejects(
      () =>
        seedDevelopmentProject(
          {
            projectId: 'campus-cats-development',
            presidentEmail: 'developer@example.com',
          },
          {
            now: () => new Date('2026-08-17T12:00:00.000Z'),
            findUserByEmail: async () => ({
              uid: 'user-1',
              email: 'developer@example.com',
            }),
            readDocument: async (path) =>
              path === 'billing-accounts/campus-cats'
                ? { customerId: 'cus_test', subscriptionId: 'sub_test' }
                : undefined,
            writeDocuments: async () => {
              wrote = true;
            },
          },
        ),
      /already has Stripe billing state/,
    );
    assert.equal(wrote, false);
  });

  it('seeds Georgia Tech with an active 30-day trial and no billing-provider records', async () => {
    const writes = new Map<string, Record<string, unknown>>();
    const result = await seedDevelopmentProject(
      {
        projectId: 'campus-cats-development',
        presidentEmail: 'Developer@Example.com',
      },
      {
        now: () => new Date('2026-08-17T12:00:00.000Z'),
        findUserByEmail: async () => ({
          uid: 'user-1',
          email: 'developer@example.com',
        }),
        readDocument: async () => undefined,
        writeDocuments: async (documents) => {
          documents.forEach(({ path, data }) => writes.set(path, { ...data }));
        },
      },
    );

    assert.equal(result.presidentUserId, 'user-1');
    assert.equal(result.trialEndsAt.toISOString(), '2026-09-16T12:00:00.000Z');
    assert.deepEqual(
      writes.get('clubs/campus-cats/access/public'),
      {
        clubId: 'campus-cats',
        clubName: 'Campus Cats',
        timezone: 'America/New_York',
        billingEnforcementEnabled: true,
        maintenanceMode: false,
        accessState: 'enabled',
        paymentStanding: 'current',
        collectionMethod: 'automatic',
        invoiceDueAt: null,
        graceEndsAt: null,
        scheduledEndAt: new Date('2026-09-16T12:00:00.000Z'),
        suspensionReason: null,
        trialEndsAt: new Date('2026-09-16T12:00:00.000Z'),
        updatedAt: new Date('2026-08-17T12:00:00.000Z'),
      },
    );
    assert.deepEqual(writes.get('users/user-1'), {
      email: 'developer@example.com',
      role: 3,
      clubId: 'campus-cats',
      platformAdmin: false,
      banned: false,
      disciplinaryNotices: [],
      agreedToTerms: false,
      termsVersion: '',
      updatedAt: new Date('2026-08-17T12:00:00.000Z'),
    });
    assert.equal(
      writes.get('university-clubs/139755')?.clubId,
      'campus-cats',
    );
    assert.ok(
      (writes.get('universities/139755')?.searchPrefixes as string[]).includes(
        'georgia',
      ),
    );
    assert.equal(writes.has('billing-accounts/campus-cats'), false);
    assert.equal(
      [...writes.values()].some((data) =>
        ['customerId', 'subscriptionId', 'outstandingInvoiceId'].some(
          (key) => data[key] != null,
        ),
      ),
      false,
    );
  });
});
