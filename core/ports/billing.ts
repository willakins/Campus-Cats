export type BillingSetupReason =
  | 'export-not-configured'
  | 'access-denied';

export interface MonthlyBillingCost {
  readonly month: string;
  readonly currency: string;
  readonly grossCost: number;
  readonly credits: number;
  readonly netCost: number;
}

interface BillingSummaryBase {
  readonly projectId: string;
  readonly exportProjectId: string;
  readonly datasetId: string;
  readonly generatedAt: string;
}

export type BillingSummary =
  | (BillingSummaryBase & {
      readonly status: 'ready';
      readonly dataThrough?: string;
      readonly months: readonly MonthlyBillingCost[];
    })
  | (BillingSummaryBase & {
      readonly status: 'setup-required';
      readonly reason: BillingSetupReason;
    });

export interface BillingReader {
  getSummary(): Promise<BillingSummary>;
}
