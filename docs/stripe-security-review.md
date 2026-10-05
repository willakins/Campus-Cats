# Stripe and payment isolation review — October 5, 2026

The reviewed working tree has no identified path for a member to retrieve another
club's billing information by changing UI routes or callable request parameters.
This conclusion covers local code and synthetic regression tests, not an inspection
of the deployed Firebase or Stripe accounts. The fixes described below are local and
have not been deployed.

## What access is intentional

Stripe customers represent **clubs**, not individual app users. The current
President (role 3) and Developer (role 4) may manage their own club's billing. They
can see invoice history, billing contact details, and the saved card's brand and
last four digits, including when a previous President supplied that card. Stripe's
portal may expose additional billing details according to its configuration.
This is not a per-payer privacy model. Other members and officers cannot use the
monetary billing endpoints.

The application uses Stripe-hosted Setup Checkout and the customer portal. The app
does not collect card numbers or CVCs, and the summary response uses a field
allowlist rather than returning raw Stripe objects. Stripe secret keys remain in
server-side secret configuration; the client-source scan found no matching embedded
Stripe secret-key or webhook-secret values.

## Three boundaries checked

| Boundary                                 | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI and session changes                   | Billing state is discarded when account, club, or role changes. Delayed responses cannot open an old account's payment link after unmount. A summary naming a different club is rejected.                                                                                                                                                                                                                                                                                                               |
| Server authorization and database access | All eight billing handlers derive identity from the verified Firebase session and club membership. Injected club/customer/subscription/invoice/payment-method/user IDs have no effect. Role 0–2, banned, deleting, missing, and unsigned accounts are denied. Firestore denies direct reads, lists, and writes of private Stripe records even to Presidents and Developers. Clients cannot change their own role or club. Existing callable tests also verify token revocation and UID/project binding. |
| Stripe object ownership and webhooks     | Interactive billing checks the Stripe customer's club metadata, verifies invoices/payment methods belong to that customer, and verifies subscriptions before changing them. Checkout completion checks purpose, setup mode, completion, SetupIntent success, and customer/payment-method ownership. Invoice and subscription events cannot use inconsistent metadata/customer references to change another club. Signature tests reject altered bodies and stale or invalid signatures.                 |

## Additional gaps fixed

1. The UI retained an old club's billing summary when the same user changed clubs,
   and a delayed payment action could open a previous account's link. Regression
   tests reproduced both behaviors before the fix.
2. Billing looked up stored Stripe IDs without checking the returned object's
   customer ownership. Synthetic misassociated records produced another customer's
   invoice or portal URL. These are now rejected. **This required incorrect
   server-side records; client requests and Firestore rules did not allow an app
   user to install those IDs.**
3. A Stripe lookup could return sensitive billing information after the acting
   President was demoted. Summary, invoice, setup, and portal responses now recheck
   current membership and the customer mapping before returning data or links.
4. Checkout and invoice webhook routing relied too heavily on metadata. The
   handlers now cross-check customer associations before changing billing records.
   Existing Stripe signature verification was already required; this was not a
   demonstrated unsigned-webhook bypass.

## Verification

- 33 billing-isolation emulator tests use real local Firestore membership records
  and a fake Stripe provider. They cover all eight handlers with foreign identifiers,
  permission restrictions, masked responses, corrupt references, webhook mismatches,
  and authorization changes during provider calls.
- Five additional rule cases exercise direct billing access and membership tampering
  by Members, Officers, Vice-Presidents, Presidents, and Developers.
- The full emulator suite passes 103 tests in nine suites. The billing route passes
  all 11 tests, including three new privacy regressions. All 37 compiled Functions
  test files pass, including legitimate subscription/trial workflows and signature
  validation.
- All 938 app tests pass, and TypeScript, ESLint, documentation formatting, and
  UI/platform/hosting checks pass. The existing coverage gate still fails: domain
  branches are 88.55% and feature branches 87.20%, below the required 90%. The
  baseline failure is documented in [the broader review](security-review.md).
- No live Stripe API requests, payment credentials, real cards, charges, or invoices
  were used. This does not substitute for testing the deployed integration with
  Stripe sandbox customers before release.

## Limits and deployment checks

An already-issued Stripe URL can be used outside Campus Cats. Portal sessions use
[temporary access links](https://docs.stripe.com/customer-management/integrate-customer-portal).
[Hosted invoice links](https://docs.stripe.com/invoicing/hosted-invoice-page) are
private URLs intended to be shared with invoice recipients and remain usable until
Stripe expires them. Campus Cats logout, demotion, or a client-side route guard does
not invalidate an already-issued Stripe link. Do not promise that a person who
previously received or copied such a link can never access its billing information.

Before deploying the ownership checks, verify that each existing Stripe customer
and subscription has the correct `metadata.clubId`, and that the Firestore customer,
subscription, and invoice IDs match. Customers created by this integration already
receive that metadata; malformed or manually imported legacy records now fail
closed and require repair. Do not remove the checks to make such records load.

The live Stripe portal configuration (including any shareable login page), enabled
features, API-key permissions, webhook destination/secret, and customer mappings
were not inspected. Stripe recommends authenticating customers before creating
portal sessions; this integration enforces that on the server. Once a session is
issued, Stripe controls its lifetime and features. See also the
[webhook signature guidance](https://docs.stripe.com/webhooks).

Dependency advisory scanning remains pending: automatic approval review rejected
the `npm audit` network escalation because it sends dependency metadata externally.
No clean dependency audit or live-environment security certification is claimed.
