# Database capacity assessment

For the consolidated dataset decisions and provider switching analysis, see [Data storage and costs](data-storage-and-costs.md). The measurements below retain their original dates.

Measured October 2, 2026, using read-only production Firebase APIs. This assessment
replaces the earlier hypothetical 10 GB storage example with observed usage. No
database, provider project, billing plan, application code, or production record was
changed.

## Production measurements

Source: project `campuscats-d7a5e`, Firestore `(default)`, Standard edition,
multi-region `nam5`. Cloud Monitoring window: September 2–October 2, 2026,
approximately 15:59 EDT to 15:59 EDT. The observation date is not a forecast.

| Measurement                                  |   Observed value | Scope                                                                              |
| -------------------------------------------- | ---------------: | ---------------------------------------------------------------------------------- |
| Latest reported data and index storage       | 91,192,985 bytes | 91.2 MB / 87.0 MiB; latest daily aligned maximum                                   |
| Document reads, last 30 days                 |           81,404 | Query, lookup, and not-found read counters combined                                |
| Average document reads per day               |            2,713 | Arithmetic average, not daily billing                                              |
| Largest observed aligned 24-hour read total  |           14,497 | Monitoring windows do not match billing quota reset boundaries                     |
| Document writes, last 30 days                |           54,573 | Create and update counters combined                                                |
| Average document writes per day              |            1,819 | Arithmetic average                                                                 |
| Largest observed aligned 24-hour write total |           13,500 | Monitoring windows do not match billing quota reset boundaries                     |
| Records in discovered collection groups      |            8,232 | Aggregate queries; includes root and nested records with matching collection names |

Storage comes from
`firestore.googleapis.com/storage/data_and_index_storage_bytes`. Reads and writes
come from the corresponding `document/read_count` and `document/write_count`
metrics. These are monitoring measurements, not an invoice. Collection names were
discovered at the database root and beneath the existing club document, then counted
with collection-group aggregation queries. Undiscovered collection names at deeper
paths are not included in the inventory count; the database storage metric includes
the database as a whole. Data fields were not downloaded for this assessment.

Selected observed collection-group counts:

| Collection group           | Records |
| -------------------------- | ------: |
| universities               |   6,466 |
| inaturalist-observations   |   1,248 |
| users                      |     162 |
| inaturalist-guide-profiles |     124 |
| sighting-comments          |     100 |
| cat-sightings              |      54 |
| catalog                    |      51 |
| stations                   |       8 |
| public-profiles            |       3 |

The university directory comprises most of the inventoried records by count; record
counts do not establish which collection occupies most bytes. Both root and
club-scoped collections exist, so collection-group counts are not a count of unique
business entities. A migration must distinguish legacy copies from authoritative
records.

The monitoring API response-size metric returned only partial administrative and
server activity. It does not cover the app's complete database transfer, so it cannot
verify the 5 GB monthly egress allowance on free PostgreSQL plans. There is no
verified monthly bandwidth or invoice figure in this assessment.

## Free PostgreSQL options

| Item                        | Supabase Free                                   | Neon Free                                                        |
| --------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Hosting fee                 | $0/month                                        | $0/month                                                         |
| Database storage allowance  | 500 MB/project                                  | 1 GB/project                                                     |
| Outbound transfer allowance | 5 GB uncached egress; separate cached allowance | 5 GB public transfer/project/month                               |
| Compute                     | Shared CPU, 500 MB RAM                          | 100 CU-hours/project/month                                       |
| Inactivity                  | Can pause after one week                        | Suspends after five minutes; automatically resumes on connection |
| Recovery                    | No automatic backups                            | Limited six-hour restore history                                 |

