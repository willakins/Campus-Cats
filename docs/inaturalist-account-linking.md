# iNaturalist account linking

## Decision

This is possible without giving iNaturalist credentials to Campus Cats or keeping an
iNaturalist access token. The recommended design uses iNaturalist OAuth once to prove
that the signed-in Campus Cats member controls an iNaturalist account, stores only the
verified numeric iNaturalist user ID and public profile metadata, and joins imported
observations to that ID.

The first version should associate only observations already imported from the
[Georgia Tech Cat Sightings project](inaturalist-import.md). It should not import every
observation made by the linked user. The existing public project synchronization can
remain unauthenticated.

## Why the current data is ready for this

The importer already requests each observation's user `id`, `login`, and name, stores
them in `ObservationImport.observer`, and exposes them on
`InaturalistSightingRecord`. See
[`functions/src/inaturalist.ts`](../functions/src/inaturalist.ts) and
[`core/domain/inaturalist.ts`](../core/domain/inaturalist.ts). The numeric observer ID
is the stable join key; a login is display metadata and may change.

The current observation query is already limited to iNaturalist project `149475` and
uses the v2 observations endpoint. The official v2 schema says `user_id` may also
filter observations by user ID or login, but account linking does not need another
per-user query because every imported result already includes its observer ID. See the
[official v2 OpenAPI document](https://api.inaturalist.org/v2/api-docs) and
[iNaturalist's API recommended practices](https://www.inaturalist.org/pages/api%2Brecommended%2Bpractices).

## Current iNaturalist OAuth behavior

As of August 2026, iNaturalist is an OAuth 2 provider supporting Authorization Code
and PKCE. Its documentation specifically recommends PKCE for mobile or client-side
applications that cannot protect a client secret. An iNaturalist OAuth application
must be registered with a functioning redirect URI. See the
[official authentication documentation](https://www.inaturalist.org/pages/api%2Breference#auth)
and [application registration](https://www.inaturalist.org/oauth/applications/new).

The relevant endpoints are:

| Purpose                         | Endpoint                                                                | Important input                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization                   | `GET https://www.inaturalist.org/oauth/authorize`                       | `response_type=code`, `client_id`, exact `redirect_uri`, `scope=login`, random `state`, PKCE `code_challenge`, and `code_challenge_method=S256` |
| Code exchange                   | `POST https://www.inaturalist.org/oauth/token`                          | Form-encoded `grant_type=authorization_code`, `client_id`, server-held `client_secret`, `redirect_uri`, `code`, and PKCE `code_verifier`        |
| Convert OAuth token to API JWT  | `GET https://www.inaturalist.org/users/api_token`                       | OAuth token in `Authorization: Bearer ...`                                                                                                      |
| Verify account identity         | `GET https://api.inaturalist.org/v2/users/me?fields=id,login,name,icon` | API JWT in the `Authorization` header                                                                                                           |
| Revoke the one-time OAuth token | `POST https://www.inaturalist.org/oauth/revoke`                         | Token plus the registered client credentials required by the provider                                                                           |

iNaturalist mounts the OAuth routes in its
[official Rails source](https://github.com/inaturalist/inaturalist/blob/d25945feb9fb49145d0f0245a541fc2d130e7037/config/routes.rb#L118-L125),
and its own OAuth application screen constructs authorization-code and PKCE requests
with these parameters in
[`show.html.haml`](https://github.com/inaturalist/inaturalist/blob/d25945feb9fb49145d0f0245a541fc2d130e7037/app/views/oauth_applications/show.html.haml#L36-L41).
The `/users/api_token` implementation binds the JWT to the authenticated iNaturalist
user and OAuth application in
[`users_controller.rb`](https://github.com/inaturalist/inaturalist/blob/d25945feb9fb49145d0f0245a541fc2d130e7037/app/controllers/users_controller.rb#L872-L880).
The v2 OpenAPI document describes `/users/me` as fetching the logged-in user and
requiring a user JWT.

Request only the `login` scope. iNaturalist describes `login` as access to information
needed to identify a user, while `write` permits posting content. Its current provider
configuration declares both scopes, so omitting an explicit scope could grant more
than this feature needs. See the
[scope and bearer-token configuration](https://github.com/inaturalist/inaturalist/blob/d25945feb9fb49145d0f0245a541fc2d130e7037/config/initializers/doorkeeper.rb#L53-L67)
and the `AuthorizedApplication` schema in the
[official v2 OpenAPI document](https://api.inaturalist.org/v2/api-docs).

Token minimization is important: the current iNaturalist server source configures
OAuth access tokens with no expiry and does not enable refresh tokens. The derived API
JWT expires after 24 hours. See the
[current OAuth token configuration](https://github.com/inaturalist/inaturalist/blob/d25945feb9fb49145d0f0245a541fc2d130e7037/config/initializers/doorkeeper.rb#L36-L45)
and [official authentication practices](https://www.inaturalist.org/pages/api%2Brecommended%2Bpractices#authentication).
Campus Cats therefore should revoke and discard the OAuth token immediately after
identity verification and never persist either token.

Before release, exercise revocation with a non-production iNaturalist application.
The live source exposes `/oauth/revoke` and also supports revoking an entire authorized
application; the latter revokes its tokens and grants in
[`oauth_authorized_applications_controller.rb`](https://github.com/inaturalist/inaturalist/blob/d25945feb9fb49145d0f0245a541fc2d130e7037/app/controllers/oauth_authorized_applications_controller.rb#L8-L23).

## Recommended flow for this repository

Use a server-mediated Authorization Code flow. PKCE-only in the Expo client is
possible, but it would deliver a long-lived OAuth bearer token to the phone before the
backend could verify it. The server-mediated flow keeps the client secret, code
verifier, authorization code, OAuth token, and API JWT out of application storage.

1. Add an authenticated callable `beginInaturalistAccountLink`. It verifies that the
   Firebase user exists and is active, generates at least 32 random bytes for `state`
   and a PKCE verifier, and stores a server-only pending attempt with the Firebase UID,
   verifier, creation time, expiration time of about ten minutes, and unused status.
   Store the hash of `state` as the document key rather than the raw state.
2. Return an authorization URL using `scope=login`, the S256 challenge, and an HTTPS
   callback owned by Campus Cats, for example
   `https://<hosting-domain>/oauth/inaturalist/callback`. Register this exact HTTPS URL
   in the iNaturalist application. A Firebase Hosting rewrite to an `onRequest`
   function gives it a stable provider-facing URL.
3. Open the authorization URL with Expo's system authentication browser. Expo explains
   that the provider redirect must be allowlisted, secrets must not be embedded in app
   code, and the app needs a built scheme for native return. See
   [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/) and
   [Expo linking](https://docs.expo.dev/linking/into-other-apps/#create-urls).
4. iNaturalist redirects the authorization code to the HTTPS Function, not directly
   to a custom application scheme. The Function hashes and validates `state`, checks
   that the attempt is unused and unexpired, and atomically claims it before exchanging
   the code. It must never accept a Firebase UID from callback query parameters.
5. The Function exchanges the code using the server-held client secret and PKCE
   verifier, obtains an iNaturalist API JWT, and calls `/v2/users/me`. It accepts the
   link only if the response contains exactly one valid user with a positive numeric ID
   and non-empty login. It does not trust an ID or login reported by the Expo client.
6. Revoke the OAuth token, then transactionally create the account mappings. If token
   revocation or identity verification fails, do not create a link. Never include the
   authorization code or either token in application logs or error messages.
7. Redirect the browser to
   `campuscats://settings/inaturalist-account?attempt=<opaque-attempt-id>`. The final
   deep link contains no provider code, token, iNaturalist ID, or Firebase UID. The app
   then calls an authenticated status callable and renders success or a generic error.
8. On later reads, join `observation.observer.id` to the server-managed public mapping
   and then load the existing Campus Cats public profile. This automatically associates
   historical and future imported project observations without rewriting every
   observation.

The repo already defines `campuscats` as its app scheme and uses
`expo-web-browser` plus `Linking.createURL` for Georgia Tech SAML in
[`app.json`](../app.json) and
[`ExpoSamlCredentialProvider.ts`](../adapters/firebase/ExpoSamlCredentialProvider.ts).
Expo notes that a stable custom scheme requires a development or production build,
not Expo Go, and that changing the scheme requires rebuilding the native app. The HTTPS
iNaturalist callback avoids registering an unstable Expo Go URL and reduces custom
scheme interception risk; the custom scheme carries only the final opaque result.

The callable boundary fits the existing v2 Firebase Functions architecture. Callable
requests automatically carry and validate Firebase Authentication tokens, and can
also carry App Check tokens. See
[Firebase callable Functions](https://firebase.google.com/docs/functions/callable).
Use `enforceAppCheck` when App Check is deployed for the native clients, but do not
apply it to the public OAuth callback because iNaturalist, not the app, invokes that
URL. Put the OAuth client secret in Google Secret Manager with `defineSecret`, as
recommended by
[Firebase's secret configuration guidance](https://firebase.google.com/docs/functions/config-env#store-and-access-sensitive-configuration-information).

## Storage model and authorization

Use separate private ownership data and member-visible attribution data:

```text
inaturalist-link-attempts/{sha256(state)}
  firebaseUid, codeVerifier, createdAt, expiresAt, status

inaturalist-account-links/{firebaseUid}
  inaturalistUserId, login, linkedAt, verifiedAt

inaturalist-public-links/{inaturalistUserId}
  userId, login, linkedAt
```

- Deny all direct client reads and writes to pending attempts and private account
  links. Return the current member's sanitized status through an authenticated callable.
- Allow active members to read public links, but deny every direct client write. The
  numeric document ID gives the observation reader an efficient reverse join.
- In one Firestore transaction, read the member's existing forward link and the target
  numeric reverse link, reject a target already owned by another Firebase UID, remove
  the member's old reverse link when changing accounts, and write both new documents.
  Firestore guarantees that transaction writes apply atomically and retries concurrent
  conflicts; see [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).
- Put an `expiresAt` timestamp on pending attempts and enable a Firestore TTL policy for
  cleanup. The handler must still reject expired attempts because TTL cleanup is not
  immediate; see [Firestore TTL behavior](https://firebase.google.com/docs/firestore/ttl).
- Keep the iNaturalist numeric ID canonical. Refresh the login and other public display
  fields during a successful re-link or normal public sync so username changes do not
  break ownership.

Do not put the link on `users/{uid}` through a client update, do not match by email, and
do not accept a typed iNaturalist username as proof. Firestore rules can authorize a
Firebase user, but only a backend call to iNaturalist with OAuth proof can establish
control of the external account.

## User experience and privacy

The link screen should explain before consent that linking will associate the member's
Campus Cats profile with their existing and future public observations imported from
the Georgia Tech project. Display the verified iNaturalist login and a profile link
after linking.

An `unlinkInaturalistAccount` callable should be authenticated and idempotent. It
transactionally deletes both forward and reverse/public mappings only when they still
refer to the requesting Firebase UID. Because no token is retained and the one-time
token was revoked during linking, unlinking needs no iNaturalist credential. Existing
observation records remain in Campus Cats with their original iNaturalist observer
attribution, licensing, and source URL, but the Campus Cats profile association
disappears immediately.

If immediate revocation cannot be validated against a test iNaturalist app, do not ship
with a retained token as a workaround. Keep requesting only `login`, discard the token,
make the residual authorization clear, and link users to iNaturalist's
[Authorized Applications page](https://www.inaturalist.org/oauth/authorized_applications)
until revocation is proven.

## Threat model

| Threat                                                    | Required control                                                                                                                                                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A member types another person's username                  | Ignore client-supplied identity; accept only `/users/me` returned for the OAuth grant.                                                                                                                                                   |
| CSRF or OAuth login mix-up                                | High-entropy, single-use, expiring `state` bound server-side to the initiating Firebase UID.                                                                                                                                             |
| Authorization-code interception or replay                 | Registered HTTPS callback, PKCE S256, server-held verifier and secret, atomic single-use attempt.                                                                                                                                        |
| Mobile app decompilation                                  | No iNaturalist client secret in Expo code or public environment variables.                                                                                                                                                               |
| Token disclosure                                          | `login` scope only; no client, Firestore, Analytics, Crashlytics, logs, or redirect storage; revoke before committing; restrict platform log access and retention because the provider callback necessarily receives a short-lived code. |
| One iNaturalist account linked to multiple members        | Deterministic reverse document keyed by numeric iNaturalist ID and an atomic uniqueness transaction.                                                                                                                                     |
| Username change or lookalike username                     | Match only the positive numeric observer ID; treat login as mutable presentation data.                                                                                                                                                   |
| Stale link after unlink, ban, or account removal          | Delete/disable the public reverse mapping transactionally; do not denormalize Campus Cats UID into every imported observation.                                                                                                           |
| Revealing club membership through public iNaturalist data | Explicit opt-in copy, active-member-only mapping reads, and immediate unlink. Never expose the private forward mapping publicly.                                                                                                         |
| Callback abuse or resource exhaustion                     | Short expiry, one attempt per active user, attempt rate limits, bounded response sizes/timeouts, App Check on callable initiation, and generic callback errors.                                                                          |

OAuth `state` is the standard CSRF binding and PKCE binds an intercepted code to the
initiating client; see
[OAuth 2.0 CSRF guidance](https://www.rfc-editor.org/rfc/rfc6749#section-10.12) and
[PKCE](https://www.rfc-editor.org/rfc/rfc7636).

## Verification plan

Before implementation is considered complete:

1. Create separate development and production iNaturalist applications, each with an
   exact HTTPS callback, and verify that requesting only `login`, S256 PKCE, token
   exchange, `/users/api_token`, `/v2/users/me`, and `/oauth/revoke` work as expected.
2. Unit-test begin, callback, status, and unlink handlers with injected HTTP and random
   dependencies. Cover wrong/expired/replayed state, invalid identity payloads, provider
   timeouts, revocation failure, and generic error responses.
3. Emulator-test the one-to-one transaction, concurrent attempts, relinking, unlinking,
   banned users, and Firestore rules that deny all direct writes.
4. Add importer/composition tests proving that numeric observer IDs, not logins, drive
   links and that unlinking changes attribution without rewriting observations.
5. Test the full browser return in iOS and Android development builds, plus the web
   fallback page. Confirm no code, token, verifier, or client secret appears in app
   state, Firestore documents, Function application logs, analytics, or error reports.
6. Add operational monitoring for provider errors and duplicate-link conflicts using
   redacted identifiers only, and document manual account-recovery ownership checks for
   the rare case where a user loses access to a previously linked Campus Cats account.

## Deployment setup

The application and Functions implementation use these Firebase parameters:

- `INATURALIST_OAUTH_CLIENT_ID`: the public OAuth application ID.
- `INATURALIST_OAUTH_REDIRECT_URI`: the exact hosted callback, such as
  `https://<hosting-domain>/oauth/inaturalist/callback`.
- `INATURALIST_APP_RETURN_URI`: the development-build return URL. It defaults to
  `campuscats://settings/inaturalist-account`.
- `INATURALIST_OAUTH_CLIENT_SECRET`: the private OAuth secret. Configure this only with
  `firebase functions:secrets:set INATURALIST_OAUTH_CLIENT_SECRET`; never put it in an
  Expo public environment variable or commit it to the repository.

Register the exact HTTPS callback in the matching iNaturalist OAuth application before
deploying. Use separate iNaturalist applications and Firebase parameter values for
development and production. Deploy the Functions, Firestore rules, and Hosting rewrite
together so the callback is live when account linking becomes visible.

Enable a Firestore TTL policy for the `expiresAt` field in the
`inaturalist-link-attempts` collection group. The Function still enforces the ten-minute
expiry itself; TTL is only asynchronous cleanup.

Before enabling the feature for members, perform one real development-build flow and
confirm that the iNaturalist application shows only the `login` permission and that its
one-time OAuth token is revoked. Expo Go cannot validate the stable `campuscats` return
scheme; use an iOS or Android development build.
