import { Role, parseUser } from '../../core/domain';
import {
  BillingProviderPresentation,
  BillingReader,
  BillingSummary,
} from '../../core/ports';
import { BillingModule } from './BillingModule';

const developer = parseUser({
  id: 'developer-1',
  email: 'developer@gatech.edu',
  role: Role.Developer,
});
const platformAdmin = parseUser({
  id: 'admin-1',
  email: 'admin@gatech.edu',
  role: Role.Member,
  platformAdmin: true,
});
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const summary: BillingSummary = {
  status: 'ready',
  projectId: 'campuscats-d7a5e',
  exportProjectId: 'campuscats-d7a5e',
  datasetId: 'billing_export',
  generatedAt: '2026-08-05T12:00:00.000Z',
  dataThrough: '2026-08-05T10:00:00.000Z',
  months: [
    {
      month: '2026-08',
      currency: 'USD',
      grossCost: 12.5,
      credits: 10,
      netCost: 2.5,
    },
  ],
};
const presentation: BillingProviderPresentation = {
  settingsSubtitle: 'Review monthly cloud costs',
  consoleDescription: 'Cloud billing consoles',
  consoleLinks: () => [],
  setup: () => ({ message: 'Setup required', title: 'Setup', steps: [] }),
};

class FakeBillingReader implements BillingReader {
  calls = 0;

  constructor(private readonly result: BillingSummary = summary) {}

  async getSummary(): Promise<BillingSummary> {
    this.calls += 1;
    return this.result;
  }
}

describe('BillingModule', () => {
  it('loads monthly costs for a Developer', async () => {
    const reader = new FakeBillingReader();
    const module = new BillingModule({ reader, presentation });

    await expect(module.summary(developer)).resolves.toEqual({
      ok: true,
      value: summary,
      warnings: [],
    });
    expect(reader.calls).toBe(1);
    expect(module.presentation).toBe(presentation);
  });

  it('denies members without calling the billing service', async () => {
    const reader = new FakeBillingReader();
    const module = new BillingModule({ reader, presentation });

    await expect(module.summary(member)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    expect(reader.calls).toBe(0);
  });

  it('does not infer Developer access from the platform-admin flag', async () => {
    const reader = new FakeBillingReader();
    const module = new BillingModule({ reader, presentation });

    await expect(module.summary(platformAdmin)).resolves.toMatchObject({
      ok: false,
      error: {
        code: 'forbidden',
        message: 'Developer-only access is required to view infrastructure costs',
      },
    });
    expect(reader.calls).toBe(0);
  });

  it('requires authentication before reading billing', async () => {
    const reader = new FakeBillingReader();
    const module = new BillingModule({ reader, presentation });

    await expect(module.summary(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    expect(reader.calls).toBe(0);
  });

  it('maps billing service failures to a safe dependency error', async () => {
    const reader: BillingReader = {
      async getSummary() {
        throw new Error('private provider details');
      },
    };
    const module = new BillingModule({ reader, presentation });

    await expect(module.summary(developer)).resolves.toEqual({
      ok: false,
      error: {
        code: 'dependency_failure',
        message: 'Could not load billing data',
      },
    });
  });
});