Sources: [Supabase pricing](https://supabase.com/pricing),
[Neon plans](https://neon.com/docs/introduction/plans). Neon increased Free storage
from 0.5 GB to 1 GB on October 2, 2026; older pricing summaries may still list the
previous limit. [Neon announcement](https://neon.com/blog/neon-free-plan-1-gb-per-project)

The measured Firestore storage is about 18% of Supabase Free's listed database
allowance. This supports a free relational pilot with substantial apparent storage
headroom. It does not measure the resulting PostgreSQL database: schemas, table
overhead, indexes, normalization, and provider system data differ. Confirm PostgreSQL
size after a representative import.

Neon's 100 CU-hours permit 400 active hours at its smallest 0.25 CU compute size.
Continuous operation for a 30-day month requires 180 CU-hours at that size and
exceeds Free. Background jobs and scattered traffic can keep compute active even
when few records are stored. Resume latency is typically a few hundred milliseconds.
[Neon plans](https://neon.com/docs/introduction/plans),
[connection latency](https://neon.com/docs/connect/connection-latency)

## Recommendation

Evaluate **Supabase Free**, with **$0 additional database hosting**, before choosing
a paid PostgreSQL plan. Current measured storage does not justify Supabase Pro or a
10 GB database allocation. Neon Free is a credible alternative with more storage,
but its compute allowance and resume latency add constraints relevant to this app.

Keep Firebase Auth, Cloud Storage photos, and Firestore chat initially. Introduce
PostgreSQL for connected application records as previously discussed. Supabase
officially supports Firebase tokens and Expo/React Native, so login and photo
migration are not prerequisites.
[Firebase integration](https://supabase.com/docs/guides/auth/third-party/firebase-auth),
[React Native guide](https://supabase.com/docs/guides/auth/quickstarts/react-native)

Before declaring the free plan sufficient for production, verify the imported
PostgreSQL size including indexes and system overhead, monthly database transfer,
representative query latency, and backup arrangements. Supabase Free has no
automatic backups and can pause after inactivity; its provider recommends regular
database dumps to an external destination.
[Database size](https://supabase.com/docs/guides/platform/database-size),
[backups](https://supabase.com/docs/guides/platform/backups)

Existing Firebase charges remain separate. This assessment selects a free pilot;
it does not create a hosted project, execute a migration, establish a complete
production bill, or guarantee production performance.

## PostgreSQL rehearsal update

The selected relational slice was subsequently exported read-only and imported
into an isolated local PostgreSQL 18.6 database. The reviewed schema's application
and private tables occupied **4,153,344 bytes (about 4.2 MB), including indexes**;
the indexes accounted for 1,720,320 bytes. The full local database occupied
12,940,991 bytes including system catalogs. These are initial local rehearsal measurements;
the hosted measurements below include later retries and relationship reconciliation.

This covers 680 sightings, 113 catalog entries, 100 comments, existing profiles,
stations and alerts, minimal member/identity projections, import metadata,
provenance, and 1,594 external media references. Retained Firebase data and image
files are excluded. Legacy duplicate imports were explicitly excluded from the
rehearsal; source reconciliation remains necessary before production cutover.

The hosted rehearsal subsequently verified PostgreSQL 17.11 in the configured
Supabase project. Application/private tables and indexes occupy **7,069,696 bytes
(about 7.1 MB)**, of which 2,736,128 bytes are indexes. The full database occupies
18,831,027 bytes (about 18.8 MB), including system overhead and space retained from
rehearsal updates. The selected entity counts remain the same; preserving 46 explicit
legacy catalog links produces 67 effective catalog entries from 113 stored records.
The [hosted aggregate report](database-hosted-validation.json) records API/privacy
checks and sample round trips. A complete private dump restored successfully into
an isolated local cluster. Monthly transfer and production page latency remain
unmeasured; the live app has not switched databases.

See [the setup handoff](supabase-setup.md) for implementation status, exact source
selection, validation, and remaining integration work. Supabase account setup is
complete. Production data and app traffic still use Firebase.

On October 5, two additive catalog migrations increased the measured application/private
size to **7,159,808 bytes (about 7.2 MB)** including 2,793,472 bytes of indexes.
The full hosted database occupies 18,970,291 bytes. All entity counts remain unchanged.
The updated backup restored with four migrations. See the [aggregate capacity
report](database-hosted-capacity-20261005.json). The replacement server key passed the complete API recheck. A fifth migration adds
a media paging index: the latest [hosted validation](database-hosted-validation.json)
records 7,200,768 bytes of application/private tables and indexes, with the same
entity counts. Its updated backup restored successfully. Neither a hosting plan nor
live traffic was switched.
