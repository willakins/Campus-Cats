# Security review — October 5, 2026

Reviewed the working tree based on `cdc27f8`. This is a source review with local
regression tests, not a certification that the deployed system has no vulnerabilities.
No production data, configuration, or deployments were changed.

## Findings addressed

| Boundary                   | Finding                                                                                                                                                                      | Change                                                                                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted SAML sign-in        | A query-supplied callback could receive the SAML credential at an arbitrary site. The client did not correlate the return with its sign-in attempt.                          | Allow only the native sign-in route and the hosting project's HTTPS sign-in routes; bind the callback and Firebase configuration to session state; verify a random nonce and the exact return route in the client. Put credentials in a fragment, outside HTTPS request URLs. |
| Firestore content          | Sightings, catalog entries, stations, alerts, and contacts allowed missing, oversized, incorrectly typed, or unexpected fields. Several nested lists were only size-checked. | Validate complete records, bounded text, coordinates, enumerations, and safe link schemes in rules. Preserve author identity on officer edits. Validate survey questions, tag configuration, and contest options in authenticated callables; deny their direct client writes. |
| Callable input             | Membership applications, notifications, moderation text, and other handler inputs had inconsistent bounds.                                                                   | Apply string, length, control-character, email, and document-ID checks before persistence or provider calls. Validate all nested survey and contest text and tag labels.                                                                                                      |
| Membership applications    | Anonymous direct Firestore writes bypassed callable club verification and email deduplication.                                                                               | Require the submission callable, matching text limits, and transactional per-source and per-email quotas.                                                                                                                                                                     |
| iNaturalist administration | The shared officer check omitted banned-account status.                                                                                                                      | Reject banned officers for sync, moderation, catalog overrides, and links. Validate imported URLs before storing them and when decoding them.                                                                                                                                 |
| Storage uploads            | Broad `image/.*` accepted active SVG content; members could upload into another member's existing sighting folder.                                                           | Allow specific raster image MIME types and check the sighting contributor on creates and mutations when the sighting exists. Continue allowing an owner to upload before creating their sighting.                                                                             |
| Temporary passwords        | Password generation used predictable `Math.random` output.                                                                                                                   | Use cryptographic random bytes with rejection sampling; fail if secure randomness is unavailable.                                                                                                                                                                             |
| Invitation email           | An officer-supplied temporary password was interpolated into HTML.                                                                                                           | Send the password in a plain-text email. Password values remain opaque and are never trimmed or HTML-sanitized.                                                                                                                                                               |
| Billing return URLs        | The localhost exception accepted arbitrary schemes and localhost origins outside the configured app origin.                                                                  | Require HTTP only for configured localhost development, HTTPS otherwise, exact configured origin, and no URL credentials.                                                                                                                                                     |
| Hosting                    | Explicit browser hardening headers were absent.                                                                                                                              | Add `nosniff`, `no-referrer`, frame protection, and no-store caching for the SAML bridge.                                                                                                                                                                                     |

## Second authorization pass

The follow-up review found additional issues. Legacy authenticated callables relied
on the default token validation and profile lookups without checking revocation.
Several duplicated lookups allowed missing club documents and treated malformed
billing deadlines as absent. These checks differed from the newer relational
backend's authorization.

All 39 protected callable entry points now verify Firebase token revocation. Content,
community, and administrative operations also require a live, enabled account,
current terms consent, valid membership, and an accessible club. Missing clubs and
malformed enforced deadlines deny access. Billing recovery and account deletion
require a verified session but do not require club access or terms consent; their
existing role and ownership checks still apply. Disabled accounts cannot use these
self-service endpoints and need support assistance. Authentication errors remain
explicit errors instead of being converted to generic internal failures.

The iNaturalist account-link implementation also allowed an already-processing
callback to restore a link after unlinking, and did not recheck membership after the
provider round trip. Unlinking and starting a replacement attempt now invalidate
pending and processing attempts. Completion checks expiry and current membership
inside its Firestore transaction, and the handler rechecks membership before and
after provider calls. Ban/deletion cleanup happens after the membership restriction
is written. These linking handlers are currently not exported as deployed endpoints;
the fix protects that implementation before it is exposed.

Regression tests exercise all 39 exported protected callable handlers with a revoked
session, verify UID/project binding, and cover missing, banned, disabled, suspended,
and nonconsenting membership. Real Firestore emulator transactions cover unlink,
replacement, expiry, ban, deletion, and tenant-change scenarios. The separate core
and chat deployment bundles include the new shared modules and load successfully.

## Third pass: public applications and session revocation

The public application handler now consumes shared Firestore quotas before application
lookups or writes: 100 attempts per observed source address per hour and three per
normalized email per hour. Counts are updated transactionally across function
instances. Equivalent IPv4/mapped IPv6 spellings share a quota; missing addresses
share a fallback quota. Quota keys are hashes, and an `expiresAt` TTL policy is included
in `firestore.indexes.json`. Expired windows reset even before TTL cleanup runs.
The client cannot supply its rate-limit address in the request body.

