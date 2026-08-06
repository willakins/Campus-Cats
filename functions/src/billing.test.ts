import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GoogleCloudBillingReader } from './billing';

const config = {
  projectId: 'campuscats-d7a5e',
  exportProjectId: 'campuscats-d7a5e',
  datasetId: 'billing_export',
  location: 'US',
};

describe('GoogleCloudBillingReader', () => {
  it('returns twelve monthly project costs with credits applied', async () => {
    let receivedQuery = '';
    let receivedParams: Readonly<Record<string, unknown>> = {};
    const reader = new GoogleCloudBillingReader(config, {
      async query(options) {
        receivedQuery = options.query;
        receivedParams = options.params;
        return [[
          {
            month: '2026-08',
            currency: 'USD',
            gross_cost: 12.5,
            credits: 10,
            net_cost: 2.5,
            data_through: '2026-08-05T10:00:00Z',
          },
        ]];
      },
    });

    const result = await reader.getSummary();

    assert.equal(result.status, 'ready');
    if (result.status !== 'ready') return;
    assert.deepEqual(result.months, [
      {
        month: '2026-08',
        currency: 'USD',
        grossCost: 12.5,
        credits: 10,
        netCost: 2.5,
      },
    ]);
    assert.equal(result.dataThrough, '2026-08-05T10:00:00Z');
    assert.match(receivedQuery, /gcp_billing_export_v1_\*/);
    assert.match(receivedQuery, /LIMIT 12/);
    assert.deepEqual(receivedParams, {
      applicationProjectId: 'campuscats-d7a5e',
    });
  });

  it('reports missing export setup without leaking provider errors', async () => {
    const reader = new GoogleCloudBillingReader(config, {
      async query() {
        throw Object.assign(new Error('dataset missing'), { code: 404 });
      },
    });

    const result = await reader.getSummary();
    assert.equal(result.status, 'setup-required');
    assert.equal(result.projectId, 'campuscats-d7a5e');
    assert.equal(result.exportProjectId, 'campuscats-d7a5e');
    assert.equal(result.datasetId, 'billing_export');
    if (result.status === 'setup-required') {
      assert.equal(result.reason, 'export-not-configured');
    }
  });

  it('distinguishes service-account access from a missing export', async () => {
    const reader = new GoogleCloudBillingReader(config, {
      async query() {
        throw Object.assign(new Error('permission details'), { code: 403 });
      },
    });

    const result = await reader.getSummary();
    assert.equal(result.status, 'setup-required');
    if (result.status === 'setup-required') {
      assert.equal(result.reason, 'access-denied');
    }
  });

  it('rejects unsafe dataset identifiers before constructing SQL', () => {
    assert.throws(
      () =>
        new GoogleCloudBillingReader({
          ...config,
          datasetId: 'billing_export`; DROP TABLE users; --',
        }),
      /Invalid billing export dataset ID/,
    );
  });
});
