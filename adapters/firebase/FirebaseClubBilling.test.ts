import { normalizeClubAccess } from './FirebaseClubBilling';

jest.mock('firebase/firestore', () => ({
  Timestamp: class MockTimestamp {},
  doc: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

describe('FirebaseClubBilling access projection', () => {
  it('parses only the sanitized tenant access contract', () => {
    const access = normalizeClubAccess('campus-cats', {
      clubName: 'Campus Cats',
      timezone: 'America/New_York',
      billingEnforcementEnabled: true,
      maintenanceMode: false,
      accessState: 'enabled',
      paymentStanding: 'past_due',
      collectionMethod: 'manual',
      graceEndsAt: {
        toDate: () => new Date('2026-09-01T04:00:00.000Z'),
      },
      billingEmail: 'must-not-be-part-of-access@example.com',
      migrationBackupReference: 'gs://must-not-leak',
    });

    expect(access).toEqual({
      clubId: 'campus-cats',
      clubName: 'Campus Cats',
      timezone: 'America/New_York',
      billingEnforcementEnabled: true,
      maintenanceMode: false,
      accessState: 'enabled',
      paymentStanding: 'past_due',
      collectionMethod: 'manual',
      graceEndsAt: '2026-09-01T04:00:00.000Z',
    });
    expect(access).not.toHaveProperty('billingEmail');
    expect(access).not.toHaveProperty('migrationBackupReference');
  });
});
