# iNaturalist import operations

Campus Cats consumes public data from the
[Georgia Tech Cat Sightings project](https://www.inaturalist.org/projects/georgia-tech-cat-sightings)
and the 62-profile
[Georgia Tech Cats guide](https://www.inaturalist.org/guides/18800). The integration is
strictly one-way: it performs unauthenticated `GET` requests and never creates or edits
iNaturalist observations, guide profiles, or media.

## Source mapping

| iNaturalist source         | Campus Cats representation                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| Observation numeric ID     | `inaturalist-observations/{id}` and route `inat-observation-{id}`                             |
| Guide-taxon numeric ID     | `inaturalist-guide-profiles/{id}` and route `inat-guide-{id}`                                 |
| Observation time           | Actual timestamp when supplied; otherwise the source calendar date with date-only precision   |
| Public `geojson` point     | Map marker and detail inset; observations without a public point remain detail-visible        |
| Observer and quality grade | Source metadata shown on imported detail pages                                                |
| Observation comments       | Read-only, source-attributed discussion merged into the Campus Cats sighting thread           |
| Observation field `16302`  | Raw Georgia Tech Cats value plus an exact catalog relationship when uniquely resolvable       |
| Guide tags                 | Optional years, areas, status, fur length/pattern, sex, and TNR fields                        |
| Licensed source photos     | External display assets with source, photographer attribution, license code, and license link |

Imported observations never receive app-only `fed`, `health`, or `createdBy` values.
Imported comments retain their iNaturalist comment ID, author, timestamp, and source
link. They are never eligible for Campus Cats warnings or bans. Officer deletion hides
the local copy with a persistent moderation marker, so a later sync cannot restore it;
the source comment remains unchanged on iNaturalist.
Eight current guide profiles have no display name; they remain importable under the
deterministic label `Unnamed cat #{guide-taxon-id}` rather than borrowing a description
as a fabricated identity. Missing source facts remain visibly unknown and may be
enriched with officer-maintained overrides.

The observation importer uses the supported
[iNaturalist v2 observations API](https://api.inaturalist.org/v2/docs/) with ID-based
pagination, 200 results per page, selected response fields, a custom user agent,
timeouts, bounded retries, `Retry-After`, and approximately one request per second.
This follows iNaturalist's
[API recommended practices](https://www.inaturalist.org/pages/api%2Brecommended%2Bpractices).
The guide is not exposed in v2, so catalog data comes from the public structured
`guide_taxa.json` response. The importer does not scrape guide HTML.

## Linking and precedence

Names are normalized using Unicode compatibility normalization, case folding,
punctuation removal, whitespace collapsing, and trailing parenthetical aliases. A
relationship is accepted only when the normalized primary name has one exact guide
match. Generic field values including `Ginger`, `Multiple individuals`, `Unknown`, and
`Unidentified` never link. Fuzzy matching is not used.

An imported guide profile automatically links to a local catalog entry only when each
side has one unique exact normalized name. The stored link survives later source-name
edits. Ambiguous matches remain separate and appear in Officer Tools. The composed
profile uses linked local data first, then imported local overrides, then source data.
Local Firebase media remains primary; otherwise the selected licensed guide cover and
gallery are used.

## Licensing and attribution

Only CC0 or Creative Commons `CC-BY*` photos are displayed. Every external asset keeps
its photographer attribution, source page, license code, and license link. Malformed,
unlicensed, or all-rights-reserved media is omitted without dropping its observation
or profile. The app displays a placeholder when no eligible image remains and never
copies iNaturalist image bytes into Firebase Storage.

Observation descriptions are imported only when the observation data carries a
reusable Creative Commons license. This separation matters because iNaturalist
licenses observation data and individual media independently; see its
[licensing guidance](https://help.inaturalist.org/en/support/solutions/articles/151000175695-what-are-licenses-how-can-i-update-the-licenses-on-my-content-).

## Scheduling, state, and recovery

`syncInaturalistDaily` runs at `03:17 America/New_York`. A transactional Firestore
lease prevents overlapping scheduled and manual runs. Upserts are deterministic and
written in bounded transactions so a concurrent officer moderation, override, or link
cannot be overwritten by a stale sync read. `integration-state/inaturalist` stores the
lease, current run, source-specific counts/errors, completion status, and ambiguous
profile IDs.

Guide and observation scans fail independently. A complete source scan marks records
not seen in that source inactive; partial or failed scans never deactivate unseen
records. Reappearing records reactivate unless an officer has hidden them. Upserts
preserve moderation, catalog overrides, persisted links, and the original import time.
Imported observations never trigger announcement notifications.

Officers can inspect status, run a manual retry, review ambiguity, and
hide/restore records from **More → iNaturalist Sync**. Hiding requires an audit reason.
Imported data remains stored when hidden or removed upstream. Clients cannot write the
import collections directly; synchronization, moderation, overrides, and linking use
role-checked callable Functions.

## Verification and deployment order

CI uses recorded fixtures and Firebase demo-project emulators. To make an optional
read-only compatibility check against the current public endpoints, run:

```bash
npm run contract:inaturalist:live --prefix functions
```

This command validates every current guide profile and the first 200-observation v2
page. It is deliberately excluded from CI so provider availability cannot make builds
non-deterministic.

After merging backend and client changes:

1. Deploy Functions and Firestore rules before releasing the client.
2. Run one manual import from Officer Tools.
3. Inspect source counts, errors, ambiguous matches, unnamed profiles, licensing, and
   representative map/detail records.
4. Release the client only after the initial data has been reviewed.

If a run fails, leave existing data in place, inspect structured Function logs and the
integration-state summary, correct the provider or mapping issue, then retry. Do not
delete imported collections to recover from a partial run.
