# App settings and contributor privacy

The President can open **More → App Settings** to manage the club logo, the primary
and accent colors, and contributor privacy. The Developer role intentionally does not
have access to these controls.

## Behavior

- The login and other account-access screens use the uploaded club logo. Until a logo
  is uploaded, they use `assets/images/campus_cats_logo.png`.
- Primary and accent colors must be six-digit hex values. The app derives accessible
  light and dark variants instead of placing an arbitrary selected color directly
  behind text.
- `sightingsAnonymous` defaults to `true` when no settings document exists.
- While anonymity is enabled, Members can read sighting and catalog content but cannot
  read another contributor's identity. Officers, Vice-Presidents, the President, and
  Developers can read contributor identities. A contributor retains the minimum
  self-read needed to update or delete their own sighting.
- When anonymity is disabled, active Members can also see contributor identities.
- iNaturalist observer attribution remains visible because it describes externally
  published source data, not a Campus Cats contributor.

## Firebase data

Public branding and privacy preferences live at `app-settings/public`. Logo images
live under `app-branding/` in Cloud Storage and are publicly readable so the signed-out
login screen can display them. Only the President can write either resource.

Campus Cats identities are stored separately from public content:

```text
content-contributors/sighting__<sighting-id>
content-contributors/catalog__<catalog-id>
```

Each contributor document contains `kind`, `contentId`, and a `user` snapshot. New
sightings and catalog entries write the public content document and its private
contributor document in one Firestore batch. Deletes remove both documents in one
batch. Firestore rules reject orphaned contributor creation, identity takeover, and
one-sided deletion.

## Existing-data migration

Older `cat-sightings` and `catalog` documents contain an embedded `createdBy` map. The
President's first save with anonymity enabled calls `migrateContributorPrivacy`, which
moves valid embedded identities into `content-contributors` and removes `createdBy`
atomically in batches. The callable is President-only and idempotent. Later saves do
not rescan unless anonymity is changed from off to on.

The migration changes the stored document shape. Release it during a maintenance
window and require clients containing the optional-contributor codec before migrating.
Use this order:

1. Run the root quality/unit/emulator checks and the Functions build/tests.
2. Deploy the new callable Functions.
3. Begin the maintenance window and make the compatible client release available.
4. Deploy the new Firestore and Storage rules together with that client release.
5. Sign in as the President, open App Settings, leave anonymity enabled, and save once.
6. Confirm every migrated public document lacks `createdBy`, has one matching
   `content-contributors` document, and remains readable to a Member.
7. Confirm a Member cannot read another contributor record, while an Officer can.

Until step 5 completes, the default is still anonymous and the new rules deliberately
deny Members access to unmigrated documents that expose embedded identities. Officers
can inspect those documents to diagnose an incomplete migration.

Do not deploy Functions, rules, Storage rules, or client builds from an ordinary
contributor branch.
