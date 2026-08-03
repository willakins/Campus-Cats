# Firebase operations

These notes are intended for maintainers who already have authorized access to the Campus Cats Firebase project.

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
