import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SafetyActor, SafetyReports } from './reports';

// Integration tests cannot connect to production, even if a developer has ADC configured.
describe(
  'private safety reporting',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  () => {
    const app = initializeApp(
      { projectId: 'demo-campus-cats-test' },
      'safety-tests',
    );
    const db = getFirestore(app);
    let now = 100000;
    const reports = new SafetyReports(db, () => now);
    const member: SafetyActor = {
      uid: 'safety-member',
      authTime: 1000,
      email: 'member@example.test',
    };
    const admin: SafetyActor = {
      uid: 'safety-admin',
      authTime: 1000,
      email: 'admin@example.test',
    };
    const officer: SafetyActor = {
      uid: 'safety-officer',
      authTime: 1000,
      email: 'officer@example.test',
    };
    const submission = (requestId = 'report-1') => ({
      requestId,
      description: 'Please review this account.',
      contentReference: 'Profile name and chat timestamp',
    });
    const rejects = async (operation: Promise<unknown>, code: string) =>
      assert.rejects(
        operation,
        (error: unknown) => (error as { code?: string }).code === code,
      );

    before(async () => {
      await db.collection('safety-reports').limit(1).get();
    });
    beforeEach(async () => {
      now = 100000;
      await db.recursiveDelete(db.collection('safety-reports'));
      await db.recursiveDelete(db.collection('safety-report-limits'));
      await db
        .doc(`users/${member.uid}`)
        .set({ role: 0, clubId: 'expired-club', agreedToTerms: false });
      await db.doc(`users/${admin.uid}`).set({ role: 4, platformAdmin: true });
      await db
        .doc(`users/${officer.uid}`)
        .set({ role: 4, clubId: 'expired-club' });
    });
    after(async () => {
      await db.terminate();
      await deleteApp(app);
    });

    it('accepts a report without subscription or terms consent and exposes it only to platform administrators', async () => {
      const receipt = await reports.submit(member, submission());
      await rejects(reports.list(member, {}), 'permission-denied');
      await rejects(reports.list(officer, {}), 'permission-denied');
      const page = await reports.list(admin, {});
      assert.equal(page.reports.length, 1);
      assert.equal(page.reports[0].id, receipt.id);
      assert.equal(page.reports[0].reporterEmail, 'member@example.test');
      assert.equal(page.reports[0].clubId, 'expired-club');
      assert.equal(page.reports[0].notificationState, 'pending');
    });

    it('deduplicates concurrent retries and enforces an atomic per-account quota', async () => {
      const receipts = await Promise.all(
        Array.from({ length: 5 }, () => reports.submit(member, submission())),
      );
      assert.equal(new Set(receipts.map((receipt) => receipt.id)).size, 1);
      await Promise.all(
        [2, 3, 4, 5].map((index) =>
          reports.submit(member, submission(`report-${index}`)),
        ),
      );
      await reports.submit(member, submission()); // retries work even at the limit
      await rejects(
        reports.submit(member, submission('report-6')),
        'resource-exhausted',
      );
      now += 3600001;
      await reports.submit(member, submission('report-6'));
      assert.equal((await reports.list(admin, {})).reports.length, 6);
    });

    it('rejects attachments, identity spoofing, oversized text and path traversal', async () => {
      for (const data of [
        { ...submission(), reporterEmail: 'forged@example.test' },
        { ...submission(), attachment: 'file' },
        { ...submission(), requestId: '../users/admin' },
        { ...submission(), description: 'x'.repeat(3001) },
        { ...submission(), description: '  ' },
      ])
        await rejects(reports.submit(member, data), 'invalid-argument');
      await reports.submit(member, submission());
      await rejects(
        reports.submit(member, {
          ...submission(),
          description: 'Changed after receipt',
        }),
        'already-exists',
      );
    });

    it('rechecks bans, revocation and administrator removal instead of trusting a cached role', async () => {
      const receipt = await reports.submit(member, submission());
      for (const changed of [
        { banned: true },
        { deletionPending: true },
        { sessionRevokedAt: 1000 },
        { platformAdmin: false },
      ]) {
        await db
          .doc(`users/${admin.uid}`)
          .set({ platformAdmin: true, ...changed });
        await rejects(reports.list(admin, {}), 'permission-denied');
        await rejects(
          reports.update(admin, {
            id: receipt.id,
            revision: 0,
            status: 'closed',
            note: 'Reviewed',
          }),
          'permission-denied',
        );
      }
      await db.doc(`users/${member.uid}`).update({ banned: true });
      await rejects(
        reports.submit(member, submission('another')),
        'permission-denied',
      );
    });

    it('prevents stale case updates and keeps the original report when closing or reopening', async () => {
      const receipt = await reports.submit(member, submission());
      await reports.update(admin, {
        id: receipt.id,
        revision: 0,
        status: 'reviewing',
        note: 'Investigating',
      });
      await rejects(
        reports.update(admin, {
          id: receipt.id,
          revision: 0,
          status: 'closed',
          note: 'Stale',
        }),
        'failed-precondition',
      );
      await rejects(
        reports.update(officer, {
          id: receipt.id,
          revision: 1,
          status: 'closed',
          note: 'Officer attempt',
        }),
        'permission-denied',
      );
      await reports.update(admin, {
        id: receipt.id,
        revision: 1,
        status: 'closed',
        note: 'No violation found after review',
      });
      assert.equal(
        (await reports.list(admin, { status: 'open' })).reports.length,
        0,
      );
      const closed = (await reports.list(admin, { status: 'closed' }))
        .reports[0];
      assert.equal(closed.description, submission().description);
      assert.equal(closed.revision, 2);
      assert.equal(closed.lastNote, 'No violation found after review');
      await reports.update(admin, {
        id: receipt.id,
        revision: 2,
        status: 'open',
        note: 'New information received',
      });
      assert.equal(
        (await reports.list(admin, { status: 'open' })).reports.length,
        1,
      );
    });

    it('paginates without dropping reports with identical timestamps', async () => {
      for (let index = 0; index < 28; index++) {
        if (index % 5 === 0) now += 3600001;
        await reports.submit(member, submission(`page-${index}`));
      }
      const first = await reports.list(admin, {});
      assert.equal(first.reports.length, 25);
      const second = await reports.list(admin, { cursor: first.nextCursor });
      assert.equal(second.reports.length, 3);
      assert.equal(second.nextCursor, null);
      assert.equal(
        new Set(
          [...first.reports, ...second.reports].map((report) => report.id),
        ).size,
        28,
      );
    });

    it('removes chat bodies and restricts officer accounts only for an existing case and live platform administrator', async () => {
      const receipt = await reports.submit(member, submission());
      const message = db.doc('clubs/other-club/chat-messages/message-1');
      await message.set({
        body: 'Ordinary test fixture content',
        isClubPing: true,
        dayKey: '2026-10-16',
      });
      const removal = {
        id: receipt.id,
        action: 'remove-chat',
        targetId: 'message-1',
        clubId: 'other-club',
        note: 'Test review reason',
      };
      await rejects(reports.moderate(officer, removal), 'permission-denied');
      await rejects(
        reports.moderate(admin, { ...removal, id: 'missing-case' }),
        'not-found',
      );
      await reports.moderate(admin, removal);
      assert.equal(
        (await message.get()).data()?.body,
        '[Removed by Campus Cats safety team]',
      );
      assert.equal((await message.get()).data()?.isClubPing, false);
      await reports.moderate(admin, {
        id: receipt.id,
        action: 'restrict-account',
        targetId: officer.uid,
        note: 'Officer safety restriction',
      });
      await rejects(reports.submit(officer, submission()), 'permission-denied');
      await rejects(
        reports.moderate(admin, {
          id: receipt.id,
          action: 'restrict-account',
          targetId: admin.uid,
          note: 'Self restriction',
        }),
        'failed-precondition',
      );
    });
  },
);
