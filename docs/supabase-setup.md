# Supabase setup and migration handoff

For the consolidated data inventory, database choices, pricing, and cost comparisons, see [Data storage and costs](data-storage-and-costs.md).

The hosted Supabase schema and rehearsal import are complete in project `pxhopyutjuggdmzzpies`. On October 5, the replacement server key passed the full hosted API verification. Five migrations are applied, including catalog discovery, favorite transactions, and detail/media/favorite reads; the updated private backup restored successfully into an isolated local database. Production still uses Firebase; no Firebase documents have been changed and no app traffic has been redirected. This is a closed migration rehearsal, not the live database cutover.

## What is ready

- Versioned PostgreSQL schema for the relational domains in [the accepted plan](architecture/0004-supabase-relational-core.md): catalog, sightings, profiles, achievements, favorites, tags, stations, comments, alerts, events, surveys, voting, private identity receipts, media references, and an outbox.
- Tenant keys and foreign keys, query indexes, private contributor/receipt tables, and client access denied by default. Firebase UIDs remain text. Media parents, participation membership, selected titles, and election deadlines have database constraints.
- Bounded SQL reads for catalog pages, map bounds, cat sightings, member profiles, and community counts. Linked catalog entries retain the existing local-field precedence and list behavior. Map pagination handles tied dates and the antimeridian.
- A staged Firebase read handler that checks revoked tokens, live Auth account status, current terms, club membership, bans, maintenance, and billing deadlines before SQL. It is intentionally not registered in `functions/src/index.ts` or deployed yet; the catalog integration is staged behind an explicit backend option.
- A typed domain read port and Firebase callable adapter with bounded pages, validated responses, and cursors that preserve database timestamp precision. The summary adapter is tested but not selected in the app composition.
- Read-only Firestore export, explicit source selection, offline SQL preparation, atomic schema application with migration checksums, and aggregate capacity reporting. Schema application and identical import retries are tested.
- Reusable hosted checks for API queries, pagination, project/club isolation, RLS and client grants, private schema exposure, plus a private backup command and an isolated local restore check.
- Catalog discovery now returns a bounded page with search, all five sort modes, all-selected tag filters, counts, first/latest sightings, and cover references. The existing catalog screen supports that port, cancels stale next pages, and skips per-card Storage listings when a cover is supplied. Its default composition still uses Firebase.
- A staged favorite writer commits changes, retry receipts, and a private outbox event in one transaction. Simultaneous identical requests produce one receipt and event. SQL refuses writes unless the server-controlled `catalog_core` domain switch is PostgreSQL; no hosted switch has been enabled. No-op favorites generate no event, and older retries return their original receipt without reverting newer state.
- Catalog details, existing catalog pickers, media references, member favorites, and aggregate favorite counts have staged SQL adapters. Pickers and media collect bounded keyset pages, linked local detail URLs remain addressable, and external photo licenses are retained. Catalog dependencies select discovery, reads, and the favorite writer as one required bundle. Unsupported catalog editing is blocked before any Firebase/Storage write when that bundle is selected.
- Explicit tag configuration and assignment markers preserve deliberately empty tag lists, which differ from absent defaults. The importer writes those markers; the discovery query supplies the existing default tags only when configuration is absent.

The importer handles the known relational collections. Unexpected populated or nested collections stop preparation; they are never silently dropped. Historical contributor IDs stay private. Imported participation can create an archival membership with access disabled, without creating a Firebase account.

## Server-key replacement completed

During the October 5 local web smoke check, Expo's development environment context attempted to compile `.env.supabase.local`, and its transform error included the server secret key. The server was stopped, Metro now excludes Supabase and Functions server env files, and a fresh browser build confirms that exclusion. Generated `.expo` and browser artifacts were checked without printing the key; none contained it. The key appeared in diagnostic output, so replacement was required. There was no production deployment.

The user confirmed the private configuration was updated after the replacement instructions. The saved key now succeeds against all hosted read RPCs; no further credential setup is needed. Revocation of the previous key is an account action and was not independently checked by the agent. The private `.env.supabase.local` also contains the PostgreSQL session-pooler URI on port `5432` with `sslmode=require` and the Firebase source project. Its file mode is `600`, and Git ignores it. `.env.supabase.example` contains reusable placeholders only.

Credentials belong in the private local file or server secret storage, not in chat or an `EXPO_PUBLIC_` variable. Photos and authentication remain in Firebase. No paid-plan switch was requested or performed.

