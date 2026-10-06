# Query and page-loading performance

Updated October 6, 2026. This records the current performance changes, measured SQL diagnostics, release requirements, and the next work in order of likely impact.

The accepted storage direction is documented in [data-storage-and-costs.md](data-storage-and-costs.md). **Live application traffic still uses Firebase; PostgreSQL is a staged relational copy.** These changes improve existing Firebase paths without enabling an incomplete SQL cutover.

## Changes implemented in this pass

| Loading path                       | Previous behavior                                                                                     | Implemented behavior                                                                                     | Expected effect                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Member profile sightings           | Fetch every visible imported observation, then select the member's observations on the client         | Resolve verified numeric observer IDs and query each with `visible == true` and `observer.id == ID`      | Transfer/read only that observer's visible observations rather than the entire imported collection       |
| Contributor attribution            | Fetch every contributor and filter by content kind on the client; list modules repeat settings checks | Query `kind == sighting` or `kind == catalog`; return visibility and contributor map together            | Smaller contributor result sets; one privacy-settings check per successful list operation                |
| Alerts and events                  | Fetch content, then fetch the member's read receipts                                                  | Start both independent queries together                                                                  | Remove one serial network dependency while retaining receipt-failure warnings                            |
| Sightings list                     | Finish local reports and attribution before starting imported sightings                               | Start local and imported reads together                                                                  | Remove the local/imported waterfall; unavailable imports still produce a useful local result and warning |
| Concurrent document reads          | Each caller invokes the Firebase SDK for the same pending read                                        | Share a pending request when authenticated UID, path, operation, filter and value match                  | Avoid duplicate SDK requests during overlapping loads                                                    |
| Imported observation/guide details | Detail and media consumers can read the same imported document concurrently                           | Share pending reads; observation and guide collections, visibility options and observers remain distinct | Avoid duplicate detail lookups without mixing private/audit and member-visible queries                   |
| Community sections                 | A single loading flag waits for all four lists and survey/vote participation checks                   | Each section finishes independently; participation badges finish separately                              | Alerts or Events can display even while another section or badge is slow                                 |

These are request-structure improvements, not a measured promise of a particular percentage reduction in page-load time. Sharing SDK calls does not by itself establish the exact reduction in billable reads; Firebase may perform its own caching and rule checks.

The profile query still loads all of the selected member's observations. It is narrower, but not yet paginated. Firebase catalog metrics still use broad sighting lists. The main map now uses the bounded reader described below.

### Bounded map loading

The main map now queries the visible geographic area and selected age on the server.
Each local/imported stream loads at most 100 records per page, with a one-record
lookahead to identify more results. Viewports crossing the antimeridian use two
longitude intervals per source. Null/private imported coordinates and hidden imports
are excluded by the query. Local map pins omit contributor identities.

Map movement is debounced for 250 ms. Provider bounds are reported on map readiness,
panning, and web zoom/resize. Cursors are scoped to account, club, bounds, and date;
changing those inputs starts a fresh result set and discards old responses. Counts
explicitly describe loaded sightings in the current area, and **Load more sightings**
exposes remaining pages. **All** means all ages within that area, not a global total.

The geographic/date composite indexes are checked into `firestore.indexes.json`.
Queries use latitude, longitude, date, and document ID for stable pagination; imported
queries also require `visible == true`. This bounds document transfer and avoids the
previous full-collection map fetch. Index-entry scan costs and production page-load
latency still need representative measurement; no percentage improvement is claimed.

### Freshness and privacy

Request sharing uses [InFlightReads](../adapters/firebase/InFlightReads.ts), with **no settled-result cache or TTL**. After a read resolves or rejects, the next request fetches again. Rejected requests do not poison retries.

Production composition supplies the current Firebase UID as the request scope. Paths contain the club ID. Queries with different filters or visibility options have different keys. This keeps simultaneous requests for different users, clubs, observer IDs or audit modes separate.

