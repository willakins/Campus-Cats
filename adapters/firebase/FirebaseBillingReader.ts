import { Functions, httpsCallable } from 'firebase/functions';

import {
  BillingSetupReason,
  BillingReader,
  BillingSummary,
  MonthlyBillingCost,
} from '../../core/ports';

export class FirebaseBillingReader implements BillingReader {
  constructor(private readonly functions: Functions) {}

  async getSummary(): Promise<BillingSummary> {
    const response = await httpsCallable(this.functions, 'getBillingSummary')(
      {},
    );
    return parseBillingSummary(response.data);
  }
}

function parseBillingSummary(value: unknown): BillingSummary {
  const data = recordValue(value);
  const projectId = nonEmptyString(data.projectId);
  const exportProjectId = nonEmptyString(data.exportProjectId);
  const datasetId = nonEmptyString(data.datasetId);
  const generatedAt = dateString(data.generatedAt);

  if (data.status === 'setup-required') {
    return {
      status: data.status,
      projectId,
      exportProjectId,
      datasetId,
      generatedAt,
      reason: setupReason(data.reason),
    };
  }

  if (data.status !== 'ready' || !Array.isArray(data.months)) {
    throw new Error('Invalid billing summary response');
  }

  return {
    status: data.status,
    projectId,
    exportProjectId,
    datasetId,
    generatedAt,
    dataThrough:
      data.dataThrough === undefined
        ? undefined
        : dateString(data.dataThrough),
    months: data.months.map(parseMonthlyCost),
  };
}

function parseMonthlyCost(value: unknown): MonthlyBillingCost {
  const data = recordValue(value);
  const month = nonEmptyString(data.month);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('Invalid billing summary response');
  }
  return {
    month,
    currency: nonEmptyString(data.currency),
    grossCost: finiteNumber(data.grossCost),
    credits: finiteNumber(data.credits),
    netCost: finiteNumber(data.netCost),
  };
}

function setupReason(value: unknown): BillingSetupReason {
  if (value !== 'export-not-configured' && value !== 'access-denied') {
    throw new Error('Invalid billing summary response');
  }
  return value;
}

function recordValue(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid billing summary response');
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Invalid billing summary response');
  }
  return value;
}

function dateString(value: unknown): string {
  const result = nonEmptyString(value);
  if (Number.isNaN(Date.parse(result))) {
    throw new Error('Invalid billing summary response');
  }
  return result;
}

function finiteNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Invalid billing summary response');
  }
  return value;
}
