# App billing officer tool

The App Billing screen reads Google Cloud Billing's Standard usage cost export and
shows the latest 12 invoice months for the deployed Firebase project. Firebase
projects are Google Cloud projects, so this report includes Firebase, Maps, Cloud
Functions, BigQuery, and other Google Cloud costs attributed to the same project.

Only signed-in users with role `1`, `2`, `3`, or `4` can request the report. The callable
Cloud Function checks that role in Firestore before it runs BigQuery. Google
credentials remain in the Functions runtime and are never returned to the app. The
Firebase Console, Google Cloud Billing, and billing-export setup links render only for
the Developer role (`4`).

## One-time Google Cloud setup

The current development project expects a US multi-region dataset named
`billing_export` in `campuscats-d7a5e`.

1. Open [Google Cloud Billing export](https://console.cloud.google.com/billing/export?project=campuscats-d7a5e)
   and select the billing account linked to `campuscats-d7a5e`.
2. Create a BigQuery dataset named `billing_export` in the `US` location if it does
   not exist.
3. Under **BigQuery export**, enable **Standard usage cost** and select that dataset.
4. Find the runtime service account for the deployed `getBillingSummary` function.
   Grant it **BigQuery Job User** on the export project and **BigQuery Data Viewer**
   on the `billing_export` dataset.
5. Deploy the function:

   ```bash
   npx firebase-tools deploy --only functions:campuscats:getBillingSummary
   ```

6. Return to **More → App Billing**. The initial export can take several hours to
   appear, and a complete retroactive backfill can take several days.

Google's setup documentation lists Billing Account Costs Manager or Billing Account
Administrator as the roles required to configure a standard usage export. Project
access alone is not enough to enable an export on the billing account.

## Optional configuration

The defaults need no environment file. If the export lives elsewhere, copy
`functions/.env.example` to the Firebase environment file used for the target project
and change:

- `BILLING_EXPORT_PROJECT_ID`
- `BILLING_EXPORT_DATASET_ID`
- `BILLING_EXPORT_LOCATION`

The query filters every row to the deployed Firebase project ID, applies credits,
uses BigQuery's result cache, and caps each query at 100 MiB billed. It runs only when
an authorized officer opens or retries the screen; there is no new scheduled sync.

## What the amounts mean

- **Usage** is the gross exported `cost` for the invoice month.
- **Credits** includes free-tier and promotional credits reported in the export.
- **Net cost** is usage plus the signed credit amounts.

The current month is provisional. Google services report costs at different times,
so recent usage can take more than 24 hours to appear.

Official references:

- [Set up Cloud Billing export to BigQuery](https://cloud.google.com/billing/docs/how-to/export-data-bigquery-setup)
- [Standard usage cost schema](https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage)
- [BigQuery query pricing and cost controls](https://cloud.google.com/bigquery/pricing)