The source-address helper uses the final Google-appended forwarding hop instead of
Express's first forwarded address, so prepending fabricated addresses does not create
fresh quotas. It is also used by club onboarding. Extra upstream proxies and campus
NATs share a quota; confirm the observed address and tune limits for registration
traffic before deployment. See Google's [request-header documentation](https://docs.cloud.google.com/functions/docs/reference/headers).
These application quotas do not prevent function invocation charges, distributed
abuse, or all denial-of-service attacks. App Check and infrastructure abuse controls
still need deployment verification.

A further revocation flaw was reproduced: clearing a member's ban let an old token
regain direct database and storage access. Bans now record a protected
`sessionRevokedAt` cutoff immediately, synchronize it with Firebase's token-revocation
time, and retain it through unbanning. Unbanning revokes sessions again before access
is restored, including for legacy bans that had no cutoff. Rules reject tokens whose
original authentication time is at or before the cutoff, including private profile
reads. The client clears its local session when the profile subscription is denied;
ordinary network errors do not sign it out. Fresh authentication after the cutoff is
required. Neither a client write nor an older retry can lower the cutoff.

The review also caught a gap in this review's earlier validators: coercing survey
question types and survey/contest audiences with `String(...)` accepted one-element
arrays. These fields now require actual supported string values. Regressions first
reproduced the acceptance and now confirm rejection before persistence.

## Fourth pass: concurrent permissions and deletion

Role changes previously checked the actor's permissions and the target's role before
entering the write transaction. A concurrent demotion, presidency transfer, or tenant
change could invalidate those checks. Role changes now revalidate both participants
inside the transaction, including actor membership, terms, and club access. Notices,
bans, and the transaction restoring membership after unbanning also recheck current
authority. Presidency transfers reject a banned or deleting successor.

Both self-service and managed deletion now reserve the operation transactionally.
The reservation rechecks the current account, protected President role, tenant, and
managing officer where applicable, then records a server-owned `deletionPending`
flag. Rules and callable authorization deny new membership operations while that
flag is set. Role changes and club provisioning cannot promote a deleting account;
provisioning checks the pending job even after the profile has been removed. It also
rejects banned or disabled accounts instead of silently clearing a ban.

Cleanup previously ignored individual BulkWriter promise failures: `close()` only
drains the queue and does not reject for failed writes. Cleanup now awaits every
write and leaves the job pending on failure, before deleting the Auth account.
Receipts and ownership records are deleted only after dependent cleanup succeeds,
preserving discovery of anonymous responses and ballots on retry. Version
preconditions prevent anonymization from overwriting concurrent moderation changes.

Regression tests invoke the exported callable handlers with real Firestore emulator
transactions and synthetic Auth/Storage failures. They cover concurrent demotion,
promotion, bans, tenant changes, terms withdrawal, club suspension, deletion locks,
individual cleanup failures, preservation of anonymous-response receipts, and retries
after the private profile has been removed. Separate rule tests reject reads, writes,
and uploads from deleting accounts even after fresh authentication.

Deletion spans Firestore, Storage, and Auth; it is not one atomic cross-service
operation. Pending jobs still require a callable retry or operator intervention;
there is no automatic retry worker. The normal client signs out when profile access
is denied, so recovery may require support. Already-running unrelated Admin SDK
writes are not universally serialized with deletion; a final reconciliation pass and
production recovery exercise remain necessary before claiming complete erasure.

## Stripe/payment isolation pass

The subsequent [Stripe/payment isolation review](stripe-security-review.md) traces
the UI, all eight billing handlers, private database records, Stripe object ownership,
and signed webhooks. It adds ownership checks and fixes stale billing state and
responses across account, club, and role changes. Billing remains club-owned: the
current President and Developer can manage their club's saved payment method and
invoices. Already-issued Stripe URLs remain usable outside the application until
Stripe expires them.

## Text and URL policy

Free text is plain Unicode text rendered through React/React Native text components.
The review found no application use of `dangerouslySetInnerHTML`, `innerHTML`, or
`eval`. Apostrophes, emoji, markup-looking text, tabs, and multiline notes are
preserved; unsupported control characters are rejected. Do not strip angle brackets
or HTML-encode persisted text. Validation and context-appropriate output handling
serve different purposes, as described in the
[OWASP input validation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html).

Names and titles are generally limited to 120 characters; long descriptions and
notes to 5,000; credits and known-cat notes to 1,000; comments to 300; chat to 1,000;
profiles and nomination pitches retain their existing limits. Membership application
names allow 200 characters. IDs are bounded single document segments. Contact URLs
allow HTTP/HTTPS with no credentials or invisible characters; donation and contest
image URLs require HTTPS. Common content forms advertise their limits through native
`maxLength` constraints as well as domain validation.

