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
authorization-rule matrix, and then stops the emulators. Java 21 and Node 22 are
required. Expected permission-denied logs are produced by negative authorization
assertions.

Run the pure callable behavior separately:

```bash
npm ci --prefix functions
npm run test:ci --prefix functions
```

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

## Deploy Firestore indexes

```bash
npx firebase-tools deploy --only firestore:indexes
```

Firebase deployments change shared backend behavior. Test rule changes against a development project or the Firebase Emulator Suite before applying them to a live environment.
