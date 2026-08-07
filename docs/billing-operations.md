# Club billing operations

Club subscriptions use Stripe Billing. Firestore contains a sanitized access projection and provider identifiers needed by server code; Stripe remains the source of truth for invoices and payments.

## Stripe configuration

Before deploying billing functions, create two monthly metered recurring Prices in the S corporation's Stripe account and assign stable lookup keys:

- `activity_units_monthly`: meter event `activity_units`, sum usage, billed per event.
- `media_bytes_monthly`: meter event `media_bytes`, sum exact uploaded bytes. Configure the Price quantity transformation to divide by `1,000,000` and round up so rounding occurs once on the monthly aggregate.

The functions resolve these lookup keys at runtime and reject inactive, non-USD,
non-monthly, non-metered, incorrectly aggregated, or incorrectly transformed Prices.

Enable Stripe Tax, activate the Customer Portal, and enable cards. Stripe Checkout exposes Apple Pay automatically on eligible browsers and devices after the domain is registered in Stripe.

Set these Firebase function parameters:

- `STRIPE_ACTIVITY_PRICE_LOOKUP_KEY` (for example, `activity_units_monthly`)
- `STRIPE_MEDIA_PRICE_LOOKUP_KEY` (for example, `media_bytes_monthly`)
- `STRIPE_ACTIVITY_METER_EVENT` (defaults to `activity_units`)
- `STRIPE_MEDIA_METER_EVENT` (defaults to `media_bytes`)
- `STRIPE_AUTOMATIC_TAX` (defaults to `true`)
- `BILLING_WEB_APP_ORIGIN` (defaults to `https://campuscats-d7a5e.web.app`)

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `SENDGRID_API_KEY` as Firebase secrets. Configure the Stripe webhook to call the deployed `stripeWebhook` function for:

- `checkout.session.completed`
- `customer.updated`
- `invoice.created`
- `invoice.finalized`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

The Customer Portal must allow billing-address, name, email, tax-ID, and payment-method updates. A manual-billing club uses this hosted customer-details flow without being forced to save a card; `customer.updated` activates hosted monthly invoices after required details are complete. Configure invoice branding and verified sender/domain settings before enabling live billing.

The `invoice.created` handler disables automatic advancement, dispatches usage for that
club and prior local month, and creates a reconciliation record. A scheduled job
finalizes the invoice only after every outbox event is sent and its activity/media sums
match the monthly Firestore aggregate. Leave both five-minute billing schedules enabled.

## Create a club

The protected command uses Firebase Application Default Credentials and sends the first-President invitation through SendGrid:

```sh
cd functions
SENDGRID_API_KEY=... INVITATION_FROM_EMAIL=... npm run admin:create-club -- \
  --name "Example Campus Cats" \
  --slug example-campus-cats \
  --timezone America/New_York \
  --president-email president@example.edu \
  --billing-email billing@example.edu \
  --web-origin https://app.example.com
```

New clubs start in `pending_setup` with enforcement enabled. Their President can sign in on the web and choose automatic payment or hosted monthly invoices. Native apps show status only and never show payment links.

## Migrate the existing club

Take and verify an external Firestore/Storage backup first. The apply command resolves
the supplied `gs://` prefix and refuses to start if it contains no backup objects. Then
inspect the migration without writing:

```sh
cd functions
npm run admin:migrate-campus-cats -- --dry-run --timezone America/New_York
```

Apply it only with the verified backup reference:

```sh
npm run admin:migrate-campus-cats -- \
  --apply \
  --backup-reference gs://verified-backup/path \
  --timezone America/New_York
```

The command enters maintenance mode, copies root collections and media to `clubs/campus-cats`, records original identity fields, validates document counts and SHA-256 checksums, verifies every copied media object's size and provider checksum, then reopens access. Source collections and root media are retained for rollback. Billing enforcement stays disabled until the existing President completes setup.

If validation or launch fails, use the printed migration run ID:

```sh
npm run admin:rollback-campus-cats -- \
  --run-id campus-cats-2026-08-07T12-00-00-000Z
```

Rollback re-enters maintenance, revalidates every retained root collection, restores
the original identity fields, and leaves billing enforcement disabled. It deliberately
does not delete the copied tenant data. Redeploy the pre-migration application build to
complete a code rollback.

## Launch verification

Use Stripe test mode and test clocks to run setup, manual and automatic collection, failed payment, grace, suspension, restoration, cancellation, and out-of-order webhook scenarios. Run `npm run emulator:exec` from the repository root to validate cross-club and suspended-access rules. Do not enable production enforcement until the published pricing, terms, privacy, cancellation/refund policy, variable-charge authorization, tax registrations, live Prices, webhook secret, and business-account verification are complete.