Passwords are passed unchanged to authentication. Authentication credentials and
email addresses follow their specific validation rules. Search and other read-only
text is passed as data to bounded queries, not interpolated SQL or executable code.
The staged PostgreSQL gateway has an operation allowlist, parameterized RPC requests,
live Firebase membership checks, tenant/project predicates, and restricted SQL grants.
The review did not identify a SQL-injection path in that gateway.

Firebase Admin writes bypass Firestore rules, so callable validation is required in
addition to client schemas. Firestore cannot iterate arbitrary nested lists, and
validating the full supported survey, tag, and contest sizes exceeded its expression
budget. These three writes therefore use server validators, preserving the existing
40-question/20-option, 50-tag, and 20-contest-option limits. See
[Firebase's field-validation documentation](https://firebase.google.com/docs/firestore/security/rules-fields).

Tag removal and its related assignment updates remain one atomic server batch.
Election creation retains its existing atomic reservation and authorization rules.
Protected callables verify token revocation and live membership, current terms,
account status, club access, and actor role. Client-supplied authors and creation times
are ignored for server-created surveys and contests.

## Verification

- Regression tests reproduce the original unsafe SAML callbacks and malformed text
  acceptance, then verify their rejection and ordinary Unicode input preservation.
- The final full app coverage run passes 938 tests in 142 suites. Three
  catalog-function tests passed in the earlier full app run. All 37 compiled
  Functions test files pass after the Stripe security pass. Checks also cover TypeScript,
  ESLint, documentation formatting, UI/platform guards, and hosting checks.
- All 103 tests in nine Firebase emulator suites pass using the synthetic
  `demo-campus-cats-test` project. A 15-second per-test timeout accommodates the
  existing Admin SDK account-link test's initial metadata lookup.
- The coverage gate was also checked on an untouched archive of `cdc27f8`: its 903
  app tests pass, but domain branch coverage is 88.29% and feature branch coverage is
  87.20%, below the repository's 90% requirement. The final security-branch coverage run
  passes all 938 tests and measures 88.55% and 87.20%, respectively; its coverage
  gate therefore remains below 90% as well.
- A pattern scan of tracked files found no private-key blocks, service-account JSON,
  or matching high-confidence Stripe, Supabase, AWS, or GitHub secret patterns. This
  was not a complete history or entropy-based secret audit.
- The available shell runtime is Node 26.10.0, not the repository's pinned Node
  22.23.2. Repeat the release checks with the pinned runtime in CI.

## Release and remaining verification

Deploy the new quota TTL field policy with the Firestore index configuration.
Deploy the new `createSurvey`, `saveCatalogTags`, and `createContest` Functions before
activating clients that call them. Coordinate the app, SAML bridge, and Firestore/
Storage rule rollout. Older clients' direct survey/tag/contest writes and old SAML
callbacks are intentionally rejected by the new boundaries. Require a compatible app
version or schedule the cutover; there is no fully compatible old-client fallback.

Check existing documents for values exceeding the new schema limits before rollout:
invalid legacy records can be excluded by decoders or rejected on edits. Test native
and hosted SSO end to end with the real identity provider, along with survey creation,
tag removal, contests, and billing return URLs. No real-provider tests or production
configuration inspection were performed here.

Dependency advisory checks remain pending: the sandbox could not reach npm, and
automatic approval review rejected the network escalation because `npm audit` sends
package metadata externally. User approval is required before retrying it. No clean
advisory result is claimed.

App Check deployment, public endpoint abuse/rate limits, Firebase/Google Cloud IAM,
provider authorized domains, secret rotation, and production logging/retention need
operational verification. Raster MIME validation is not an image-content scanner.
Firebase media download tokens are bearer URLs; rules do not revoke already-shared
URLs. These limits prevent a claim that all production security issues are eliminated.

The application ban/unban workflow now synchronizes revocation to Firestore and
Storage rules. Auth-console-only disable/revocation and password-reset revocations
are still not automatically mirrored to `sessionRevokedAt`. Incident response must
also restrict membership or synchronize that cutoff; these external Auth changes
cannot be assumed to invalidate already-issued tokens immediately at direct data
boundaries. Firebase documents [explicit revocation enforcement](https://firebase.google.com/docs/auth/admin/manage-sessions).
No production revocation exercise, proxy-chain inspection, or App Check enforcement
check was performed. These remain specific verification limits, not a clean security
sign-off.

During local verification, Firebase CLI debug logging included an inherited Sentry
token in tool output. Its value was redacted from the local test logs, and subsequent
emulator runs used a minimal environment without inherited credentials. The token
must be rotated; redacting local logs does not retract the earlier tool output. No
credential rotation was performed by this review.
