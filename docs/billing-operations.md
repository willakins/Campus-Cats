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
- `BILLING_EMAILS_ENABLED` (defaults to `false`; set to `true` only when billing
  notification delivery is ready)

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `SENDGRID_API_KEY` as Firebase secrets. Configure the Stripe webhook to call the deployed `stripeWebhook` function for:

- `checkout.session.completed`
- `customer.updated`
- `invoice.created`
- `invoice.finalized`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.trial_will_end`
- `customer.subscription.deleted`

First-time activation requires a card and starts one 30-day trial per club. Activity
and media usage during those 30 days is not sent to Stripe. The subscription converts
to automatic paid usage when the trial ends, and its first paid billing cycle is
anchored to the next month boundary in the club's timezone. The permanent
`billing-accounts/{clubId}.trialStartedAt` marker and Stripe subscription history both
prevent a club from receiving another trial. The server-only
`clubs/{clubId}.trialUsageEndsAt` cutoff remains after conversion so delayed usage
events that occurred during the trial also stay free. Stripe cancels a trial if its
saved payment method is missing at conversion.

The Customer Portal must allow billing-address, name, email, tax-ID, and payment-method
updates. After its first activation, a club may switch between automatic payment and
hosted monthly invoices. Configure invoice branding and verified sender/domain settings
before enabling live billing.

The `invoice.created` handler ignores Stripe's zero-dollar trial-start invoice. For a
normal monthly invoice it disables automatic advancement, dispatches usage for that
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

New clubs start in `pending_setup` with enforcement enabled. Their President signs in
on the web, adds a card, and starts the 30-day trial. The card is not charged during
the trial. Native apps show status only and never show payment links.

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

The command enters maintenance mode, copies root collections and media to `clubs/campus-cats`, records original identity fields, validates document counts and SHA-256 checksums, verifies every copied media object's size and provider checksum, then reopens access. Source collections and root media are retained for rollback. Billing enforcement stays disabled until an operator explicitly enables the subscription gate.

First deploy the billing functions with `BILLING_EMAILS_ENABLED=false`. Then inspect the
Campus Cats transition without writing and explicitly apply it:

```sh
cd functions
npm run admin:enable-campus-cats-billing -- --project campuscats-d7a5e
npm run admin:enable-campus-cats-billing -- --project campuscats-d7a5e --apply
```

The command enables enforcement in both the server-only club record and public access
projection. A club without a subscription enters `pending_setup`; a club with a
subscription keeps its current access state. The command does not call Stripe or send
email.

`BILLING_EMAILS_ENABLED` gates the application's SendGrid billing notifications.
Stripe sandboxes do not send automatic customer emails by default, but Stripe can send
selected test notifications to an active team member or verified-domain address. Keep
the sandbox's customer-email settings disabled and do not manually send invoices or
receipts while testing.

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

Use Stripe test mode and test clocks to run initial trial setup, the three-day trial
reminder, automatic conversion, post-trial manual and automatic collection, failed
payment, grace, suspension, restoration, cancellation, and out-of-order webhook
scenarios. Run `npm run emulator:exec` from the repository root to validate cross-club
and suspended-access rules. Do not enable production enforcement until the published
pricing, terms, privacy, cancellation/refund policy, variable-charge authorization,
tax registrations, live Prices, webhook secret, and business-account verification are
complete.
