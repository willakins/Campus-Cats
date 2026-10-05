# Supabase Free relational core with retained Firebase infrastructure

| Field                   | Decision                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Status                  | Architecture direction accepted; implementation and production cutover pending                                             |
| Date                    | October 2, 2026                                                                                                            |
| PostgreSQL host         | Supabase Free; no paid upgrade assumed                                                                                     |
| Retained infrastructure | Firebase Auth, Firestore operational records and chat, Cloud Storage, Cloud Functions, Hosting, and existing integrations  |
| Evidence                | Production Firestore data and indexes: 91,192,985 bytes, approximately 91.2 MB                                             |
| Capacity decision       | Confirm PostgreSQL tables, indexes, and system overhead after import; recent low activity is not a future traffic forecast |

This decision refines the earlier conditional relational proposal in
[system-design.md](system-design.md). It authorizes a plan for a Supabase relational
core without moving the rest of the platform. It does not provision infrastructure
or execute a migration. Measurement details are in
[database-capacity-assessment.md](../database-capacity-assessment.md).

## 1. Where data lives

| Data                                                                                                 | Authoritative storage after its cutover                    | Structure and responsibilities                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local sightings                                                                                      | Supabase PostgreSQL                                        | Sightings, cat links, private contributors, and media references                                                                                                |
| Cat catalog                                                                                          | Supabase PostgreSQL                                        | Catalog entries, tags, tag assignments, favorites, and imported catalog metadata                                                                                |
| Public member profiles                                                                               | Supabase PostgreSQL                                        | Display name, bio, photo reference, selected title, and achievements; no login credentials                                                                      |
| Feeding stations                                                                                     | Supabase PostgreSQL                                        | Locations, stock information, optional structured cat links, and media references                                                                               |
| Comments on sightings, cats, and stations                                                            | Supabase PostgreSQL                                        | Related comments, local authors or external attribution, and moderation state                                                                                   |
| Alerts and events                                                                                    | Supabase PostgreSQL                                        | Content, date/audience fields, attachments, and per-member read receipts                                                                                        |
| Surveys                                                                                              | Supabase PostgreSQL                                        | Surveys, questions, options, responses, answers, and private submission receipts                                                                                |
| Contests and elections                                                                               | Supabase PostgreSQL                                        | Votes, choices, nominees, ballots, nomination receipts, and private ballot receipts                                                                             |
| Visible iNaturalist content                                                                          | Supabase PostgreSQL                                        | Imported observations/catalog records, source attribution, visibility, local overrides, and source identity mapping                                             |
| Login accounts, password/SAML login, consent, account bans, roles, and membership administration     | Existing Firebase Auth and Firestore                       | Keep current identity and administration workflows authoritative; PostgreSQL receives the minimal club/member projections required for relationships and access |
| Chat messages, reactions, restrictions, and ping read state                                          | Existing Firestore                                         | Retain current chat gateway and realtime subscriptions                                                                                                          |
| Uploaded photos and attachments                                                                      | Existing Firebase Cloud Storage                            | Keep objects, paths, upload validation, and delivery; PostgreSQL stores references, not image bytes                                                             |
| Club provisioning, university directory, invitations, whitelist applications, and contacts           | Existing Firestore                                         | Retain current onboarding and administrative workflows                                                                                                          |
| App branding, contributor-privacy configuration, and donation page content/link                      | Existing Firestore                                         | Keep current settings module; synchronize the minimal privacy policy needed by PostgreSQL                                                                       |
| Subscription, invoice, usage-metering, and Stripe webhook records                                    | Existing Firestore and Stripe                              | Keep existing billing system; adapt its inputs for PostgreSQL mutations                                                                                         |
| Integration secrets, OAuth credentials, import scheduling/checkpoints, notifications, and email jobs | Existing Firebase Functions, Secret Manager, and Firestore | Execution stays in Firebase; importers write migrated content to PostgreSQL                                                                                     |

Donation content is currently an external link and optional photo. There is no
in-app donation ledger to migrate. Actual donation transactions, if introduced
later, should have a separate transactional design.

The rule is one authoritative writer per dataset. Retained Firestore projections
are narrow compatibility records, not a second editable copy of migrated content.

## 2. Relational model

