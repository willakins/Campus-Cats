# Dependency modernization report

Completed: 2026-08-04

## Outcome

The repository now uses the current supported Expo and Firebase stacks while
remaining on the Node.js runtime supported by Cloud Functions for Firebase.
The upgrade was completed incrementally and verified after clean lockfile
installs; it did not deploy Firebase resources or publish a mobile build.

- Node.js is pinned to `22.23.2` and npm to `10.9.8` in local version files,
  package metadata, and CI. Functions retain the Firebase-compatible `node: 22`
  runtime declaration.
- Expo moved from SDK 52 to SDK 57, React Native from 0.76 to 0.86, and React
  from 18 to 19.2.
- Firebase JS moved from 11 to 12. Firebase Admin moved from 13 to 14,
  Firebase Functions from 6 to 7, and Firebase CLI from 14 to 15.
- Zod moved from 3 to 4, UUID from 11 to 14, React Native Testing Library from
  12 to 14, and ESLint from 8 to 9 with a flat configuration.
- GitHub Actions now use `actions/checkout@v6`, `actions/setup-node@v6`, and
  `actions/setup-java@v5`.
- Non-breaking transitive security updates were applied without using
  `npm audit fix --force`.

## Compatibility changes

- Expo Router now owns the tab navigator directly; redundant direct React
  Navigation dependencies were removed while preserving route names, order,
  labels, and role gating.
- App configuration uses the SDK 57 splash-screen plugin and no longer includes
  removed configuration fields.
- React Native tests use the async React 19 testing APIs and `test-renderer`
  instead of the removed direct `react-test-renderer` dependency.
- Firebase Admin uses modular app, Auth, and Firestore imports.
- Emulator tests restore a Node HTTP implementation after Jest Expo setup so
  Firebase 12 can administer Firestore/Storage and upload test Blobs reliably.
- The unmaintained web maps shim remains because it supplies the existing web
  map implementation. Its private Expo Location dependency is overridden to the
  SDK 57-compatible version; replacing the shim requires a separate product and
  map-rendering decision.

## Intentionally constrained versions

`npm outdated` still reports packages whose registry latest is incompatible
with the supported stack. These are deliberate compatibility pins, not missed
updates:

- Babel 7 is required by Expo 57; Babel 8 is not adopted.
- Jest 29 and `@types/jest` 29 match Jest Expo 57; Jest 30 is not adopted.
- TypeScript 6 is used by both the Expo app and Functions. TypeScript 7 is not
  adopted because SendGrid's current declarations do not compile against it;
  staying on 6 preserves full dependency declaration checking.
- ESLint 9 is the newest major supported by the current React lint plugin;
  ESLint 10 is not adopted.
- React, React DOM, Async Storage, Gesture Handler, Maps, Reanimated, Safe Area,
  Worklets, and other native packages use Expo's SDK 57 compatibility versions,
  even when newer independent releases exist.
- Node typings stay on major 22 to match the runtime.
- `node-fetch` 2 is a CommonJS-only emulator-test transport compatible with Jest
  29; it is not shipped in the app. `brace-expansion` 1.1.18 is a direct
  development pin that replaces the vulnerable 1.1.11 transitive copy required
  by the current React ESLint plugin.

## Security audit

Before modernization, npm reported 64 total root advisories and 54 total
Functions advisories, including high and critical findings. After direct and
safe transitive upgrades:

| Tree      | All dependencies | Production tree |
| --------- | ---------------- | --------------- |
| Root app  | 16 moderate      | 12 moderate     |
| Functions | 10 moderate      | 7 moderate      |

No high or critical advisories remain. The remaining reports originate in the
current Expo/Firebase dependency trees, primarily older UUID ranges and
OpenTelemetry. npm's proposed forced resolutions downgrade current Expo or
Firebase packages, so they must not be applied. Recheck these paths as upstream
packages publish compatible releases.

## Verification

- Clean `npm ci` installs succeed for the root and Functions lockfiles on Node
  22.23.2/npm 10.9.8.
- Root typecheck, ESLint, Prettier, UI color, platform compatibility, and Hosting
  configuration checks pass.
- All 44 root test suites pass: 241 tests with zero snapshots. Coverage remains
  above the repository's global and domain/application thresholds.
- All 28 Functions tests pass after a TypeScript build.
- All four guarded Firebase emulator suites pass: eight Firestore, Storage,
  adapter, and authorization tests against `demo-campus-cats-test` on Java 21.
- The Expo web export and Firebase Hosting validation pass.
- Expo Doctor passes 19 of 20 checks. The sole remaining finding is the
  pre-existing 248-by-217 non-square club icon; the image was intentionally not
  replaced as part of dependency modernization.

Native camera/library, maps, SAML, notifications, and device launch checks still
require the project's normal iOS and Android manual verification before release.

## Official references

- [Node.js release status](https://nodejs.org/en/about/previous-releases)
- [Node.js 22.23.2 archive](https://nodejs.org/en/download/archive/v22.23.2)
- [Expo SDK upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [Expo SDK compatibility table](https://docs.expo.dev/versions/latest/)
- [Cloud Functions supported Node runtimes](https://firebase.google.com/docs/functions/manage-functions#set_nodejs_version)
- [Firebase JavaScript SDK release notes](https://firebase.google.com/support/release-notes/js)
