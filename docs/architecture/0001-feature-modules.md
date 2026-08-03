# ADR 0001: Behavior-first feature modules

- Status: Accepted
- Date: 2026-08-03
- Tracking issue: [#129](https://github.com/willakins/Campus-Cats/issues/129)

## Context

Campus Cats grew quickly during a Georgia Tech capstone. Its screens currently call a
singleton database facade whose services also own navigation, React state setters,
alerts, Firebase access, validation, and selected-record globals. This makes ordinary
behavior difficult to test and makes a change in one feature risky for unrelated
features.

The refactor must preserve the production Firestore collections, document fields,
Storage paths, routes, and visible behavior. It must not require a production-data
migration.

## Decision

The application will expose an immutable `AppModules` composition root. It contains
explicit modules for sightings, catalog, stations, announcements, contacts, users,
whitelist, session, and image selection.

Each module presents typed query and mutation methods and returns `Outcome<T>` values.
Module interfaces never accept React setters, routers, alerts, or Firebase SDK types.
Screens and presentation hooks own loading state, confirmations, error display, and
navigation.

Firebase Auth, Firestore, Storage, callable functions, image picking, time, IDs, and
password generation live behind narrow ports. Production adapters use Firebase and
Expo; deterministic in-memory adapters support behavior tests. Contract suites verify
that in-memory and emulator-backed adapters agree.

Domain values are immutable and parsed by canonical Zod schemas. Firestore codecs own
the mapping between persisted documents and domain values. Routes pass record IDs and
load by ID instead of sharing selected objects through module globals.

Media operations share one reconciliation workflow. Stored image identity is opaque;
business code does not recover storage paths by parsing download URLs. Multi-product
operations define compensation behavior for partial failures.

## Consequences

- Features can be migrated vertically while the legacy facade remains temporarily.
- Tests describe caller-visible behavior at module, adapter-contract, route, callable,
  and security-rule seams.
- Dependency direction is presentation → application/domain → ports, with adapters
  implementing ports at the edge.
- Adding a generic repository, command bus, Redux store, or query cache requires a
  separate demonstrated need.
- The singleton facade, selected-record stores, duplicate model systems, and image
  handler hierarchy are removed after their final callers migrate.