Use one production Supabase project for all clubs. Every tenant-owned row includes
`club_id`. Keep existing club IDs and Firebase user IDs as text. Preserve existing
content IDs where possible; use an explicit source-to-target map for imported IDs
and legacy collisions. Firebase UIDs are not necessarily UUIDs and should not
reference Supabase's `auth.users` table.

Use `(club_id, id)` primary/unique keys for content and tenant-aware foreign keys
such as `(club_id, catalog_id)`. A row belonging to club A must not reference a cat,
member, station, survey, or vote from club B. Use `timestamptz` for instants and
retain date-only/precision fields for imported observations. Use SQL checks for
bounded text, valid states, coordinates, and time ordering.

| Table group         | Proposed tables                                                                                                             | Main constraints and relationships                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity references | `clubs`, `member_accounts`, `club_memberships`                                                                              | Minimal server-managed projections of Firebase identities, roles, restrictions, and club entitlement/privacy state; no passwords, refresh tokens, or billing secrets |
| Public profiles     | `profiles`, `profile_achievements`                                                                                          | Profile keyed by club and UID; unique unlocked achievement per profile; selected title must be unlocked                                                              |
| Catalog             | `catalog_entries`, `catalog_tags`, `catalog_entry_tags`, `catalog_favorites`                                                | Unique tag label per club; unique cat/tag pair; one favorite per member per club, matching the current product                                                       |
| Sightings           | `sightings`, private `sighting_contributors` and `catalog_contributors`                                                     | Nullable catalog link for unidentified cats; separate private contributor ownership from public content                                                              |
| Stations            | `stations`, `station_catalog_entries`                                                                                       | Preserve current free-text known-cats field; add explicit links only where a match is unambiguous                                                                    |
| Comments            | `comments`                                                                                                                  | Exactly one sighting/catalog/station target, backed by actual tenant-aware foreign keys; external source attribution remains distinct from member authors            |
| Media               | `media_assets` and entity-specific attachment links                                                                         | Bucket/object path or external URL, display role, ordering, thumbnail, and license/attribution; enforce real parent relationships                                    |
| Community           | `alerts`, `alert_reads`, `events`, `event_reads`                                                                            | Unique member/content receipt; validity and time fields available for database queries                                                                               |
| Surveys             | `surveys`, `survey_questions`, `survey_options`, `survey_responses`, `survey_answers`, private `survey_submission_receipts` | Immutable published questions; unique question position; one submission receipt per member/survey; choices belong to the answered question                           |
| Voting              | `votes`, `vote_options`, `vote_nominees`, `ballots`, private `ballot_receipts`, private `nomination_receipts`               | Unique candidate/nomination; one ballot receipt per member/vote; phase, eligibility, and selected-option checks enforced within a transaction                        |
| External content    | Imported metadata tables, `import_links`, and `external_member_links`                                                       | Unique external source ID within its club and record type; keep original facts, attribution, local overrides, visibility, and sync version distinct                  |
| Operations          | Private `outbox_events`, `processed_operations`, and migration mappings                                                     | Stable idempotency keys, delivery/retry state, source versions, and resumable migration checkpoints                                                                  |

An imported guide profile is not automatically an identified individual cat.
Preserve the current local/imported distinction, guide taxon IDs, and explicit
links. A catalog list can combine them through a query without collapsing their
meaning. Existing local sightings are matched to catalog entries by name in the
client; migrate only unique matches to stable catalog IDs. Keep the original
reported name and leave ambiguous matches unlinked for review.

Use ordinary columns and relational tables for anything joined, filtered, ordered,
or counted. JSONB is appropriate for bounded, infrequently queried imported extras,
local override payloads, and flexible answer payloads. Do not store entire clubs,
all sightings, all responses, or all ballots in JSON arrays.

### Initial indexes and read interfaces

Start with indexes justified by existing screens:

- Sightings: `(club_id, observed_at DESC, id)`,
  `(club_id, catalog_id, observed_at DESC, id)`, and a private contributor index on
  `(club_id, user_uid, sighting_id)`.
- Catalog: `(club_id, lower(name), id)`, reverse tag assignments, and favorite
  indexes for each member's selection and each cat's count.
- Comments: club, target ID, creation time, and ID for each target type.
- Alerts/events: club plus creation/start/expiry ordering; member read-receipt keys.
- Surveys/votes: club plus open/phase/date ordering; receipt uniqueness keys;
  response/ballot indexes by parent entity.
