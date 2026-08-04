# Testing Campus Cats

Campus Cats uses behavior-first tests at the boundaries callers depend on. Use Node 22
for every command; emulator tests also require Java 21.

## Local verification

```bash
npm ci
npm run quality
npm run test:ci
npm run test:coverage
npm ci --prefix functions
npm run test:ci --prefix functions
npm run emulator:exec
```

`npm run quality` performs a non-mutating TypeScript check, ESLint check, and Markdown
format check, plus the presentation-layer raw-color guard. `npm run test:ci` runs Jest
Expo without watch mode.

## Test layers

- Domain tests lock canonical Zod models, Firestore codecs, validation messages,
  clocks, IDs, station calculations, and the role hierarchy.
- Feature tests exercise only public module interfaces with deterministic in-memory
  ports, including validation, authorization, conflicts, dependency failures,
  warnings, and partial completion.
- Media tests name reconciliation, promotion, cleanup, and compensation outcomes.
- Route tests use accessible queries and realistic presses to cover loading, empty,
  error, role, confirmation, and successful-mutation behavior.
- Theme and primitive tests cover light/dark resolution, WCAG AA pairs, Reduce Motion,
  44-point targets, live feedback, form labels, segmented state, and named media
  actions. Responsive layout tests cover narrow phones, 200-percent text, normal
  phones, and tablet/web widths.
- Function tests call dependency-injected handlers to cover authorization, validation,
  notification batching, provider failures, and whitelist compensation.
- Emulator contracts run against Firestore and Storage adapters and verify security
  rules. The project-ID guard permits only IDs beginning with `demo-`.

Tests must not assert component state or use snapshots as their only evidence. Prefer
what a user can find, press, or observe and what a caller receives from a public
module.

## Coverage gates

`npm run test:coverage` enforces at least 80% statements, branches, functions, and lines
across owned TypeScript included in coverage. It separately enforces at least 90%
branch coverage for domain, media-application, and feature-application modules.

Authorization, whitelist provisioning and compensation, media compensation, and
callable behavior have named suites and must remain completely represented when those
workflows change. Firebase and Expo production adapters are additionally exercised by
emulator contracts or manual integration checks where a native/device API is required.

## Native verification

Automated mocks cannot validate device permission prompts, native SAML handoff, real
maps, or notification delivery. Complete the repository
[verification checklist](verification-checklist.md) before moving a release PR out of
draft.
