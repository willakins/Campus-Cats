# Firebase operations

These notes are intended for maintainers who already have authorized access to the Campus Cats Firebase project.

## Test locally first

The emulator suite is pinned to the non-routable Firebase demo project
`demo-campus-cats-test`. A guard rejects any project ID without the `demo-` prefix, so
automated tests cannot fall through to a real Firebase project.

```bash
npm ci
npm run emulator:exec
```

This starts isolated Firestore and Storage emulators, runs adapter contracts and the
authorization-rule matrix, and then stops the emulators. Java 21 and Node 22.23.2 are
required. Expected permission-denied logs are produced by negative authorization
assertions.

Run the pure callable behavior separately:

```bash
npm ci --prefix functions
npm run test:ci --prefix functions
```

The iNaturalist scheduler, imported collections, callable controls, and safe recovery
sequence are documented in the
[iNaturalist operations guide](docs/inaturalist-import.md). Deploy the backend and
rules before a client that reads imported records, then inspect the initial manual
import before releasing that client.

The officer billing report and its required Google Cloud Billing export are documented
in the [App Billing operations guide](docs/billing.md).

President-managed branding, anonymous contributor storage, and the required
existing-data rollout order are documented in the
[App settings and contributor privacy guide](docs/app-settings.md). Read that guide
before deploying the related Functions, Firestore rules, Storage rules, or client;
the contributor migration requires a coordinated maintenance window.

Community event media, survey-response privacy, community voting, and the release checks for the new
Firestore collections are documented in the
[Community engagement guide](docs/community-engagement.md).

University catalog synchronization, first-club verification, Georgia Tech backfill,
recovery, and rollout order are documented in the
[University onboarding operations guide](docs/university-onboarding.md). Configure
those server resources before deploying a client that removes the anonymous tenant
fallback.

Do not run a deploy command from a refactor or contributor branch.

## Before deploying

1. Review the proposed changes in `firestore.rules`, `storage.rules`, or `firestore.indexes.json`.
2. Install the repository dependencies with `npm ci`.
3. Authenticate the Firebase CLI and confirm the active project:

   ```bash
   npx firebase-tools login
   npx firebase-tools use
   ```

4. Do not continue unless the selected project is the intended deployment target.

## Deploy Firestore rules

```bash
npx firebase-tools deploy --only firestore:rules
```

## Deploy Storage rules

```bash
npx firebase-tools deploy --only storage
```

## Deploy survey submission callable

```bash
npx firebase-tools deploy --only functions:submitSurveyResponse
```

## Deploy community voting callables and schedule

```bash
npx firebase-tools deploy --only functions:submitCommunityNomination,functions:submitCommunityBallot,functions:getCommunityVoteResults,functions:notifyPresidentialVotingStarted
```

## Deploy Firestore indexes

```bash
npx firebase-tools deploy --only firestore:indexes
```

## Deploy university onboarding

Follow the full staged procedure in the university onboarding guide. The backend
Functions are:

```bash
npx firebase-tools deploy --only functions:searchUniversities,functions:getUniversity,functions:requestClubSetup,functions:verifyClubSetup,functions:syncUniversityCatalogDaily
```

The catalog search composite index must be ready before running the first production
synchronization.

Firebase deployments change shared backend behavior. Test rule changes against a development project or the Firebase Emulator Suite before applying them to a live environment.
