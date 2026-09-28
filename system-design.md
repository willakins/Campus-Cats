# System Design

| Field                     | Value                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status                    | Hosting review: retain Firebase; Supabase architecture is conditional on a demonstrated relational need                                           |
| Owner                     | Campus Cats maintainers (specific owner TBD)                                                                                                      |
| Last updated              | 2026-09-28                                                                                                                                        |
| Primary recommendation    | Retain Firebase Blaze for the existing app; prefer Supabase Pro if a PostgreSQL migration becomes justified                                       |
| Budget constraint         | USD 150/month hard ceiling before payment fees and labor; prefer USD 50/month or less at the projected year-one workload                          |
| Consequential assumptions | U.S. deployment; 10 clubs, 2,000 registered users, and 600 MAU in year one; English-only mobile app; one to three part-time volunteer maintainers |

At the projected workload, there is no demonstrated hosting-cost reason to migrate the existing app. Retain Firebase, measure its bill, and optimize the expensive operations first. Supabase Pro remains the preferred managed relational target if joins, constraints, or geospatial requirements justify the implementation effort. Sections 3.2–4.6 describe that conditional target, not an approved migration. The previous AWS/RDS proposal remains unattractive for this budget.

## Contents

- [1. Context](#1-context)
- [2. Requirements](#2-requirements)
- [3. Design](#3-design)
- [4. Implementation Breakdown](#4-implementation-breakdown)
- [5. Risks, Open Questions, and Assumptions](#5-risks-open-questions-and-assumptions)

## 1. Context

### 1.1 Audience

Campus Cats is operated and used by university volunteers:

- Members report sightings, browse known cats, check feeding stations, and receive club updates, usually from a phone while moving around campus.
- Officers manage cats, stations, announcements, events, surveys, voting, and moderation in spare time rather than as paid operators.
- Presidents manage access, settings, succession, onboarding, and club billing.
- A very small maintainer group handles releases, incidents, backups, provider configuration, and support.

The primary product is iOS and Android. The repository also configures Firebase Hosting for the Expo web export, a native SAML redirect bridge, public flows, and an iNaturalist OAuth callback. Preserve these dependencies even if a general-purpose web client is outside product scope; see [web hosting](docs/web-hosting.md) and [Firebase configuration](firebase.json).

The audience changes the architecture:

- low and predictable cost is a product requirement because infrastructure competes with food, shelter, and veterinary spending;
- managed services and one consolidated control plane are preferable to infrastructure that needs routine patching or on-call expertise;
- intermittent mobile connectivity requires durable drafts, safe retries, and resumable uploads;
- the system is not safety-critical, so expensive high-availability infrastructure is inappropriate unless clubs later fund it;
- exact locations, member identity, moderation, ballots, and billing metadata still require strong isolation and recovery.

### 1.2 Current Solution and Problem

Without the app, sightings, cat histories, feeding-station status, and time-sensitive updates are fragmented across people and communication channels. That causes duplicate entry, stale information, uncertain responsibility, and weak access control.

The repository currently implements Expo clients that access Firebase Auth, Firestore, and Cloud Storage, with Cloud Functions for privileged operations and integrations. It implements realtime workflows, but durable Firestore offline persistence is not established: the app uses the Firebase JavaScript SDK, whose React Native support excludes Firestore persistence. Auth persistence in AsyncStorage is separate. Offline drafts need explicit work whichever backend is selected. ([Supported environments](https://firebase.google.com/docs/web/environments-js-sdk)) Its main architectural pressures are relational:

- cats, tags, favorites, sightings, contributors, comments, users, roles, surveys, ballots, and billing state are related across collections;
- foreign-key, uniqueness, and multi-entity invariants are repeated in application code, Functions, and Security Rules;
- richer catalog filters, reports, and geospatial queries require composite indexes, denormalized projections, or client/server joins;
- direct provider access makes Security Rules part of the application API.

No repository evidence establishes production traffic, current cloud spend, media delivery, or query amplification. Capacity figures below are explicit planning assumptions.

### 1.3 Proposed Solution

Campus Cats gives each university club an isolated mobile workspace for photo-backed sightings, a searchable cat catalog, feeding-station status, community coordination, role-aware administration, university onboarding, imports, and subscription billing.

The solution must preserve relational integrity without requiring volunteers to operate a conventional server/database/network stack. It deliberately excludes a production web client, emergency response, veterinary medical records, a public social network, and general-purpose payment processing.

## 2. Requirements

### 2.1 Functional Requirements

| ID    | Priority | Capability and acceptance boundary                                                                                              |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| FR-1  | Must     | A visitor can find an existing club and see login branding without reading private club content.                                |
| FR-2  | Must     | A verified school-domain President can use one expiring invitation to create exactly one club and initial President membership. |
| FR-3  | Must     | Password or university SAML authentication derives membership and role from trusted data.                                       |
| FR-4  | Must     | Active Members read member-visible content only for authorized clubs.                                                           |
| FR-5  | Must     | A Member can safely retry a photo-backed sighting without duplicates or partial publication.                                    |
| FR-6  | Must     | Authorized roles manage catalog, stations, community content, access, moderation, settings, and billing according to policy.    |
| FR-7  | Must     | Media ownership, state, type, size, and key are transactional metadata; abandoned uploads are reconciled.                       |
| FR-8  | Must     | Notifications and provider side effects start only after durable content commits and remain replayable.                         |
| FR-9  | Must     | Surveys, nominations, ballots, reactions, role changes, and succession enforce phase and uniqueness transactionally.            |
| FR-10 | Must     | Moderation actions and their session/access effects are auditable.                                                              |
| FR-11 | Must     | iNaturalist imports remain attributed and read-only with local moderation.                                                      |
| FR-12 | Must     | Each club has isolated entitlement/subscription state; suspension does not delete data.                                         |
| FR-13 | Must     | Billing webhooks, imports, email, and push jobs are idempotent and expose failed work.                                          |
| FR-14 | Should   | Critical journeys expose accessible loading, success, empty, offline, validation, and partial-success states.                   |
| FR-15 | Should   | Maintainers can deploy, migrate, restore, roll back, inspect cost, and validate tenant isolation with documented automation.    |

### 2.2 Nonfunctional Requirements

#### Capacity model

| Metric                |                     Year one | Three-year threshold | Basis                                                      |
| --------------------- | ---------------------------: | -------------------: | ---------------------------------------------------------- |
| Clubs                 |                           10 |                   50 | Assumption                                                 |
| Registered users      |                        2,000 |               10,000 | 200 per club                                               |
| MAU / DAU             |                    600 / 200 |        3,000 / 1,000 | Assumption                                                 |
| Peak concurrent users |                           50 |                  250 | Event-driven burst                                         |
| Logical record reads  |                   30,000/day |          150,000/day | DAU × 5 sessions × 30 records                              |
| Mutations             |                      600/day |            3,000/day | DAU × 3                                                    |
| Peak request rate     |                         10/s |                 50/s | At least 20 times daily average                            |
| New media             | 500 files / 1.25 GiB monthly |     2,500 / 6.25 GiB | 2.5 uploads per DAU/month × 2.5 MiB                        |
| Structured storage    |                        10 GB |               100 GB | Conservative allowance including indexes and audit history |

| ID     | Target, scope, and rationale                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-1  | Serve year one without separately provisioned database capacity, replicas, an application cache, or a separately operated API server.       |
| NFR-2  | Client list/detail p50 ≤800 ms, p95 ≤2.5 s, p99 ≤5 s; representative SQL p95 ≤250 ms.                                                       |
| NFR-3  | Non-media mutations p95 ≤3 s; compressed-image uploads expose progress, retry, and duplicate protection.                                    |
| NFR-4  | Target 99.0% monthly user-facing availability without a contractual SLA; maintenance communication is acceptable.                           |
| NFR-5  | Database and media RPO ≤24 hours and RTO ≤8 hours using managed backups and independent copies.                                             |
| NFR-6  | Retain seven daily database restore points and 30 days of encrypted logical exports; restore twice yearly.                                  |
| NFR-7  | Deploy in a U.S. region and keep production data in approved U.S. resources.                                                                |
| NFR-8  | Support maintained iOS and Android versions. Expo web is development-only.                                                                  |
| NFR-9  | Apply WCAG 2.2 AA principles and native guidance to VoiceOver/TalkBack, text scaling, contrast, reduced motion, and touch targets.          |
| NFR-10 | Use standards-based auth, PostgreSQL RLS, least-privilege grants, TLS, managed encryption, audit events, and secret isolation.              |
| NFR-11 | Exclude credentials, SAML assertions, OAuth tokens, Stripe secrets, ballots, moderation details, and precise locations from logs/analytics. |
| NFR-12 | Rate-limit anonymous and mutation workflows; validate images/payloads; bound query size and job concurrency.                                |
| NFR-13 | Alert on errors, slow queries, failed jobs, backup/export age, usage thresholds, and spend.                                                 |
| NFR-14 | Product analytics may be daily and exclude sensitive content and identity.                                                                  |
| NFR-15 | Hard production ceiling: USD 150/month before Stripe and labor. Preferred year-one total: USD 50/month or less.                             |

## 3. Design

### 3.1 Design Summary and Principles

#### Current state

**Retain Firebase Blaze for the existing app.** The 600 MAU figure is a year-one assumption, not measured current usage. The original comparison itself estimated Firebase below Supabase, and no bill or measured bottleneck establishes savings from switching.

The projected 30,000 logical reads and 600 mutations per day are below Firestore's 50,000 reads and 20,000 writes daily free quotas if they map one-to-one to billed operations. Listeners, reconnects, rule-dependent reads, indexes, scheduled jobs, and multiple writes per mutation can increase that count. Database storage beyond 1 GiB and backups are separately billed. ([Firestore billing](https://firebase.google.com/docs/firestore/pricing))

SAML does not favor either platform on price at this scale: both include 50 SAML MAU and charge $0.015 thereafter, or $8.25 for 600 SAML MAU. Password users do not all become billable SAML users. ([Google Identity Platform](https://cloud.google.com/identity-platform/pricing), [Supabase SAML](https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml))

Media delivery is the largest unmeasured cost variable. New uploads of 1.25 GiB/month imply approximately 15 GiB accumulated after one year from an empty bucket; they say nothing about download volume. The 100 GB media/100 GB egress figures below are separate stress assumptions. Firebase's legacy and newer buckets have different free transfer allowances and pricing; use the actual bucket type, region, and download destinations. ([Firebase Storage pricing](https://firebase.google.com/pricing))

First collect 30 days of service-level costs and usage, including backups, email, scheduled work, and hosted auth flows. The repo already has a [billing export reader](functions/src/billing.ts). Inspect unbounded collection reads in [FirebaseDocumentStore](adapters/firebase/FirebaseDocumentStore.ts) before attributing read costs to the provider. If media dominates, evaluate a bounded media change independently of a database rewrite.

#### Preferred greenfield target

Use Supabase Pro as a relational backend-as-a-service. The platform provides a full PostgreSQL database with RLS and PostGIS extensions, rather than a proprietary relational abstraction. ([database documentation](https://supabase.com/docs/guides/database/overview))

- PostgreSQL/PostGIS is the transactional source of truth.
- Supabase Auth provides password and SAML identity.
- the Data API serves bounded CRUD through grants and RLS;
- SQL functions and Edge Functions own privileged, multi-entity, webhook, and provider workflows;
- Realtime publishes selected committed changes;
- Storage holds private media with signed/resumable uploads;
- Cron and PostgreSQL Queues run scheduled and retryable work;
- managed backups provide seven daily restore points ([backup documentation](https://supabase.com/docs/guides/platform/backups));
- nightly encrypted logical exports and media copies go to Cloudflare R2.

This preserves PostgreSQL joins, constraints, transactions, text search, and geospatial queries without an always-on RDS instance, NAT gateway, API Gateway, or separate identity/queue stack.

#### Migration-aware recommendation

Start a migration only after a catalog/query prototype demonstrates a material correctness or maintenance benefit, or measured recurring savings justify the migration and operating cost. If that gate passes, migrate by domain. Supabase supports Firebase Auth JWTs ([third-party authentication documentation](https://supabase.com/docs/guides/auth/third-party/overview)), so identity can stay on Firebase during a relational pilot. Budget both providers during overlap. Every domain has one authoritative writer.

#### Market comparison

Reviewed 2026-09-28. The earlier $5–25 Firebase and $35–50 Supabase totals were planning estimates, not measured bills or equivalent recovery configurations. They do not establish a cheapest provider. See the [alternative hosting review](docs/hosting-alternatives-review.md) for current sources and illustrative calculations.

| Candidate                               | Cost basis                                                                                                   | Fit and decision                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Firebase Blaze                          | Usage-based; no mandatory platform subscription; include SAML, storage, transfer, jobs, and recovery         | **Retain for the existing app.** Lowest implementation cost; measure before changing providers.                                            |
| Supabase Pro                            | $25 for Pro with one Micro covered by compute credit; $8.25 for 600 SAML MAU, plus recovery and any overages | **Preferred conditional relational target.** Integrated PostgreSQL/PostGIS, Auth, RLS, API, Storage, Realtime, and jobs.                   |
| Neon + Cloudflare + identity            | Database compute depends on active hours; API, objects, identity, and recovery must be added                 | Credible modular PostgreSQL option, but more integration and operational ownership for volunteers.                                         |
| Cloudflare Workers + D1 + R2 + identity | Low platform cost, plus auth and custom API/realtime work                                                    | D1's 10 GB per-database limit already meets the year-one storage allowance and requires partitioning for the three-year model; no PostGIS. |

Appwrite, Railway, Turso, a VPS, and the previously proposed AWS stack have no demonstrated total-cost advantage that justifies replacing this working implementation. Revisit them only with a concrete unmet requirement and an equivalent service/recovery estimate; their former broad price ranges were insufficient evidence to rank them.

Official sources: [Supabase](https://supabase.com/pricing), [Firebase](https://firebase.google.com/pricing), [Neon](https://neon.com/pricing), [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), and [R2](https://developers.cloudflare.com/r2/pricing/).

### 3.2 Architecture Diagram

```mermaid
flowchart LR
    subgraph Clients[Production clients]
        APP[Expo iOS / Android]
        LOCAL[(SQLite drafts/cache)]
    end
    subgraph SB[Supabase Pro - U.S.]
        AUTH[Auth + SAML]
        DATA[Data API + SQL RPC]
        RT[Realtime]
        EDGE[Edge Functions]
        CRON[Cron]
        Q[Postgres Queues]
        PG[(PostgreSQL + PostGIS + RLS)]
        STORE[(Private Storage)]
    end
    R2[(Cloudflare R2 recovery copy)]
    STRIPE[Stripe]
    IMPORTS[iNaturalist + College Scorecard]
    COMMS[Expo Push + SES]
    MAPS[Native maps]

    APP <--> LOCAL
    APP --> AUTH
    APP --> DATA --> PG
    APP --> RT --> PG
    APP -->|signed/resumable upload| STORE
    EDGE --> PG
    EDGE --> STORE
    CRON --> Q --> EDGE
    EDGE --> STRIPE
    EDGE --> IMPORTS
    EDGE --> COMMS
    APP --> MAPS
    PG -->|encrypted export| R2
    STORE -->|object copy| R2
```

The diagram describes the conditional Supabase backend. Hosted SAML/OAuth and public-page dependencies still require an explicit hosting decision. No custom API server, NAT gateway, Redis, OpenSearch, Kubernetes, read replica, or multi-region deployment is selected.

### 3.3 End-to-End Request and Data Flows

#### Authentication and tenant context

1. Supabase Auth authenticates password or SAML users. During migration, Supabase accepts Firebase Auth JWTs through its supported third-party integration.
2. PostgreSQL maps the immutable subject to users and club memberships.
3. Grants and RLS restrict every query by membership, state, role, and club.
4. High-risk actions use a narrow SQL RPC or Edge Function that rechecks actor and target transactionally.

#### Catalog read

1. The app requests a bounded page from the Data API or stable SQL function.
2. PostgreSQL joins entries, cats, tags, favorites, and newest linked sighting.
3. B-tree indexes serve tenant/status/name ordering, GIN serves text search, and join indexes serve tags.
4. Keyset pagination avoids offsets; signed media URLs avoid public objects.
5. The app stores a bounded read cache for degraded/offline viewing.

#### Sighting and media

1. The app stores a local draft and requests an authorized upload.
2. It uploads compressed media directly to private Storage with progress/retry.
3. One RPC transaction creates the sighting, links, media metadata, audit event, and queue work using an idempotency key.
4. The draft clears only after receiving the committed server identifier.
5. A queue worker copies each committed object to R2; nightly reconciliation removes abandoned uploads and checks the primary/recovery manifests.

#### Privileged and asynchronous work

Roles, bans, succession, surveys, and voting run in transactions with locks and database constraints. Chat commits before Realtime publication. Queue consumers call Expo Push, SES, Stripe, and import providers with bounded retry. Stripe webhooks verify signatures and claim unique provider event IDs.

### 3.4 Component Decisions

| Component      | Current                                    | Target                                                       | Why                                                        | Alternative/trigger                                         |
| -------------- | ------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------- |
| Mobile         | Expo + Firebase adapters                   | Expo + Supabase adapters + SQLite drafts/cache               | Preserves UI and intermittent field work                   | Platform-specific apps only after material divergence       |
| Data boundary  | Firestore + callable Functions             | Data API for CRUD; RPC/Edge Functions for privilege          | No always-on API bill; server-enforced contracts           | Dedicated API for external clients/complex orchestration    |
| Store          | Firestore                                  | Supabase PostgreSQL/PostGIS, FKs, constraints, RLS           | Relational/geospatial fit inside bundled low-cost platform | Neon if Supabase limits/regions fail                        |
| Identity       | Firebase Auth                              | Supabase Auth greenfield; trust Firebase during migration    | Integrated SAML; avoids immediate identity migration       | Keep Firebase Auth if moving it has no benefit              |
| Media          | Firebase Storage                           | Supabase Storage, private immutable keys, signed/TUS uploads | 100 GB storage and 250 GB egress included                  | Move primary media to R2 when overage >$10/month            |
| Realtime       | Firestore listeners                        | Realtime only for chat/high-value status                     | Included quota; SQL remains durable truth                  | Poll when freshness is not worth complexity                 |
| Offline        | JS SDK; durable data cache not established | SQLite drafts, pending work, bounded cache                   | Covers interruption without general conflict engine        | Expand only from observed failures                          |
| Jobs           | Functions/work records                     | Queues + Cron-triggered Edge Functions                       | Included, durable, replayable                              | External queue after platform limits                        |
| Search         | Firestore/local filters                    | PostgreSQL GIN/trigram and tag joins                         | No search service bill/sync                                | Dedicated search above 100k rows/tenant or failed relevance |
| Recovery       | Provider durability                        | Seven daily backups + incremental encrypted R2 copies        | Avoids $100/month PITR while limiting provider loss        | PITR only with funded sub-day RPO                           |
| Communications | SendGrid + Expo                            | SES + Expo Push                                              | Near-zero use cost, no NAT                                 | Keep SendGrid for proven reputation/tooling                 |

### 3.5 Data Placement and Lifecycle

| Data                    | Access/integrity                  | Selected source                               | Lifecycle/recovery                             |
| ----------------------- | --------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| Credentials/sessions    | Sign-in/revoke/SAML               | Supabase Auth; Firebase during transition     | Revoke then delete per policy                  |
| Clubs/memberships/roles | Tenant joins and unique state     | PostgreSQL, FKs, partial uniqueness, RLS      | Daily backup/export; pseudonymize by policy    |
| Catalog/tags/favorites  | Read-heavy changing joins/search  | PostgreSQL B-tree/GIN and unique join indexes | Daily backup/export and explicit cascades      |
| Sightings/locations     | Time/geospatial history           | PostgreSQL/PostGIS and GiST                   | Location retention TBD; reconcile media        |
| Stations/comments       | Current state plus history        | PostgreSQL tenant/time indexes                | Retain by club policy                          |
| Community/voting/chat   | Phases, unique receipts, realtime | PostgreSQL normalized rows plus bounded JSONB | Published votes immutable; retention TBD       |
| Moderation/audit        | Restricted and append-only        | Private schema/views and narrow RPCs          | Approved retention only                        |
| Media metadata          | Ownership/state/key               | PostgreSQL media_assets                       | Backup and presence reconciliation             |
| Media objects           | Byte-heavy direct transfer        | Supabase Storage; R2 recovery copy            | Immutable keys, pending TTL, deletion manifest |
| Imports/billing/jobs    | Provider IDs, idempotency, retry  | PostgreSQL + Queues                           | Rebuild imports; retain finance records        |
| Device drafts/cache     | Local pending/read-only state     | Expo SQLite                                   | Purge after commit/logout/TTL                  |

### 3.6 Scaling, Reliability, and Failure Behavior

Year-one average load is about 0.35 reads/s and 0.007 writes/s. Likely bottlenecks are unindexed RLS, N+1 client calls, unbounded histories, large images, and excessive subscriptions—not database capacity. Use keyset pagination, selected columns, indexed policy predicates, compressed media, bounded topics, and idempotency.

| Failure                   | Detection                 | Impact              | Mitigation                                                        |
| ------------------------- | ------------------------- | ------------------- | ----------------------------------------------------------------- |
| Supabase outage           | Synthetic auth/read/write | Core unavailable    | Preserve drafts, retry safely, communicate, verify after recovery |
| Slow SQL/RLS              | Query/client p95          | Slow lists/timeouts | EXPLAIN, indexes, bounds, eliminate N+1                           |
| Upload interruption       | Client/pending age        | Draft not published | Resume/retry; expire orphans                                      |
| Function/provider failure | Error and queue age       | Side effect delayed | Durable queue, idempotency, backoff, replay                       |
| Realtime outage           | Channel/reconnect errors  | Live updates stale  | Reload/poll durable SQL history                                   |
| Database/object loss      | Counts/manifests          | Missing content     | Restore daily backup/R2 copy and validate                         |
| Usage spike               | Quota/spend alerts        | Throttle or bill    | Tenant limits, compression, disable nonessential live topics      |

### 3.7 Security and Privacy

- Enable RLS on every exposed table, revoke default grants, and define policies per operation.
- Keep service-role credentials only in Edge Function secrets; clients receive publishable keys and JWTs.
- Include club identity in tenant foreign keys to block cross-club references.
- Use reviewed security-definer functions with a safe search path for privileged transactions.
- Keep buckets private; validate upload ownership, size, MIME type, and immutable path.
- Encrypt OAuth/provider tokens and audit role, ban, succession, onboarding, billing, and destructive actions.
- Exclude exact locations, messages, ballots, emails, and moderation reasons from analytics/logs.

### 3.8 Observability and Analytics

Track operation, club surrogate, actor role, result, error class, correlation ID, duration, query/function, queue message, retry, and provider—never content or secrets.

| Signal               | Alert                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| Synthetic read/write | Three failures in five minutes or availability <99.0%                 |
| Client/API           | p95 above targets for 15 minutes or error ratio >2%                   |
| PostgreSQL           | Slow-query/RLS regression, connection pressure, storage >70% included |
| Realtime/functions   | Usage >70% included or failures >2%                                   |
| Jobs                 | Oldest work >10 minutes or two missed schedules                       |
| Recovery             | Export/object manifest older than 30 hours                            |
| Cost                 | Forecast at $25, $40, $50, and 80% of hard ceiling                    |

Do not add a paid warehouse or analytics platform at launch.

### 3.9 Decision Summary and Evolution Path

For the existing app, retain Firebase and measure/optimize its cost first. This table applies only if the relational migration gate in section 3.1 passes.

| Decision | Initial                                         | Revisit                                                   |
| -------- | ----------------------------------------------- | --------------------------------------------------------- |
| Platform | Supabase Pro                                    | Limitation, support/region failure, or base forecast >$75 |
| Database | PostgreSQL/PostGIS                              | Remains portable via SQL migrations/exports               |
| Access   | Data API/RLS + RPC/Functions                    | Dedicated API for public versioning/orchestration         |
| Media    | Supabase Storage + R2 copy                      | R2 primary when overage >$10/month                        |
| Identity | Supabase greenfield; Firebase during transition | Keep Firebase if migration has no benefit                 |
| Realtime | Selected topics                                 | Poll if complexity/usage outweighs freshness              |
| Async    | Queues + Cron/Functions                         | External queue after duration/concurrency limits          |
| Recovery | Daily backup + nightly copy                     | PITR only with funded sub-day RPO                         |
| Budget   | Prefer ≤$50; hard ceiling $150                  | Funding decision before a step change                     |

## 4. Implementation Breakdown

### 4.1 Delivery Sequence

1. Measure Firebase reads, listeners, storage, transfer, SAML MAU, recovery, jobs, and cost; optimize expensive paths and demonstrate a reason to migrate.
2. Only after that decision, create Supabase staging, SQL migrations, RLS/grant tests, local stack, alerts, and R2 recovery.
3. Configure Firebase JWT trust and prove cross-tenant denial.
4. Pilot catalog/tags/favorites/linked sightings for one test club and compare query plans/results.
5. Backfill, shadow-read, freeze briefly, checksum, and switch one domain with one writer.
6. Migrate field, identity/roles, and community domains through the same bounded cutover.
7. Move integrations to Queues, Cron, and Edge Functions; prove retry/replay.
8. Move media after metadata ownership is stable; enable R2 copying.
9. Decide independently whether Auth migration earns its cost.
10. Decommission Firebase domains only after rollback/recovery expiry.

### 4.2 Component Implementation

Prices are USD/month. Core Supabase pricing was rechecked 2026-09-28; ancillary-service allowances remain estimates. These components apply to the conditional Supabase target.

| Component             | Product                                  | Build/test                                                          |                                                                                                                              Base |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------: |
| Mobile                | Expo/React Native + SQLite               | Supabase adapters, drafts/cache, interruption/accessibility tests   |                                                                                                                 $0 plus store/EAS |
| Platform              | Supabase Pro U.S.                        | Production project, quotas, migrations                              |                                                                                  $25–30 ([pricing](https://supabase.com/pricing)) |
| SSO                   | Supabase Auth                            | 50 included, then $0.015; 600 ≈ $8.25                               |                                             $8.25 ([pricing](https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml)) |
| Database/API          | PostgreSQL/PostGIS + Data API/RPC        | Schema, grants, RLS, indexes, plans, races                          |                                                                                                             About $0.25 over 8 GB |
| Compute/realtime/jobs | Edge Functions, Realtime, Queues, Cron   | Signatures, timeouts, duplicates, replay                            |                                                                                                                  Included at base |
| Primary media         | Supabase Storage                         | Private TUS uploads, signatures, orphans                            |                                                                                             Included through 100 GB/250 GB egress |
| Recovery              | Cloudflare R2                            | Nightly encrypted SQL exports, incremental object copy, and restore | $1.35 for 100 GB objects alone; add retained exports and source egress ([pricing](https://developers.cloudflare.com/r2/pricing/)) |
| Email/push            | SES + Expo Push                          | Sender, templates, receipts, invalid tokens                         |                                                                                                                               <$1 |
| Maps                  | Native Google/Apple SDK                  | Restricted keys and device tests                                    |                                                                                                                                $0 |
| Monitoring            | Supabase plus synthetic/client free tier | Alerts, privacy, budget                                             |                                                                                                                              $0–5 |
| Billing               | Stripe                                   | Hosted UI, signed webhook, reconciliation                           |                                                                                                                     Variable fees |

### 4.3 API, Schema, and Job Boundaries

Generated APIs handle selected, bounded CRUD. Stable SQL functions expose create_sighting_with_media, submit_survey_response, submit_ballot, transfer_presidency, moderate_member, and claim_setup_request.

Schema groups cover tenancy, catalog/field work, community/voting, and operations/integrations. Every tenant table includes club_id; tenant-aware foreign keys prevent cross-club links.

```sql
CREATE INDEX catalog_active_name
  ON catalog_entries (club_id, status, lower(display_name), id);
CREATE INDEX catalog_search
  ON catalog_entries USING GIN (search_vector);
CREATE UNIQUE INDEX catalog_tag_unique
  ON catalog_entry_tags (club_id, catalog_entry_id, tag_id);
CREATE INDEX sightings_by_cat_recent
  ON sightings (club_id, cat_id, observed_at DESC, id);
CREATE INDEX sightings_location
  ON sightings USING GIST (location);
```

Every job has a stable idempotency key and is archived/deleted only after its external result and local projection commit safely.

### 4.4 Infrastructure, Environments, and Delivery

- Local uses Supabase CLI containers, provider adapters, Expo devices/emulators, and SQLite.
- CI runs code checks, migrations, RLS/grant tests, RPC races, provider contracts, and Firebase emulator tests during migration.
- Development may use a pausable Free project in a separate Free organization, but it cannot validate SAML. A second Micro project in the Pro organization adds approximately $10/month. Use local development plus temporary paid SAML validation, or fund persistent staging. ([Billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [SAML](https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml))
- Infrastructure is versioned SQL, Supabase configuration, Edge Functions, secrets manifests, R2 policy, provider manifests, and alerts.
- Deploy expand-compatible schema before functions/client; contract only after rollback expiry.
- Restore drills use a temporary project and synthetic validation accounts.

### 4.5 Cost Model

The repository contains no approved dollar budget. This design treats the prior USD 150 assumption as a hard ceiling and adds a preferred USD 50 target because the operator is volunteer-run.

| Cost                                        | Year-one calculation or condition                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Supabase Pro with one Micro                 | $25; use $30 with Small compute                                                                         |
| SAML SSO                                    | max(0, SAML MAU − 50) × $0.015; $8.25 if all 600 MAU use SAML                                           |
| Provisioned database disk                   | (10 GB − 8 GB) × $0.125 = $0.25; include operating headroom when sizing                                 |
| **Core subtotal**                           | **$33.50 with Micro and 600 SAML MAU**                                                                  |
| Primary media                               | Included while stored objects and service egress remain within allowances                               |
| Independent recovery                        | Retained object copies **plus 30 database exports**, R2 operations, export runner, and source transfer  |
| Functions/Realtime                          | Included only while measured invocations/messages/connections fit quotas                                |
| Email, hosted public/auth flows, monitoring | Price actual providers and usage; not established by this review                                        |
| **Production allowance**                    | **$35–50 remains plausible with small recovery/transfer costs; it is not a validated total or ceiling** |
| Persistent staging                          | Approximately $10 more for another Micro, plus usage; local/separate Free development has limitations   |

For the original 100 GB object-copy scenario, R2 storage alone is (100 − 10) × $0.015 = $1.35. Thirty retained 10 GB export files add 300 GB and raise that storage subtotal to $5.85. Actual logical dumps may be much smaller than provisioned disk. Separately, 400 GB/month of uncached source transfer would cost (400 − 250) × $0.09 = $13.50. Compressed archive size does not determine transfer from PostgreSQL because compression on the export runner happens after retrieval. Measure archive bytes and network bytes independently. ([R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Supabase egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress))

The previous $153–311 three-year total is withdrawn: user count alone does not establish the assumed compute, media-transfer, realtime, and monitoring increases. At 3,000 SAML MAU and 100 GB disk, the base plan/SAML/disk subtotal would be $80.75 before compute upgrades, recovery, and other services. Rebuild that forecast from measured usage; a $150 ceiling is not guaranteed.

Stripe, stores/EAS, taxes, labor, and optional PITR are excluded. Compare Firebase and Supabase using equivalent backup retention, hosted flows, and environments before claiming savings.

Guardrails:

- do not enable approximately $100/month PITR under a 24-hour RPO;
- do not add custom domain, replica, larger compute, paid APM, or transformations without evidence;
- alert before included quotas are crossed;
- move primary media to R2 before overage exceeds $10/month;
- require funding review before $50 and architecture review before $100.

Budget alerts do not enforce a universal $150 stop. Supabase's Spend Cap excludes compute and several add-ons. Firebase's service spend caps cover selected services, not the entire Firestore/Storage bill. Bound application usage and document which features can be suspended. ([Supabase cost control](https://supabase.com/docs/guides/platform/cost-control), [Firebase budgets](https://firebase.google.com/docs/projects/billing/avoid-surprise-bills))

#### One-time migration cost

The previous 8–16 engineer-week figure is an unvalidated planning allowance for schema/RLS, adapters, backfill, cutovers, recovery, and hardening. Estimate it from a pilot. For a cost-driven migration, payback months = migration cost / (current monthly total − replacement monthly total), including provider overlap and ongoing maintenance. If the denominator is zero or negative, hosting savings cannot repay the migration. A relational migration can still be justified by demonstrated product or maintenance benefits.

### 4.6 Verification and Acceptance

| Area              | Evidence                                                               |
| ----------------- | ---------------------------------------------------------------------- |
| Market/cost       | Measured usage mapped to quotas; prices rechecked; alerts demonstrated |
| Catalog           | Query plans, no N+1, keyset pagination, SQL p95 ≤250 ms                |
| Integrity         | FK, uniqueness, races, idempotency, cross-tenant denial                |
| Mobile            | Draft persistence, upload resume, restart retry, duplicate prevention  |
| Media/recovery    | Signed access, validation, cleanup, R2 checksum, full restore          |
| Community/billing | Concurrent receipts/roles; duplicate Stripe; queue replay              |
| Security          | Threat model, RLS/grants, function review, secrets, rate limits        |
| Accessibility     | Physical iOS/Android assistive-technology tests                        |
| Migration         | Counts/checksums, shadow equivalence, writer ownership, rollback       |

## 5. Risks, Open Questions, and Assumptions

### Open questions

| Question                                                       | Impact                        | Validation                      |
| -------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| Is $150 approved, and is $50 the right preferred target?       | Could change tier/recovery    | Club approval before commitment |
| What are observed Firebase usage and cost?                     | Validates migration economics | Instrument before pilot         |
| Which joins, filters, spatial queries, and reports are needed? | Validates SQL advantage       | Inventory before schema freeze  |
| Is a 24-hour RPO acceptable?                                   | PITR adds about $100/month    | Club decision                   |
| How often are users offline for more than a minute?            | Determines local sync scope   | Field measurement               |
| What are retention/deletion rules?                             | Affects schema/backups/cost   | Approve before broad onboarding |

### Material risks

| Risk                                   | Impact                  | Mitigation                                        |
| -------------------------------------- | ----------------------- | ------------------------------------------------- |
| Supabase becomes another default       | Wrong target            | Re-price finalists and prototype catalog/RLS      |
| Data API/RLS leak                      | Cross-tenant disclosure | Revoke grants, tests, tenant FKs, narrow RPCs     |
| Storage objects absent from DB backups | Image loss              | R2 copy, manifests, restore drill                 |
| Limited offline behavior               | Failed sightings        | SQLite drafts/outbox and resumable upload         |
| Permanent dual truth                   | Divergence              | One writer/domain and bounded cutover             |
| No contractual SLA/PITR                | Longer outage/data loss | Explicit SLO and independent exports              |
| Usage crosses quotas                   | Unexpected bill         | Compression, bounded realtime, alerts, R2 trigger |
| Platform lock-in                       | Hard migration          | Standard PostgreSQL, SQL exports, provider ports  |
| Volunteer SQL/RLS ownership            | Security mistakes       | Templates, tests, runbooks, narrow surface        |

### Assumptions

| Assumption                                      | Impact                              | Revisit                      |
| ----------------------------------------------- | ----------------------------------- | ---------------------------- |
| 10 clubs, 2,000 users, 600 MAU                  | Usage/SSO cost                      | Monthly metrics              |
| $150 is a ceiling, not a target                 | Rejects AWS fixed cost              | Budget approval              |
| Year one should be ≤$50                         | Selects bundled BaaS/daily recovery | Funding or stricter RPO      |
| Relational needs may grow                       | Could justify Supabase later        | Catalog prototype            |
| 99.0% and 24-hour RPO suffice                   | Avoids paid HA/PITR                 | Outage or requirement change |
| One to three volunteers prefer managed services | Rejects VPS/assembled stack         | Funded ownership             |
| Compressed image ≤2.5 MiB                       | Storage/egress estimate             | First 500 uploads            |