The server key bypasses RLS and must stay on the server. Supabase documents key retrieval and usage in its [API key guide](https://supabase.com/docs/guides/getting-started/api-keys). The session connection is described in [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Local rehearsal results

On October 2, 2026, a read-only export selected these records for the rehearsal:

| Domain                          |        Selected records |
| ------------------------------- | ----------------------: |
| Catalog                         |  51 local + 62 imported |
| Sightings                       | 54 local + 626 imported |
| Comments                        |                     100 |
| Public profiles                 |                       3 |
| Stations                        |                       8 |
| Alerts                          |                       3 |
| Firebase membership projections |                     162 |
| External photo references       |                   1,594 |

The initial reviewed local schema and import occupied **4,153,344 bytes (about 4.2 MB), including 1,720,320 bytes of indexes**, across application/private tables. The full local PostgreSQL database occupied about 12.9 MB including system catalogs. These measurements cover the selected relational slice, not retained Firebase collections, image files, or future traffic.

All imported SQL memberships have access disabled. There are 163 minimal identity records because one historical contributor is absent from the 162 current Firebase user records. No email addresses were copied into contributor rows.

The rehearsal manifest uses root local catalog/sightings/profiles/stations/alerts and tenant iNaturalist records/comments. It excludes 622 root iNaturalist observations and 62 root guide profiles as duplicate entity copies. The [source audit](database-source-audit.json) found that overlapping observation facts agree except import timestamps/run metadata. Forty-six root guide records contain explicit local catalog links absent from their tenant copies; all targets exist, all statuses are linked, and no tenant relationship conflicts. The manifest preserves those relationships and their provenance while taking imported facts from the tenant source. Stored catalog entities total 113; the effective catalog contains 67 entries because the 46 linked local copies are represented by their guide entries. This selection does not prove every legacy root collection is obsolete; final source ownership still needs review before cutover.

Thirty-seven local sightings do not match exactly one local catalog name. Their reported names are preserved and their catalog links remain null. Resolving those links requires evidence of the intended cat; the importer does not guess.

## Hosted validation results

The [aggregate validation report](database-hosted-validation.json), recorded October 5, 2026, verifies PostgreSQL 17.11, five migrations, 680 sightings, 113 stored catalog entities, 67 effective catalog entries, 100 comments, and 1,594 media references. Application/private tables occupy **7,200,768 bytes (about 7.2 MB), including 2,834,432 bytes of indexes**. The whole database occupies about 19.0 MB including system overhead. Physical storage includes space retained from updates; a restored dump can occupy less. Neither figure measures monthly traffic.

All ten read RPCs passed hosted API checks, including catalog discovery/detail/media and favorite reads. Catalog and media pagination return distinct pages; missing project/club scopes return no records. Anonymous and authenticated database roles cannot read application/private tables or execute service RPCs. Every application table has RLS enabled, the private schema is not exposed in the Data API, and unauthenticated API calls are denied. Membership access remains disabled, the outbox is empty, and SQL domain writes remain switched off.

Sample catalog detail and media round trips were 57–63 ms. The first catalog request took 520 ms; subsequent catalog/discovery checks varied from 65–217 ms. These are small rehearsal requests from this workspace, not query-only timings or a production latency benchmark. No frontend performance improvement is claimed before integration.

The complete rehearsal dump includes application/private schemas and public RPC definitions. Its isolated local restore verified entity counts, recovered links, query execution, and client RPC denial. The private dump is outside Git in `/tmp`; it is a temporary rehearsal artifact, not durable or scheduled production backup storage.

The [October 5 capacity report](database-hosted-capacity-20261005.json) records the earlier four-migration measurement, about 7.2 MB of application/private storage including indexes, and about 19.0 MB for the whole database. Entity and recovered-link counts remain unchanged. A subsequent detail migration adds a small media pagination index; the latest hosted validation report above records five migrations. The updated private dump restored with all five migrations, recovered catalog details, and closed client grants for every service RPC.

The new catalog SQL tests verify search literals, tied names, all five sort cursors, null recent dates, exact timestamps, default versus explicit empty tags, linked media, tenant scope, and client denial. Detail tests verify linked local precedence/deep links, tied media-position cursors, external licenses, hidden/foreign media denial, and favorite counts without participant IDs. Adapter tests verify malformed/repeated pages and identity mismatches. The review found and repaired a catalog-name cursor limit that could reject valid long legacy names. Favorite tests verify rollout denial, hidden/foreign targets, concurrent identical requests, mismatched operation IDs, no-op effects, clearing, and replay after later changes. React tests verify page loading, unchanged local filtering/favorites, stale-page cancellation, and no per-card Storage request for supplied covers. The browser smoke check at `localhost:8099` renders Welcome and responds to university navigation with no console errors; protected catalog browser testing still requires a test login. Three existing legal-module/deprecated-shadow warnings remain.

## Commands for continuing the setup

These commands document the implementation workflow; the user does not need to run them for the completed rehearsal.

```bash
# Requires PostgreSQL tools on PATH. Uses synthetic data and a temporary local cluster.
npm run db:test

# Hosted connection check: read-only. Replace PROJECT_REF with the URL's subdomain.
node --env-file=.env.supabase.local scripts/database/hosted.cjs --mode check --project-ref PROJECT_REF

# Applies versioned schema atomically to that explicit target. Does not import application data.
node --env-file=.env.supabase.local scripts/database/hosted.cjs --mode apply-schema --project-ref PROJECT_REF

# Read-only selected-domain export; private files must be outside the repository.
npm run db:export -- --project campuscats-d7a5e --club campus-cats --output /tmp/campus-cats-export-NEW.json

# Offline preparation. Review the accompanying aggregate report before applying SQL.
npm run db:prepare -- --export /tmp/campus-cats-export-NEW.json --manifest supabase/source-manifest.production.json --output /tmp/campus-cats-import-NEW.sql

# Compare duplicate sources offline; the report contains counts and field names only.
node scripts/database/source-audit.cjs --export /tmp/campus-cats-export-NEW.json --output /tmp/campus-cats-source-audit-NEW.json

# Imports only into a closed rehearsal dataset; refuses enabled memberships or outbox activity.
node --env-file=.env.supabase.local scripts/database/hosted.cjs --mode rehearse-import --project-ref PROJECT_REF --export /tmp/campus-cats-export-NEW.json --manifest supabase/source-manifest.production.json

# Read-only checks of hosted SQL privileges and API behavior.
node --env-file=.env.supabase.local scripts/database/verify-hosted.cjs --output docs/database-hosted-validation.json

# Private complete schema/data dump; existing backup paths cannot be overwritten.
node --env-file=.env.supabase.local scripts/database/hosted.cjs --mode backup --project-ref PROJECT_REF --output /tmp/campus-cats-backup-NEW.dump

# Restores into a new local cluster only, verifies, then removes that cluster.
node scripts/database/restore-check.cjs --backup /tmp/campus-cats-backup-NEW.dump --expected-capacity docs/database-hosted-validation.json
```

The exporter uses the existing Firebase CLI login, paginates records and discovered child collections, and writes owner-readable files. It does **not** produce a transactionally consistent snapshot or a full Firebase backup. Exports/import files contain private data and should remain in private storage; the rehearsal files are outside Git in `/tmp`.

Import SQL runs in one transaction under a club advisory lock, with batches of 200 statements to reduce network round trips. Stable upserts make identical retries safe, and imported activity does not enter the outbox or billing pipeline. The import is for a fresh, closed staging database; it does **not** reconcile later source deletions, removed photos/tags/achievements, or concurrently changing source records. Before cutover, freeze client/admin/integration writers and rebuild the staging contents from the final reconciled export, or implement and test deletion reconciliation. A feature flag alone is not a rollback after SQL starts accepting writes.

## Work remaining before the live app can use PostgreSQL

The catalog list's discovery screen integration is implemented behind an explicit backend option. `createFirebaseBackend({ catalogDiscovery: 'postgres' })` selects its discovery, detail/media/favorite readers, and favorite writer together for integration testing; normal app composition keeps the Firebase backend. This option is not a production rollout switch: sightings, contributor attribution, profiles, comments, catalog tags, catalog/sighting mutations, and background import writers still require migration. The staged catalog module refuses unsupported create/update/delete operations before writing to Firebase. Do not enable it in the live app while those writers are active. The prepared read/mutation handlers are not registered or deployed as callables yet.

The remaining connected group needs transactional catalog/tag/sighting mutations, sighting/member reads, contributor privacy parity, import/moderation writers, membership/profile projection updates, the outbox worker for existing notifications/achievements/billing, and account/media cleanup across both stores. Stations, comments and community submissions also need their migrated gateways. Those are implementation work, not account setup steps for the user. Merely copying the data will not make the existing Firestore screens use PostgreSQL. Whether older app versions must update before cutover is awaiting the user's decision; it determines the legacy writer handling.

PostGIS and direct Firebase-token Supabase reads remain later rollout steps. The current map query uses latitude/longitude indexes and bounds, with strict page limits. Direct client grants stay closed until the complete membership/privacy bridge and revocation tests pass. No Firebase custom claims are required for the initial server gateway.

Production cutover requires a final source reconciliation, consistent final import, query/behavior parity checks, old-client write handling, a write-aware rollback procedure, and durable scheduled backups with another restore check. The successful rehearsal restore verifies the toolchain; it does not replace those production checks. Firebase Auth, chat, settings, Storage, Functions, Stripe/billing, and hosting stay in Firebase as agreed.
