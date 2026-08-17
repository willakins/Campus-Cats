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
  it('derives trial, paid, lapsed, ending, and no-subscription states', () => {
    expect(clubSubscriptionLabel(access())).toBe('Paid');
    expect(
      clubSubscriptionLabel(
        access({ trialEndsAt: '2026-09-16T16:00:00.000Z' }),
        new Date('2026-09-01T00:00:00.000Z'),
      ),
    ).toBe('Free trial');
    expect(
      clubSubscriptionLabel(
        access({ trialEndsAt: '2026-09-16T16:00:00.000Z' }),
        new Date('2026-09-17T00:00:00.000Z'),
      ),
    ).toBe('Paid');
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

  it('labels an expiring development trial as a trial and closes access at its boundary', () => {
    const trialEndsAt = '2026-09-16T12:00:00.000Z';
    const trial = access({ trialEndsAt, scheduledEndAt: trialEndsAt });

    expect(
      clubSubscriptionLabel(trial, new Date('2026-09-16T11:59:59.999Z')),
    ).toBe('Free trial');
    expect(
      clubHasAppAccess(trial, new Date('2026-09-16T11:59:59.999Z')),
    ).toBe(true);
    expect(
      clubHasAppAccess(trial, new Date('2026-09-16T12:00:00.000Z')),
    ).toBe(false);
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
