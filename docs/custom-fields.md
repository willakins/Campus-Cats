# Club-managed record fields

Presidents and Developers can open **More → Additional Fields** to configure
optional information for cat profiles, sightings, and feeding stations. Each record
type supports up to 20 definitions, including archived definitions. Available types
are text (up to 1,000 characters), finite numbers, yes/no, and choices with 2–20 unique
options. Existing built-in fields and records do not need a migration.

Active fields appear under **Additional information** in the create/edit forms and
on the saved record's details. Officers can edit cat and station fields. Only the
original reporter can edit a sighting's fields, matching the main report's ownership
policy. Imported cat profiles can carry local additional information; imported
sighting reports remain read-only.

These fields follow the record's audience: cat and sighting values are member-readable,
station values require officer access, and hidden imported cat profiles require
an officer. They are not a place for private member information.

Archive a definition to hide it while retaining existing values; reactivating it
restores them. Definition IDs, types, and existing choice options remain stable.
The current administration screen supports creating and archiving/reactivating fields.
Fields are optional so new definitions do not invalidate older records.

Definitions live in `clubs/{clubId}/custom-field-definitions/{kind}`. Values live in
`clubs/{clubId}/custom-field-values/{kind}__{recordId}` alongside a server-generated
parent reference. The rules prohibit direct writes. The `saveCustomFieldDefinitions`
and `saveCustomFieldValues` callables validate types and recheck live club membership,
role, session cutoff, and record ownership inside a Firestore transaction. Field
values are hidden immediately when their parent is deleted; content deletion triggers
remove them, and account deletion removes associated sighting values in its cleanup.

The main record and additional information use separate saves. If the latter fails,
the form reports that the main record is saved. A retry updates that existing record
with the current form values, then retries the additional information; it does not
create a duplicate record. Changing accounts or clubs discards stale responses.

## Release requirements

Deploy the new callables and Firestore rules before releasing clients with these
forms. Deploy updated content-deletion triggers with the same backend release.
The map improvements additionally require the new composite indexes in
`firestore.indexes.json`; wait for hosted indexes to become ready before activating
the client. Local emulator success does not establish that production indexes or
Functions have been deployed. No production deployment is performed by this change.