[FirebaseDocumentStore](../adapters/firebase/FirebaseDocumentStore.ts) invalidates its pending-read registry before and after writes, deletes and batches. A read started during a mutation cannot be reused by a caller after that mutation finishes. An older request's completion cannot remove a newer registry entry.

Contributor visibility still follows application settings and existing Firestore authorization. Imported profile queries always require `visible == true`, including for officers; moderation/audit methods retain their explicit visibility option. No access rules or SQL client grants are loosened.

## Index coverage

### Firestore

The checked-in [index configuration](../firestore.indexes.json) now includes:

```text
Collection: inaturalist-observations
Scope: COLLECTION, including clubs/{clubId}/inaturalist-observations
Fields: visible ASC, observer.id ASC
Query: where visible == true AND observer.id == numeric ID
```

Existing composite indexes cover university prefix search, chat day/history and club-ping ordering, tenant/role member queries, and billing usage lookups.

Contributor-kind and member receipt queries use a single equality field. Firestore's automatic single-field indexing supports such lookups when the field remains indexed. The observer query has an explicit composite declaration so its intended filter pair is represented in source control. Confirm hosted index availability before releasing the new reader; emulator query success alone does not prove hosted indexes are ready. [Firestore query documentation](https://firebase.google.com/docs/firestore/query-data/queries), [index management](https://firebase.google.com/docs/firestore/query-data/indexing).

Indexes improve selection and ordering; they do not eliminate the documents requested by an unbounded list or the calls needed to assemble a screen. Adding more indexes to a whole-collection fetch does not fix its transfer size or call count.

### PostgreSQL

The hosted [aggregate diagnostic report](database-query-performance-20261005.json) records three samples per probe. Index use was observed for these representative base-table reads:

| Probe                                          | Index observed               | Execution time after first sample |
| ---------------------------------------------- | ---------------------------- | --------------------------------: |
| Recent visible sightings, limit 100            | `sightings_recent_idx`       |                    0.069–0.085 ms |
| Sightings for a catalog ID, limit 40           | `sightings_catalog_date_idx` |                    0.056–0.059 ms |
| Visible guide-taxon sightings, limit 40        | `sightings_guide_idx`        |                    0.066–0.100 ms |
| Visible local catalog names, limit 40          | `catalog_name_idx`           |                    0.096–0.099 ms |
| Catalog media ordered by position/ID, limit 99 | `media_catalog_page_idx`     |                    0.055–0.059 ms |

The five catalog discovery sorts took 9.891–16.121 ms after the first sample of each sort. The first name-ascending discovery sample took 96.277 ms. These are observed database execution timings on a small staged dataset; they exclude planning time, Firebase authorization/runtime, Supabase network transfer, client decoding, and rendering. They are not production p95 or concurrent-load measurements.

Discovery is a PL/pgSQL function. Its outer `EXPLAIN` returns a `Result` node and records function execution time/buffers; it does **not** expose every internal query plan. The base-table probes verify their own index predicates, not the complete effective-catalog view, name-match counting logic, search, or gateway requests. No additional PostgreSQL index was added based on these results.

### Repeat the SQL diagnostics

Use the existing private server environment file:

```bash
node --env-file=.env.supabase.local scripts/database/query-performance.cjs \
  --output /tmp/campus-cats-query-performance.json
```

The tool verifies the configured Firebase project and club association, runs reads with `service_role` inside read-only transactions, sets a 15-second statement timeout, and rolls back. It exports timings, row-count estimates, buffer counters and index/node names. It excludes row contents, raw plan filters, member identifiers and credentials.

Do not use `enable_seqscan = off` to manufacture index-use evidence. A sequential scan can be a sensible plan for a tiny table. Recheck plans using representative future sizes and filters before adding indexes or paid compute.

## Release steps

The code and index declaration are local changes. No production app, Function, or index deployment was performed by this pass.

1. Deploy/check the new index in development:

   ```bash
   npx firebase deploy --only firestore:indexes --project campus-cats-development
   ```

