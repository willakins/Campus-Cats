import { Functions } from 'firebase/functions';

import { FirebaseBillingReader } from './FirebaseBillingReader';

const mockCallable = jest.fn();

jest.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => (data: unknown) =>
    mockCallable(name, data),
}));

describe('FirebaseBillingReader', () => {
  beforeEach(() => mockCallable.mockReset());

  it('loads and validates monthly billing data through the callable function', async () => {
    mockCallable.mockResolvedValue({
      data: {
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
      },
    });
    const reader = new FirebaseBillingReader({} as Functions);

    await expect(reader.getSummary()).resolves.toMatchObject({
      status: 'ready',
      months: [{ month: '2026-08', netCost: 2.5 }],
    });
    expect(mockCallable).toHaveBeenCalledWith('getBillingSummary', {});
  });

  it('accepts the explicit export setup state', async () => {
    mockCallable.mockResolvedValue({
      data: {
        status: 'setup-required',
        projectId: 'campuscats-d7a5e',
        exportProjectId: 'campuscats-d7a5e',
        datasetId: 'billing_export',
        generatedAt: '2026-08-05T12:00:00.000Z',
        reason: 'export-not-configured',
      },
    });
    const reader = new FirebaseBillingReader({} as Functions);

    await expect(reader.getSummary()).resolves.toMatchObject({
      status: 'setup-required',
      reason: 'export-not-configured',
    });
  });

  it('rejects malformed provider responses', async () => {
    mockCallable.mockResolvedValue({
      data: {
        status: 'ready',
        projectId: 'campuscats-d7a5e',
        exportProjectId: 'campuscats-d7a5e',
        datasetId: 'billing_export',
        generatedAt: 'not-a-date',
        months: [],
      },
    });
    const reader = new FirebaseBillingReader({} as Functions);

    await expect(reader.getSummary()).rejects.toThrow(
      'Invalid billing summary response',
    );
  });
});
