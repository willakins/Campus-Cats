import {
  ClubAccess,
  clubHasAppAccess,
  clubSubscriptionLabel,
  parseClubAccess,
} from './clubBilling';

const access = (overrides: Partial<ClubAccess> = {}): ClubAccess =>
  parseClubAccess({
    clubId: 'campus-cats',
    clubName: 'Campus Cats',
    timezone: 'America/New_York',
    billingEnforcementEnabled: true,
    maintenanceMode: false,
    accessState: 'enabled',
    paymentStanding: 'current',
    collectionMethod: 'manual',
    ...overrides,
  });

describe('club subscription projection', () => {
  it('derives paid, lapsed, ending, and no-subscription states', () => {
    expect(clubSubscriptionLabel(access())).toBe('Paid');
    expect(
      clubSubscriptionLabel(access({ paymentStanding: 'past_due' })),
    ).toBe('Lapsed');
    expect(
      clubSubscriptionLabel(
        access({
          paymentStanding: 'past_due',
          scheduledEndAt: '2026-09-01T04:00:00.000Z',
        }),
      ),
    ).toBe('Ending');
    expect(
      clubSubscriptionLabel(access({ accessState: 'suspended' })),
    ).toBe('No subscription');
  });

  it('keeps access through grace and cancellation deadlines, then closes it', () => {
    const ending = access({
      paymentStanding: 'past_due',
      graceEndsAt: '2026-09-01T04:00:00.000Z',
      scheduledEndAt: '2026-10-01T04:00:00.000Z',
    });
    expect(clubHasAppAccess(ending, new Date('2026-09-01T03:59:59.999Z'))).toBe(
      true,
    );
    expect(clubHasAppAccess(ending, new Date('2026-09-01T04:00:00.000Z'))).toBe(
      false,
    );
  });

  it('blocks maintenance and suspended clubs while preserving rollout access', () => {
    expect(clubHasAppAccess(access({ maintenanceMode: true }))).toBe(false);
    expect(clubHasAppAccess(access({ accessState: 'suspended' }))).toBe(false);
    expect(
      clubHasAppAccess(
        access({
          accessState: 'pending_setup',
          billingEnforcementEnabled: false,
        }),
      ),
    ).toBe(true);
  });
});
