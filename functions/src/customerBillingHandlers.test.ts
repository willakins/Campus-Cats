import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CustomerBillingUseCases,
  handleCreateClubBillingSetupSession,
  handleGetClubBillingSummary,
  handleSetClubCollectionMethod,
  handleUpdateClubBillingEmail,
} from './customerBillingHandlers';

const service = (calls: unknown[][]): CustomerBillingUseCases => ({
  async getSummary(...args) {
    calls.push(['summary', ...args]);
    return {} as never;
  },
  async createSetupSession(...args) {
    calls.push(['setup', ...args]);
    return { url: 'https://billing.example/setup' };
  },
  async createPortalSession() {
    return { url: 'https://billing.example/portal' };
  },
  async payOutstandingInvoice() {
    return { url: 'https://billing.example/invoice' };
  },
  async setCollectionMethod(...args) {
    calls.push(['collection', ...args]);
    return {};
  },
  async updateBillingEmail(...args) {
    calls.push(['email', ...args]);
  },
  async scheduleCancellation() {
    return {} as never;
  },
  async resumeSubscription() {
    return {} as never;
  },
});

describe('customer billing callable handlers', () => {
  it('forwards identity and untrusted data through an injected use-case seam', async () => {
    const calls: unknown[][] = [];
    const useCases = service(calls);
    await handleCreateClubBillingSetupSession(
      { authUid: 'president-1', data: { returnUrl: 'https://app.example/billing' } },
      useCases,
    );
    await handleSetClubCollectionMethod(
      {
        authUid: 'president-1',
        data: { method: 'manual', returnUrl: 'https://app.example/billing' },
      },
      useCases,
    );
    await handleUpdateClubBillingEmail(
      { authUid: 'president-1', data: { email: 'billing@example.com' } },
      useCases,
    );
    assert.deepEqual(calls, [
      ['setup', 'president-1', 'https://app.example/billing'],
      ['collection', 'president-1', 'manual', 'https://app.example/billing'],
      ['email', 'president-1', 'billing@example.com'],
    ]);
  });

  it('preserves missing authentication for service authorization', async () => {
    const calls: unknown[][] = [];
    await handleGetClubBillingSummary({}, service(calls));
    assert.deepEqual(calls, [['summary', undefined]]);
  });
});
