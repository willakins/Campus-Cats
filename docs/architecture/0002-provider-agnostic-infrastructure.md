# ADR 0002: Provider-agnostic infrastructure seams

- Status: Accepted
- Date: 2026-08-06

## Context

Feature modules already depend on app-owned ports for documents, media, sessions,
remote effects, billing, and other external behavior. However, the application
composition root still constructed Firebase SDK objects directly, persistence codecs
used Firebase-specific names, and map-library types flowed into screens and forms.
Replacing Firebase or the map renderer would therefore require edits outside their
adapters.

## Decision

`createAppModules` is the only factory that assembles feature modules. It accepts an
`AppInfrastructure` interface made from two independent groups:

- `AppBackend` supplies document, media, identity, remote-effect, billing,
  iNaturalist, submission, and persistence-codec adapters.
- `AppRuntime` supplies device image selection, time, IDs, and password generation.

The production composition selects `createFirebaseBackend` in
`composition/infrastructure.ts`. Firebase SDK initialization and concrete Firebase
adapter construction remain inside `adapters/firebase`. A future AWS implementation
must satisfy `AppBackend`; selecting it changes the provider import in one composition
module while feature modules remain unchanged.

Persistence mapping uses `PersistenceCodec` and an injected `StoredDateCodec`.
Firebase translates its `Timestamp` values inside the Firebase backend factory. Other
providers can encode dates as native dates, ISO strings, or provider-specific values
without changing feature behavior.

Billing also exposes app-owned provider-presentation metadata. Console links, setup
guidance, and settings copy come from the selected backend, so an AWS implementation
does not leave Firebase administration links in shared screens.

Maps use a separate `MapAdapter` interface owned by the presentation layer. Screens
and forms know only coordinates, an initial viewport, appearance, and center-change
events. `composition/mapAdapter.ts` selects the concrete renderer. Google-specific
styling, camera translation, provider selection, and API-key handling live in the
`react-native-maps` adapter.

Provider selection is compile-time and explicit. A string-based registry or runtime
factory is intentionally deferred until the app has a demonstrated need to ship more
than one provider in the same build.

## Replacement workflow

To add AWS:

1. Implement the existing app-owned ports with AWS adapters.
2. Return those adapters and an AWS date codec from `createAwsBackend`.
3. Select that backend in `composition/infrastructure.ts`.
4. Run the existing adapter contracts and feature-module tests.

To add another map renderer:

1. Implement `MapAdapter` for the renderer.
2. Translate the app viewport and marker values inside that adapter.
3. Select it in `composition/mapAdapter.ts`.
4. Run the shared map-interface and route tests.

## Consequences

- Core and feature code contain no Firebase or map-provider imports or types.
- Provider-specific configuration and translation gain locality in their adapters.
- Feature tests use the same interfaces as production composition.
- Existing Firestore collections, Storage paths, routes, and visible behavior remain
  unchanged; this refactor requires no data migration.
- A provider still needs a real adapter for every capability in `AppBackend`; the
  factory prevents source changes in callers but cannot make unlike provider behavior
  identical by itself.
