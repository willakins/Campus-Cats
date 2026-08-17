import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  overlayDevelopmentTrial,
  parseDevelopmentTrialOverlayOptions,
  runDevelopmentTrialOverlayCli,
} from './admin/overlayDevelopmentTrial';

describe('development trial overlay', () => {
  it('requires an explicit apply flag before the CLI may write', () => {
    assert.deepEqual(
      parseDevelopmentTrialOverlayOptions([
        '--project',
        'campus-cats-development',
      ]),
      { projectId: 'campus-cats-development', apply: false },
    );
    assert.equal(
      parseDevelopmentTrialOverlayOptions([
        '--project',
        'campus-cats-development',
        '--apply',
      ]).apply,
      true,
    );
  });

  it('refuses to inspect or write any project except Campus Cats Development', async () => {
    let touchedFirebase = false;

    await assert.rejects(
      () =>
        overlayDevelopmentTrial(
          { projectId: 'campuscats-d7a5e' },
          {
            now: () => new Date('2026-08-17T12:00:00.000Z'),
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

  it('dry-runs without committing documents', async () => {
    let commits = 0;
    const dependencies = {
      now: () => new Date('2026-08-17T12:00:00.000Z'),
      readDocument: async () => ({
        name: 'Campus Cats',
        timezone: 'America/New_York',
      }),
      writeDocuments: async () => {
        commits += 1;
      },
    };

    await runDevelopmentTrialOverlayCli(
      { projectId: 'campus-cats-development', apply: false },
      dependencies,
    );
    assert.equal(commits, 0);

    await runDevelopmentTrialOverlayCli(
      { projectId: 'campus-cats-development', apply: true },
      dependencies,
    );
    assert.equal(commits, 1);
  });

  it('overlays only club access with a new 30-day simulated trial', async () => {
    const writes = new Map<string, Record<string, unknown>>();
    const result = await overlayDevelopmentTrial(
      { projectId: 'campus-cats-development' },
      {
        now: () => new Date('2026-08-17T12:00:00.000Z'),
        readDocument: async (path) =>
          path === 'clubs/campus-cats'
            ? {
                name: 'Campus Cats',
                timezone: 'America/New_York',
                customerId: 'cloned-provider-state-is-not-copied',
              }
            : undefined,
        writeDocuments: async (documents) => {
          documents.forEach(({ path, data }) => writes.set(path, { ...data }));
        },
      },
    );

    assert.equal(result.trialEndsAt.toISOString(), '2026-09-16T12:00:00.000Z');
    assert.deepEqual([...writes.keys()], [
      'clubs/campus-cats',
      'clubs/campus-cats/access/public',
    ]);
    assert.equal(
      writes.get('clubs/campus-cats')?.trialUsageEndsAt,
      result.trialEndsAt,
    );
    assert.equal(
      writes.get('clubs/campus-cats/access/public')?.trialEndsAt,
      result.trialEndsAt,
    );
    assert.equal(
      writes.get('clubs/campus-cats/access/public')?.accessState,
      'enabled',
    );
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
