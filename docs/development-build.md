# Development build

The development and preview EAS profiles are isolated from the App Store app.
They use a different app identity and a different Firebase project.

| Setting            | Development                 | Production              |
| ------------------ | --------------------------- | ----------------------- |
| App name           | Campus Cats Dev             | Campus Cats             |
| iOS bundle ID      | `com.gatech.CampusCats.dev` | `com.gatech.CampusCats` |
| Firebase project   | `campus-cats-development`   | `campuscats-d7a5e`      |
| Firebase CLI alias | `dev`                       | `prod`                  |

## Development data

The active Development project is a complete clone of Production Authentication,
Firestore, and Storage. The clone retains user UIDs and password hashes so existing
accounts can sign in, then overlays a development-only 30-day trial on Campus Cats.
It does not deploy billing or messaging Functions.

Do not run the minimal seeder against a full clone. It intentionally refuses cloned
Stripe-backed billing state and is only for rebuilding a small, empty test project.

### Full-clone trial overlay

After refreshing Development from Production, preview the development-only access
overlay:

```sh
npm run admin:overlay-development-trial --prefix functions -- \
  --project campus-cats-development
```

If the dry run names only **Campus Cats Development**, apply it:

```sh
npm run admin:overlay-development-trial --prefix functions -- \
  --project campus-cats-development \
  --apply
```

This updates only `clubs/campus-cats` and its public access projection with a new
30-day simulated trial. It preserves cloned users and private records, does not read
or write `billing-accounts`, and cannot call Stripe or send email. The command rejects
every project except `campus-cats-development` before accessing Firebase.

### Minimal empty-project seed

1. In **Campus Cats Development**, create the Firestore database and enable
   Email/Password Authentication.
2. In Firebase Authentication, create the test account you want to use as the
   development President. The seeder deliberately does not create a password or
   send an invitation email.
3. Authenticate the Firebase Admin SDK with Application Default Credentials:

   ```sh
   gcloud auth application-default login
   ```

   If `gcloud` is not installed, generate a private key from **Project
   settings → Service accounts** in the development project, keep the JSON file
   outside this repository, and provide its absolute path only for the seed
   command:

   ```sh
   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/campus-cats-development-service-account.json
   ```

   Never generate or use a production service-account key for this command.

4. Preview the seed without writing, replacing the example address with the
   test account from step 2:

   ```sh
   npm run admin:seed-development --prefix functions -- \
     --project campus-cats-development \
     --president-email developer@example.com
   ```

5. If the dry run names the correct account and project, apply it:

   ```sh
   npm run admin:seed-development --prefix functions -- \
     --project campus-cats-development \
     --president-email developer@example.com \
     --apply
   ```

The command creates the Georgia Tech university record, its `campus-cats` club,
the President profile, app settings, and an access projection that expires with
the trial 30 days from the command. It writes no Stripe customer, subscription,
payment, or invoice identifiers. It refuses every project except
`campus-cats-development`, and refuses to overwrite existing Stripe-backed
billing state.

Development builds query the cloned university catalog through the read-only
`searchUniversities` and `getUniversity` callables. The development adapter delegates
only search and restoration to those callables; club setup and verification remain
disabled so development cannot send onboarding emails.

Development builds replace the Stripe billing port with a read-only access
observer. Every setup, payment, invoice, billing-email, cancellation, and portal
operation fails locally before it can call Firebase. Outbound announcement,
whitelist-provisioning, credential-email, and Firebase password-reset email paths
are disabled as well. Existing cloned accounts can still sign in with their current
credentials.

Deploy the database and storage rules plus only the two read-only university catalog
Functions needed by the mobile app:

```sh
npx firebase deploy --project dev \
  --only firestore:rules,firestore:indexes,storage,functions:catalog:searchUniversities,functions:catalog:getUniversity
```

Do not deploy `requestClubSetup`, `verifyClubSetup`, billing, or email Functions for
this development trial. The isolated `catalog` Functions codebase contains no
email, Stripe, onboarding, or secret-bound exports.

Development chat reads directly from Firestore and reserves mutations for five
callable Functions. Enable it without deploying the rest of the main Functions
codebase:

```sh
npx firebase deploy --project dev --config firebase.development.json \
  --only firestore:rules,firestore:indexes,functions:chat
```

Ordinary chat messages remain inside the development Firebase project. An officer
club ping can send a push notification, but only to device tokens registered by
users in that development project. The isolated `chat` Functions codebase contains
only those five secret-free callables; never bulk-deploy the `campuscats` codebase
to enable chat.

## Build and install the iOS development app

1. Confirm the Firebase project shown in the console is **Campus Cats Development**.
2. Pull the development client configuration from EAS for local Metro sessions.
   On a new checkout, first create the ignored local file from the safe template:

   ```sh
   cp .env.development.example .env.development
   ```

   Then load that bootstrap configuration for the EAS command and replace it with
   the real development environment:

   ```sh
   (
     set -a
     . ./.env.development
     set +a
     npx --yes eas-cli@latest env:pull development --path .env.development
   )
   ```

   The subshell keeps the temporary template values out of your current terminal.

   The downloaded `.env.development` is ignored by Git. If you are setting up a
   new machine, also download the Apple configuration from **Firebase Console →
   Project settings → Your apps**, name it `GoogleService-Info.development.plist`,
   and place it at the repository root. That local plist is ignored too.

3. From the repository root, run:

   ```sh
   npx --yes eas-cli@latest build --profile development --platform ios
   ```

   EAS supplies the Firebase client values from its `development` environment and
   injects the Apple configuration through the `GOOGLE_SERVICES_PLIST` file
   variable. The plist in the repository root is only the local fallback.

4. Follow the EAS prompt to register the test device if it is not already registered.
5. Install the resulting internal build using the link or QR code from EAS.
6. The installed app must appear as **Campus Cats Dev**. It can coexist with the
   production App Store app because its bundle ID ends in `.dev`.
7. Start the development server for that build with:

   ```sh
   npx expo start
   ```

   The ignored `.env.development` file supplies the development Firebase client
   identifiers to Metro. The `npm run start:dev` shortcut is also available when
   you want to force Expo's development-client target explicitly.

## Safety rules

- Use only the `development` or `preview` EAS profile for testing.
- Never run a Firebase deployment without an explicit project alias. Use
  `npx firebase deploy --project dev` for development.
- Do not deploy functions to `prod` while testing.
- The development project has the read-only university catalog Functions and the
  explicitly listed chat Functions. It has no deployed email or billing Functions,
  so the development app cannot send club emails or create Stripe subscriptions.
- Firebase client identifiers are stored in EAS instead of source control. They
  remain public in the compiled mobile app and are not server credentials. Stripe,
  SendGrid, and Firebase Admin secret keys must never use an `EXPO_PUBLIC_` name or
  be added to the app configuration.

One required `EXPO_PUBLIC_APP_ENV` value controls both the app identity and
Firebase validation. The application refuses to build or start when the project
ID, auth domain, storage bucket, sender ID, or app IDs do not belong to the
selected environment. Native startup also verifies the installed bundle ID, so a
development client refuses a production Firebase bundle (and the production app
refuses a development bundle).
