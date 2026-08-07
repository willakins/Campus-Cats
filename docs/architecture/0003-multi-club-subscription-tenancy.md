# ADR 0003: Multi-club subscription tenancy

- Status: Accepted
- Date: 2026-08-07

## Context

Campus Cats is becoming an invite-only, multi-club service. Each club needs isolated
content and media, a President-managed Stripe subscription, usage metering, and an
entitlement that can suspend normal app access without deleting club data. The prior
architecture decisions intentionally preserved the original root collections and
Storage paths; that compatibility constraint cannot support tenant isolation.

## Decision

This decision supersedes only the persistence-path, no-migration, and billing-role
compatibility clauses in ADR 0001, ADR 0002, and the behavior matrix. Their module,
port, presentation, and provider-boundary decisions otherwise remain in force.

- Club content and public profiles live under `clubs/{clubId}` subcollections. Club
  media lives under `clubs/{clubId}` Storage prefixes. Global `users/{uid}` records
  retain identity, one `clubId`, and the user's club role.
- `clubs/{clubId}/access/public` is the only club document readable while a club is
  suspended. It contains the sanitized entitlement projection, not billing contacts,
  provider identifiers, migration metadata, or backup references.
- Stripe is the monetary source of truth. Firestore stores independent access and
  payment-standing fields, a server-only billing account, immutable usage outbox
  events, webhook claims, and invoice-reconciliation records.
- Club Presidents alone manage their club's customer billing. The global
  `platformAdmin` identity flag alone grants infrastructure-cost reporting and cloud
  console links; it grants no additional club-content authority.
- Legacy role `4` remains decodable only long enough to migrate existing accounts to
  an ordinary club role plus `platformAdmin`. New clubs and ordinary role-management
  workflows do not assign it.
- Customer-billing callables translate transport in `index.ts` and dispatch through
  dependency-injected handlers in `customerBillingHandlers.ts`. The workflow service
  owns Stripe coordination and entitlement policy behind that seam.
- Subscription screens use the existing `ClubBillingPort` and public feature module.
  Deterministic module tests and Firebase projection parsing tests cover the port
  contract, while rendered route tests cover President and native behavior.
- Signed-out tenancy has no implicit `campus-cats` default. A device-local university
  selection may provide a public selected-club scope for branding and login, while a
  signed-in `users/{uid}.clubId` always overrides that selection. Signing out reveals,
  but does not erase, the saved selection.
- University discovery and club claiming are global server workflows rather than club
  content. The synchronized Scorecard catalog, provider overrides, university mapping,
  claims, setup requests, and throttles are never directly client-readable. Bounded
  callable projections expose search results and public authentication metadata.
- A verified university claim provisions deterministic tenant identity
  `club-{scorecardId}` through the same reusable provisioning service as the protected
  club-creation command. Georgia Tech remains the explicit `campus-cats` exception and
  is connected through a seeded university mapping.

## Migration and rollback

The existing deployment is copied into the `campus-cats` tenant during maintenance
mode. The migration requires a resolvable `gs://` backup, records original identity
fields, validates transformed document counts and checksums, and verifies copied media
size and provider checksum. Legacy roots and media are retained. A protected rollback
command validates those sources, restores original identity fields, and disables
billing enforcement before the previous application build is redeployed.

## Consequences

- A production data migration is required before tenant enforcement is enabled.
- Code that bypasses tenant adapters or server tenant helpers is an isolation bug.
- App settings are not loaded for anonymous users until a mapped university has been
  selected; university search uses the neutral theme and club setup renders local
  light/dark previews without creating a tenant.
- Access policy is intentionally represented in domain code, Firebase rules, and
  scheduled server enforcement; shared truth-table tests must keep those runtimes in
  agreement.
- Live billing still requires configured Stripe lookup keys, meters, webhooks, Tax,
  portal settings, legal terms, and verified business information.
