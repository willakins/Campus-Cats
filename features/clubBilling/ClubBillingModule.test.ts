import { ClubAccess, Role, parseClubAccess, parseUser } from '../../core/domain';
import { ClubBillingPort } from '../../core/ports';
import { ClubBillingModule } from './ClubBillingModule';

const president = parseUser({
  id: 'president-1',
  email: 'president@example.com',
  role: Role.President,
  clubId: 'campus-cats',
});
const member = parseUser({
  id: 'member-1',
  email: 'member@example.com',
  role: Role.Member,
  clubId: 'campus-cats',
});
const access: ClubAccess = parseClubAccess({
  clubId: 'campus-cats',
  clubName: 'Campus Cats',
  timezone: 'America/New_York',
  billingEnforcementEnabled: true,
  maintenanceMode: false,
  accessState: 'enabled',
  paymentStanding: 'current',
  collectionMethod: 'manual',
});

const buildPort = (): ClubBillingPort => ({
  observeAccess(_clubId, onChange) {
    onChange(access);
    return () => undefined;
  },
  async getSummary() {
    return {
      ...access,
      billingEmail: 'billing@example.com',
      currency: 'usd',
      outstandingBalance: 0,
      activityUnitPriceLabel: '$0.01 per activity unit',
      mediaMegabytePriceLabel: '$0.02 per MB',
      currentUsage: {
        activityUnits: 0,
        mediaBytes: 0,
        periodStartsAt: '2026-08-01T04:00:00.000Z',
        periodEndsAt: '2026-09-01T04:00:00.000Z',
      },
      invoices: [],
    };
  },
  async createSetupSession() {
    return { url: 'https://billing.example/setup' };
  },
  async createPortalSession() {
    return { url: 'https://billing.example/portal' };
  },
  async payOutstandingInvoice() {
    return { url: 'https://billing.example/invoice' };
  },
  async setCollectionMethod() {
    return undefined;
  },
  async updateBillingEmail() {},
  async scheduleCancellation() {
    return access;
  },
  async resumeSubscription() {
    return access;
  },
});

describe('ClubBillingModule', () => {
  it('scopes access observation to the actor club', () => {
    const port = buildPort();
    const observe = jest.spyOn(port, 'observeAccess');
    const module = new ClubBillingModule(port);
    const onChange = jest.fn();
    module.observeAccess(president, onChange);
    expect(observe).toHaveBeenCalledWith('campus-cats', onChange, undefined);
  });

  it('allows Presidents to manage billing and denies other club roles', async () => {
    const port = buildPort();
    const update = jest.spyOn(port, 'updateBillingEmail');
    const module = new ClubBillingModule(port);

    await expect(
      module.updateBillingEmail(member, 'billing@example.com'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    await expect(
      module.updateBillingEmail(president, 'billing@example.com'),
    ).resolves.toMatchObject({ ok: true });
    expect(update).toHaveBeenCalledTimes(1);
  });
});
