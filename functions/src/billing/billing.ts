import { BigQuery } from '@google-cloud/bigquery';

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

interface QueryOptions {
  readonly query: string;
  readonly location: string;
  readonly params: Readonly<Record<string, unknown>>;
  readonly maximumBytesBilled: string;
  readonly useQueryCache: boolean;
}

interface QueryRunner {
  query(options: QueryOptions): Promise<[unknown[]]>;
}

interface BillingReaderConfig {
  readonly projectId: string;
  readonly exportProjectId: string;
  readonly datasetId: string;
  readonly location: string;
}

interface BillingRow {
  readonly month: string;
  readonly currency: string;
  readonly gross_cost: number;
  readonly credits: number;
  readonly net_cost: number;
  readonly data_through: string;
}

export class GoogleCloudBillingReader {
  readonly #query: QueryRunner;
  readonly #config: BillingReaderConfig;

  constructor(config: BillingReaderConfig, query?: QueryRunner) {
    validateProjectId(config.projectId);
    validateProjectId(config.exportProjectId);
    validateDatasetId(config.datasetId);
    this.#config = config;
    if (query) {
      this.#query = query;
    } else {
      const bigQuery = new BigQuery({ projectId: config.exportProjectId });
      this.#query = {
        async query(options) {
          const [rows] = await bigQuery.query({
            ...options,
            params: { ...options.params },
          });
          return [rows];
        },
      };
    }
  }

  async getSummary(): Promise<BillingSummary> {
    const base = {
      projectId: this.#config.projectId,
      exportProjectId: this.#config.exportProjectId,
      datasetId: this.#config.datasetId,
      generatedAt: new Date().toISOString(),
    };

    try {
      const [rawRows] = await this.#query.query({
        query: monthlyCostQuery(
          this.#config.exportProjectId,
          this.#config.datasetId,
        ),
        location: this.#config.location,
        params: { applicationProjectId: this.#config.projectId },
        maximumBytesBilled: '104857600',
        useQueryCache: true,
      });
      const months = rawRows.map(parseBillingRow);
      return {
        ...base,
        status: 'ready',
        dataThrough: months[0]?.dataThrough,
        months: months.map(({ dataThrough: _dataThrough, ...month }) => month),
      };
    } catch (error) {
      const code = errorCode(error);
      if (isMissingExportError(error)) {
        return {
          ...base,
          status: 'setup-required',
          reason: 'export-not-configured',
        };
      }
      if (code === 403) {
        return {
          ...base,
          status: 'setup-required',
          reason: 'access-denied',
        };
      }
      throw error;
    }
  }
}

export function createGoogleCloudBillingReader(): GoogleCloudBillingReader {
  const projectId =
    process.env.GCLOUD_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    'campuscats-d7a5e';
  return new GoogleCloudBillingReader({
    projectId,
    exportProjectId: process.env.BILLING_EXPORT_PROJECT_ID ?? projectId,
    datasetId: process.env.BILLING_EXPORT_DATASET_ID ?? 'billing_export',
    location: process.env.BILLING_EXPORT_LOCATION ?? 'US',
  });
}

function monthlyCostQuery(exportProjectId: string, datasetId: string): string {
  return `
    SELECT
      CONCAT(SUBSTR(invoice.month, 1, 4), '-', SUBSTR(invoice.month, 5, 2)) AS month,
      currency,
      CAST(ROUND(SUM(cost), 6) AS FLOAT64) AS gross_cost,
      CAST(ROUND(-SUM(IFNULL((
        SELECT SUM(credit.amount) FROM UNNEST(credits) AS credit
      ), 0)), 6) AS FLOAT64) AS credits,
      CAST(ROUND(SUM(cost) + SUM(IFNULL((
        SELECT SUM(credit.amount) FROM UNNEST(credits) AS credit
      ), 0)), 6) AS FLOAT64) AS net_cost,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', MAX(export_time), 'UTC') AS data_through
    FROM \`${exportProjectId}.${datasetId}.gcp_billing_export_v1_*\`
    WHERE project.id = @applicationProjectId
      AND REGEXP_CONTAINS(invoice.month, r'^\\d{6}$')
      AND invoice.month >= FORMAT_DATE(
        '%Y%m',
        DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
      )
    GROUP BY month, currency
    ORDER BY month DESC
    LIMIT 12
  `;
}

function parseBillingRow(value: unknown): MonthlyBillingCost & {
  readonly dataThrough: string;
} {
  const row = value as Partial<BillingRow>;
  if (
    typeof row.month !== 'string' ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) ||
    typeof row.currency !== 'string' ||
    !row.currency ||
    !isFiniteNumber(row.gross_cost) ||
    !isFiniteNumber(row.credits) ||
    !isFiniteNumber(row.net_cost) ||
    typeof row.data_through !== 'string' ||
    Number.isNaN(Date.parse(row.data_through))
  ) {
    throw new Error('Cloud Billing returned an invalid monthly cost row');
  }
  return {
    month: row.month,
    currency: row.currency,
    grossCost: row.gross_cost,
    credits: row.credits,
    netCost: row.net_cost,
    dataThrough: row.data_through,
  };
}

function validateProjectId(value: string): void {
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value)) {
    throw new Error('Invalid billing export project ID');
  }
}

function validateDatasetId(value: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,1023}$/.test(value)) {
    throw new Error('Invalid billing export dataset ID');
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function errorCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = Number((error as { readonly code?: unknown }).code);
  return Number.isFinite(code) ? code : undefined;
}

function isMissingExportError(error: unknown): boolean {
  const code = errorCode(error);
  if (code === 404) return true;
  return (
    code === 400 &&
    error instanceof Error &&
    /gcp_billing_export_v1_\* does not match any table/i.test(error.message)
  );
}