2. Wait for the `inaturalist-observations` index to be ready. Confirm existing indexes remain available. Test a member profile with a verified iNaturalist link and confirm hidden observations stay excluded.
3. Exercise Community Alerts while another list/badge is slow, and confirm the section renders independently. Check read receipts, catalog attribution privacy, and refocusing after an edit.
4. Apply the same index configuration to production and wait for readiness:

   ```bash
   npx firebase deploy --only firestore:indexes --project campuscats-d7a5e
   ```

5. Release the app/web changes through the normal release process. Keep default backend composition on Firebase until the [SQL handoff](supabase-setup.md) cutover conditions are satisfied.

The narrower observer query maps an unavailable index/backend failure to the existing partial-completion warning. It does not silently fall back to a full imported-collection scan.

## Next improvements, in priority order

| Priority | Remaining work                                                                                         | Why it matters                                                                                                                                                         | How to verify                                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1        | Capture end-to-end timings for Map, Catalog, Cat Details, Profile and Community                        | Separates auth, network, queries, photos and rendering; establishes which page is actually slow                                                                        | Record navigation-to-first-content and usable-page times, request counts and bytes on cold/warm loads; use enough samples for p50/p95                                          |
| 2        | Finish the relational gateways/writers, then enable bounded SQL catalog discovery and cover references | Current Firebase catalog discovery still reads catalog, sightings, favorites, tags and assignments; local cards can list Storage and resolve URLs individually         | Verify one bounded discovery response per page and no per-card Storage listing; preserve favorites, privacy, filters and linked local/imported behavior                        |
| 3        | Connect cat-detail sighting history to the bounded SQL query                                           | Current cat details fetch the entire sightings list and filter it on the client                                                                                        | Count requests/documents as other cats' histories grow; show more pages without dropping history or changing matching behavior                                                 |
| 4        | Verify the bounded map reader and index readiness on the deployed backend                              | Implemented: viewport/date queries, independent cursors, and explicit loaded counts                                                                                    | Verify viewport coverage, antimeridian behavior, date changes and pagination; preserve an honest “All” overview/count rather than silently truncating                          |
| 5        | Debounce remote catalog search and retain useful content during refresh                                | The staged SQL screen's `useDeferredValue` prioritizes rendering but does not impose a network debounce                                                                | Type a search quickly and count requests; reject stale responses and prevent paging with an obsolete search cursor                                                             |
| 6        | Return summaries/projections needed by list cards instead of full entities and histories               | Catalog counts, covers and first/recent dates should not require downloading underlying collections                                                                    | Compare payload bytes and request counts; update summaries transactionally or through tested outbox handling                                                                   |
| 7        | Paginate comments, profile histories and community lists; batch author/profile lookup where necessary  | Narrow filters can still return unlimited history and many author reads                                                                                                | Test ties in ordering, deletions between pages, duplicate-free cursors, and continued access to older records                                                                  |
| 8        | Inspect discovery's internal plans at larger sizes before changing its SQL                             | Discovery currently builds metrics/tags/covers across the club catalog before applying the final page; substring search and derived sorts need deliberate query design | Benchmark realistic catalog/sighting sizes, tag filters, searches and later pages; consider pre-aggregation/projections and a suitable text index based on the final semantics |

Cross-session caches require a separate freshness policy and invalidation strategy for role/club changes, writes, moderation and settings. This pass deliberately shares only currently running reads. Paid instances, persistent caches and additional indexes should follow evidence from the specific slow path.

## Validation

Automated checks cover identical-request sharing, filter/tenant/user separation, retry after rejection, mutation invalidation, visible observer queries, concurrent content/receipt reads, concurrent local/imported reads, and independent Community rendering.

The shared iNaturalist adapter contract also exercises the observer query against both the in-memory reader and the Firestore emulator. Emulator checks validate rules/query behavior; hosted index readiness and end-to-end device/network timings still require release verification.