- Imports: unique club/source/type/source-ID keys and visibility indexes where
  required by the actual list query.
- Map: enable PostGIS and index sighting/station geography using GiST. Keep
  latitude/longitude derivable for the current map interface and allow null imported
  locations. [PostGIS documentation](https://supabase.com/docs/guides/database/extensions/postgis)

Use bounded, purpose-built reads such as `listCatalogPage`, `listSightingsInBounds`,
`listCatSightings`, `getMemberProfile`, and `getCommunitySummary`. Catalog results
include computed counts/latest sighting and the caller's favorite without returning
the whole sighting history. Use stable cursor pagination. Begin with indexed SQL
aggregates; add persistent summary tables only if query plans justify them. Avoid
automatically indexing every JSONB field.

## 3. Access, Firebase identity, and privacy

Firebase remains the login provider. Configure Supabase's Firebase third-party
integration with the correct project ID; connect the Supabase client with an
`accessToken` callback returning the current Firebase ID token. Add the
`role: authenticated` custom claim through the Admin SDK while preserving existing
claims. This PostgreSQL role is distinct from the Member/Officer/President product
role. Refresh tokens after assigning the claim. Use JWT `sub` as the Firebase UID
text value rather than assuming `auth.uid()` returns a compatible UUID.
[Firebase integration](https://supabase.com/docs/guides/auth/third-party/firebase-auth)

Enable row-level security on exposed tables, with explicit grants. Deny anonymous
access to club content. Keep contributor mappings, ballot/response identity
receipts, migration state, and outbox internals in an unexposed private schema.
Public read interfaces omit sensitive columns rather than trusting the UI to hide
them. Security-definer helpers must have a fixed search path, narrow privileges,
and caller identity checks; read views must not unintentionally bypass RLS.
[RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

Preserve the behavior in [behavior-matrix.md](behavior-matrix.md):

- Members maintain only their own sightings; officer status does not implicitly
  permit editing every sighting.
- Anonymous contributor identities remain hidden from ordinary members; return
  permission booleans such as `can_edit` without returning the author's UID.
- Anonymous survey answers and ballots do not include member identities. Receipts
  enforce uniqueness but are not exposed to officer results or joined into exported
  answers. Self-participation queries return status rather than private linkage.
- Survey submission and ballot casting validate audience and server-time phase and
  create content plus receipt atomically.
- Hidden imported records, moderation, role changes, and presidential succession
  retain their existing policy. Ballot storage moving does not move succession out
  of its Firebase administration workflow.
- Banned users and suspended clubs lose the same access they lose today. Data is
  retained on subscription suspension.

### Authorization across the two databases

PostgreSQL cannot evaluate a Firestore document in its RLS policy. Copying membership
once, or relying on stale JWT product roles, is insufficient.

**Initial safe rollout:** route migrated reads and writes through existing Firebase
Functions. Functions resolve the current member, club, restrictions, and entitlement
from Firebase on every request, then execute bounded PostgreSQL operations. Exposed
direct-client SQL access remains closed until the access bridge passes verification.
The Functions' database role is server-only, with scoped routines; server code must
still validate the actor and club rather than trust request parameters.

**Target read path:** allow ordinary member reads directly through Supabase's Data
API and RLS after implementing the access bridge. Keep privileged and transactional
writes in Firebase Functions. This avoids requiring a Functions hop for every page
in the final design.

The bridge must integrate every membership, role, account-ban, privacy, club-access,
onboarding, and deletion workflow that affects migrated data:

1. Apply restrictive changes to PostgreSQL before reporting completion of the
   corresponding Firebase operation. Grants become effective in PostgreSQL only
   after the Firebase grant succeeds. Mixed role changes use a deny-first pending
   state and finalize after both sides agree.
2. Record durable operation IDs and versions; retry partial work and reconcile
   missed/out-of-order events without allowing old events to restore access.
3. Update billing suspension and privacy-change handlers as well as member admin
   handlers. Treat console/out-of-band changes as controlled maintenance operations;
   trigger-based repair is a safety net, not an immediate-revocation guarantee.
4. Missing, pending, or invalid projection state denies access. Until every
   authoritative change path has been integrated and tested, retain the live-checked
   Functions gateway instead of enabling direct SQL reads.

Firestore users/clubs remain authoritative administration records. SQL membership
and club rows are projections, not a separate editable membership system. Firebase
Firestore and Storage rules continue using the retained Firebase administration
records. Chat author hydration reads the migrated profiles through a profile port;
it does not require a second editable profile in Firestore.

## 4. Server workflows that must change

Moving documents also moves the events that currently start background work.
Inventory all writers, readers, triggers, scheduled tasks, and deletion logic, not
just React screens. Specific existing dependencies include:

- `functions/src/index.ts`: Firestore activity metering, profile achievements,
  account deletion, contributor-privacy migration, access administration, and
  notifications.
- `functions/src/community/coreCallables.ts`: profile writes, survey submissions,
  and transactional ballot submission.
- iNaturalist catalog/import Functions: import reads/writes, public account links,
  comment synchronization, moderation, and catalog overrides.
- `composition/createAppModules.ts` and `adapters/firebase/createFirebaseBackend.ts`:
  one document store currently supplies most modules, including profiles needed by
  chat and comments.

PostgreSQL mutations create an outbox event in the same transaction. Existing
Firebase Functions process those events with retry/idempotency for push, email,
achievement updates, and Firestore billing usage records. An initial authenticated
call can attempt delivery immediately, with a Firebase scheduled recovery worker
for missed work. Jobs and credentials stay in Firebase. Do not depend on a client
calling a second endpoint after its write, and do not enable a permanent SQL-to-
Firestore content mirror just to preserve old triggers.

Preserve existing usage semantics and stable billing event identities. Migration,
reconciliation, and system-generated imports must not be charged as member activity
accidentally. Retained Storage metering continues independently.

No distributed transaction exists between PostgreSQL and Firebase. Media follows
the existing compensating workflow: upload/validate in Firebase first, commit SQL
references, remove abandoned uploads after failure, and delete obsolete objects
only after a successful commit. Account deletion likewise needs durable checkpoints
covering SQL anonymization/deletion, Firestore cleanup, Storage cleanup, and Auth.
Keep retention exceptions and ballot privacy consistent with current behavior.

## 5. Setup and implementation sequence

### Phase 1 — Local schema and source inventory

1. Add versioned SQL migrations, Supabase local configuration, seed fixtures, and
   database access tests in the repo. Develop with local Supabase/PostgreSQL plus
   existing Firebase emulators.
2. Produce a collection-by-collection source manifest. Production currently contains
   both legacy root records and club-scoped records; some root content exists where
   the corresponding tenant collection was not discovered. Do not assume the root
   is obsolete or silently merge duplicate business records.
3. Resolve root-to-club assignments from verified migration records and ownership;
   quarantine ambiguous records and conflicting IDs. Record the authoritative path
   for each source dataset, legacy alert/announcement relationships, and preserved
   media paths.
4. Define per-domain read/write ports and add PostgreSQL adapters. Retain the
   existing domain models/screens where they fit; replace the generic document
   interface for relational features rather than reimplementing whole-collection
   `list()` calls over SQL.

Deliverable: tested local schema, source manifest, query interfaces, migration
mapping, and environment-switch design. No production backfill yet.

### Phase 2 — Create the free project and configure access

1. Create one Supabase **Free** production project in a US region close to users and
   the Firebase Functions used by the app. Benchmark representative queries before
   fixing the region. Do not enable paid upgrades or optional paid add-ons.
2. Register the Firebase production third-party Auth integration; backfill the
   authenticated claim and arrange assignment for future accounts.
3. Store Supabase URL and publishable key in client configuration. Store database
   credentials/server secrets in Firebase Secret Manager, scoped to the Functions
   that need them. Privileged credentials never enter Expo public environment
   variables or the client bundle.
4. Apply schema, constraints, functions, explicit grants, and RLS. Enable PostGIS.
   Use the documented pooler/connection mode suitable for serverless Functions;
   avoid unbounded per-invocation database connection pools.
5. Use local databases for routine development. If hosted integration testing is
   required, use a separately configured Free development project within available
   free-project limits, with synthetic data and the development Firebase issuer.

Deliverable: free project, secure configuration, local/development integration,
and the initial live-checked Firebase gateway.

### Phase 3 — Backfill and validate

1. Obtain a recoverable source snapshot/export and a Storage object manifest. Keep
   private exports outside Git, and verify recovery before a cutover.
2. Run an explicitly selected-project, dry-run-capable migration with checkpoints,
   bounded batches, source update versions, and stable upsert keys. Migrate identity
   references first, followed by profiles/catalog/tags, sightings/imports/stations,
   comments/media links, and community records.
3. Preserve timestamps, authorship privacy, external licenses, overrides, and source
   IDs. Detect rather than guess cat-name links and station free-text matches.
4. Compare counts/checksums, links, representative screen outputs, private receipts,
   and media access against the source. Keep unsupported or ambiguous records in a
   migration exception report.
5. Measure actual PostgreSQL tables/indexes/system overhead using PostgreSQL size
   functions and the Supabase dashboard. Require total size comfortably below
   500 MB, not simply raw JSON below the limit. Compare query plans and representative
   device/API timings; storage fit alone does not guarantee performance.

Deliverable: reconciled backfill, size report, permission checks, and reviewed
exceptions. Firebase is still the authoritative writer until each domain switches.

### Phase 4 — Cut over in connected groups

Use feature/domain switches controlled by Firebase so old clients are handled
explicitly. Suggested sequence:

1. Catalog, tags, favorites, sightings, imported content, and profile reads.
2. Stations, comments, media metadata, and remaining profile edits/achievements.
3. Alerts/events and receipts, including notification outbox processing.
4. Surveys and voting, including private receipts and transactional submission.

For each group, pause its mutations/import jobs briefly or capture a durable change
stream; copy final inserts, updates, and deletes; validate again; then route all
readers/writers to PostgreSQL together. The importer, privileged callables,
background Functions, and older mobile clients must not continue writing the old
Firestore collections. Require a compatible app version or provide an explicit
transition gateway before denying legacy writes.

After a group's switch, deny direct Firestore writes to the retired collections and
retain the old data read-only for a defined rollback window. Keep one writer.
Rollback after new SQL writes requires pausing writes and replaying those changes
to the chosen source; switching a flag to an old snapshot would lose data. Preserve
IDs and enough operation history to perform that reconciliation.

Deliverable: migrated domains with one source of truth, retained Firebase
infrastructure, and a tested rollback procedure.

### Phase 5 — Enable direct reads and ongoing operations

1. Complete and test the access bridge before enabling direct Supabase reads.
2. Configure automated logical database dumps through an existing Firebase job or
   CI runner into private Cloud Storage, with documented retention and a restore
   drill. Supabase Free has no automatic backups. Storage object recovery remains a
   separate responsibility. Backup storage/runner usage can incur existing-provider
   charges even while Supabase database hosting is free.
   [Backup guidance](https://supabase.com/docs/guides/platform/backups)
3. Monitor actual database size, egress, connection usage, failures, and query times.
   Set an internal storage review threshold around 350 MB to leave growth/import
   headroom; it is an operating threshold, not a provider limit.
4. Account for Free project pausing after one week of inactivity. Document recovery
   and surface actionable service errors; do not assume continuous operation during
   long school breaks or promise that hosting remains free at any traffic level.
   [Free-plan limits](https://supabase.com/pricing)
5. Remove obsolete Firestore content only after validation, the rollback window,
   and verified recovery. Retain operational records and chat.

Deliverable: monitored free hosting, recoverable data, and completed retirement of
the old application collections.

## 6. Completion criteria

- PostgreSQL holds the migrated application records with tenant-aware foreign keys
  and indexed screen queries. Imported and local data preserve their distinct facts.
- The measured resulting database fits the free storage allowance with headroom;
  bandwidth and normal-use query performance are separately validated.
- Cross-club access, missing membership, restrictions, club suspension, contributor
  anonymity, and private participation are tested through actual access interfaces.
- Concurrent ballots/survey submissions, duplicate retries, deletion, import upserts,
  and outbox replay preserve existing behavior and produce no duplicate billing.
- Old clients and all backend jobs have a defined compatible path; no retired
  Firestore collection remains an active writer.
- Firebase login, chat, media, billing, settings, onboarding, and external integrations
  remain operational. Backups restore successfully and rollback does not discard
  SQL changes.

## 7. Recommended first implementation

Start with the local relational schema and catalog/sightings/profile query adapters,
plus the legacy-source manifest. This establishes the largest connected data group
and verifies the post-import storage footprint before any production switch. Project
creation, credentials, and claim updates belong to the setup phase; copying data
alone is not a completed migration.
