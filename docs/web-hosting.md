# Web hosting

Firebase Hosting serves the generated Expo web application from `dist/`. The
directory is intentionally ignored by Git and must not be edited by hand.

## Build and verify

Provide the required `EXPO_PUBLIC_*` environment variables from `.env.example`,
then run:

```sh
npm run hosting:build
```

This exports the static Expo Router application and verifies that the entry point
is the application rather than Firebase's setup placeholder. Expo also copies
`public/firebase-wrapper-app.html` and `public/firebase-wrapper-app.js` into the
output; that bridge must remain present for native Georgia Tech SSO redirects.

`EXPO_PUBLIC_API_KEY` and `EXPO_PUBLIC_APP_ID` are the native Firebase app values.
Hosting and Georgia Tech SSO require the separate Firebase Web App values in
`EXPO_PUBLIC_WEB_API_KEY` and `EXPO_PUBLIC_WEB_APP_ID`. An iOS- or
Android-restricted API key cannot initialize Firebase Auth in a browser. The build
fails before export when either web value is missing so a broken SSO bridge cannot
be deployed silently.

If the project does not have a Web App yet, register one in the
[Firebase console](https://firebase.google.com/docs/web/setup#register-app) or with
an authenticated Firebase CLI:

```sh
firebase apps:create WEB "Campus Cats Web" --project <production-project-id>
firebase apps:sdkconfig WEB <web-app-id> --project <production-project-id>
```

Copy the returned web `apiKey` and `appId` into the corresponding
`EXPO_PUBLIC_WEB_*` variables. Firebase documents these configuration values as
public identifiers; access to project data remains controlled by Authentication,
Security Rules, and App Check.

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
