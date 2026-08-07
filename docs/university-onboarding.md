# University onboarding operations

This guide covers the College Scorecard catalog, first-launch discovery, verified club
provisioning, and Georgia Tech mapping. Only maintainers with authorized Firebase and
SendGrid access should run the production commands.

## Runtime design

The U.S. Department of Education [College Scorecard API](https://collegescorecard.ed.gov/data/api-documentation/)
is the institution source of truth. `syncUniversityCatalogDaily` requests operating
institutions in 100-school pages every day at 03:00 America/New_York. The sync stores a
bounded search projection in Firestore so the app remains searchable if Scorecard is
temporarily unavailable. An incomplete or malformed pagination response fails the run
before missing schools can be marked inactive.

The app searches after two normalized characters and can only save a returned
Scorecard ID. A signed-out mapped selection activates public club branding. An
authenticated profile's `clubId` always wins over a stale device selection. Unmapped
schools stay on the neutral theme until the setup form builds local light and dark
previews.

## Server-managed collections

| Collection                             | Purpose                                                                                                        | Direct client access |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------- |
| `universities/{scorecardId}`           | Name, location, website domain, inferred timezone, active flag, aliases, approved domains, and search prefixes | Denied               |
| `university-overrides/{scorecardId}`   | Maintainer aliases and approved-domain corrections preserved across syncs                                      | Denied               |
| `university-clubs/{scorecardId}`       | Unique club mapping and public login metadata returned by callables                                            | Denied               |
| `university-club-claims/{scorecardId}` | Transactional pending/provisioned claim ownership                                                              | Denied               |
| `club-onboarding-requests/{requestId}` | Hashed verification token, setup draft, state, and expiry                                                      | Denied               |
| `club-onboarding-rate-limits/{bucket}` | Hashed IP-hour and email-day counters                                                                          | Denied               |

The raw verification token only appears in the HTTPS email link. Firestore stores its
SHA-256 digest. Setup requests expire after 24 hours. The repository permits at most
five requests per IP per hour and three per President email per day.

Configure Firestore TTL policies on `expiresAt` for
`club-onboarding-requests` and `club-onboarding-rate-limits`. A TTL policy may also be
used for `university-club-claims`: expired pending claims are already ignored
transactionally, while a permanent `university-clubs` mapping protects provisioned
clubs if an old claim is eventually removed.

## Configuration

Create the server-held secret:

```bash
npx firebase-tools functions:secrets:set COLLEGE_SCORECARD_API_KEY
```

`SENDGRID_API_KEY` must also be configured. Set these Functions parameters in the
target environment (the production origin is the default shown in
`functions/.env.example`):

```text
CLUB_ONBOARDING_WEB_ORIGIN=https://campuscats-d7a5e.web.app
INVITATION_FROM_EMAIL=verified-sender@example.org
```

The onboarding verification link must use an HTTPS origin served by the Expo web app.
SendGrid must accept the configured sender before requests are enabled.

## Initial rollout

Use Node 22 and confirm the Firebase CLI project before every production step.

1. Install and test both workspaces.

   ```bash
   npm ci
   npm ci --prefix functions
   npm run quality
   npm run test:ci --prefix functions
   npm run emulator:exec
   ```

2. Configure the Scorecard and SendGrid secrets and the onboarding web origin.
3. Deploy Functions and the Firestore composite index. Wait until the index is ready.
4. Populate the catalog manually using Application Default Credentials:

   ```bash
   COLLEGE_SCORECARD_API_KEY=... npm run admin:sync-universities --prefix functions
   ```

5. Backfill Georgia Tech without changing any `clubs/campus-cats` content paths:

   ```bash
   npm run admin:seed-georgia-tech-university --prefix functions
   ```

6. Invoke `searchUniversities` for “Georgia Tech” and confirm Scorecard ID `139755`
   maps to `campus-cats`, `gatech.edu` is approved, and the existing SSO metadata is
   present.
7. Deploy Firestore rules, then the web/native clients. Never deploy the client first:
   it intentionally has no anonymous `campus-cats` fallback.

The protected manual sync command and the scheduler call the same service. A manual run
is appropriate after correcting overrides or recovering from a provider outage.

## Overrides and mapping maintenance

Write approved corrections only to `university-overrides/{scorecardId}`. Supported
fields are `aliases` and `emailDomains`; the next sync merges them over provider-derived
values. Use lowercase registrable email domains without `www.`. Exact domains and
subdomains are accepted for President verification.

Schools without coordinates or an approved email domain remain searchable but cannot
be claimed. Add a reviewed domain or location correction before retrying. Catalog
refreshes mark missing institutions inactive rather than deleting documents, and never
replace mappings.

Each university can have one `university-clubs` mapping. A manual mapping correction
must update that document and the corresponding `clubs/{clubId}.universityId` together
during a maintenance window. Do not move tenant subcollections as part of a mapping
correction.

## Verification and recovery

- If the initial President-verification email fails, the request is marked
  `email_failed` and its pending claim is released; the requester can submit again
  subject to throttles.
- Verification atomically leases a request before provisioning. Concurrent clicks get
  a generic already-processing response. A transient provisioning or password-email
  failure returns the request to `pending` but retains its university claim, so the same
  link can retry safely.
- Provisioning uses deterministic `club-{scorecardId}` identity and validates an
  existing club, President, and mapping before merging. It creates pending billing,
  access, profile, and public app-settings documents before sending the existing secure
  password-setup email.
- An expired request cannot be verified. Once its claim expiry has passed, a new setup
  request can take ownership. Remove abandoned request records only after confirming
  there is no `university-clubs` mapping.
- A completed link is idempotent while its request record remains present. The original
  requester discovers the new mapping with **Refresh setup status**.

If provisioning completed but email delivery is uncertain, first inspect the mapping,
club, President profile, request status, and SendGrid event log. Retry the same
verification link when the request is `pending`; do not create a second club or edit a
token hash.

## Monitoring

Alert on scheduled sync failures, pagination shortfalls, catalog age, callable latency,
setup request and verification error rates, throttle rejections, conflicting claims,
and SendGrid delivery failures. During rollout, verify that anonymous direct reads of
all six global collections remain denied and that only
`clubs/{selectedClubId}/app-settings/public` is readable for signed-out branding.
