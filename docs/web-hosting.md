# Web hosting

Firebase Hosting serves the generated Expo web application from `dist/`. The
directory is intentionally ignored by Git and must not be edited by hand.

## Build and verify

Provide the required `EXPO_PUBLIC_*` environment variables, then run:

```sh
npm run hosting:build
```

This exports the static Expo Router application and verifies that the entry point
is the application rather than Firebase's setup placeholder. Expo also copies
`public/firebase-wrapper-app.html` into the output; that bridge must remain present
for native Georgia Tech SSO redirects.

To exercise the built site with the guarded demo project, run:

```sh
npm run hosting:serve
```

The Hosting configuration uses clean URLs for generated static routes and falls
back to the application entry point for client-side routes.

## Release

Do not deploy Hosting from a feature or refactor branch. After the change is merged
and the release is approved, build with the production public environment values
and deploy the Hosting target explicitly:

```sh
firebase deploy --only hosting --project <production-project-id>
```

Inspect the generated `dist/` artifact and confirm login plus the SAML redirect
bridge before deploying.
