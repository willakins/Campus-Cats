# Campus Cats child safety response procedure

This is the operator procedure for the safety-reporting implementation. It is not
evidence that an operator has adopted it, that production has been deployed, or
that an Android build has passed verification. Complete the activation steps
before making the Play Console child safety declarations.

## Activate before release

1. Assign a primary child safety contact and a backup who can review reports,
   remove content, restrict accounts, and handle authority reporting. Confirm they
   can receive mail at `supportEmail` in `config/platformInfo.json` (currently
   `willakins23@gmail.com`). Define and document their monitoring schedule and
   escalation coverage outside that schedule. The app promises no response time.
2. Give designated reviewers an existing authenticated account with
   `users/{uid}.platformAdmin: true`, using a trusted infrastructure administrator.
   An officer, president, or role 4 account alone is insufficient. Do not grant this
   flag through client code. Minimize Firebase console/IAM access; those operators
   can also access case data. Verify removal of the flag revokes inbox access.
3. Confirm the existing `SENDGRID_API_KEY` secret and verified
   `INVITATION_FROM_EMAIL` sender work in the target project. Notification recipient
   is the platform support email; club contacts do not receive reports.
4. Deploy the new functions in the `campuscats` codebase:
   `submitSafetyReport`, `listSafetyReports`, `updateSafetyReport`,
   `moderateSafetyReport`, and `notifySafetyReport`. Deploy Firestore rules and the
   `safety-reports` status/creation-time index. Wait for the index to finish building.
   Deploy the production web export and publish a new Android build containing the
   reporting routes. None of these actions is implied by a local build.
5. In a private browser, verify the public HTML page at
   `https://campuscats-d7a5e.web.app/legal/child-safety` without signing in. This is the
   intended Play Console Safety standards URL **after deployment**. Verify its
   report button and privacy link. Do not submit a PDF or a restricted document.
6. From the installed Android release, submit a harmless test report as a normal
   member, retain the receipt, verify it appears in the private inbox, and verify
   the contact receives the notification. Repeat after temporarily losing network
   access: retrying unchanged details should create only one report. Check the
   signed-out email fallback, including a device without a configured mail app.
   Never use real abusive material for testing.
7. Verify the inbox at `/safety/inbox` with a designated administrator. Verify an
   ordinary member and club officer cannot read reports or update cases. Exercise
   review/close/reopen and the two enforcement actions on disposable test records.
   Reporting is also available from the subscription screen and terms gate.
8. Establish the actual authority reporting and preservation process with qualified
   advice for the jurisdictions where Campus Cats operates. Prepare the appropriate
   NCMEC/provider or regional reporting channel and access credentials. Record who
   can submit, what evidence may lawfully be retained, applicable deadlines, and
   how receipts are retained. An inbox status change does not submit a report to
   any authority.
9. Adopt a documented retention schedule for reports, case histories, and quota
   records. Review closed cases, minimize reporter details, and delete records when
   no investigation or legal purpose requires retention. Apply legal holds before
   deletion when necessary. There is no automatic case expiry in this release.
10. Only after these steps, review the public policy commitments and certify the
    corresponding Play Console statements. Reconcile the new user-submitted safety
    data with the store privacy disclosures and Data safety form.

## Receive and triage

- Check both the safety inbox and the monitored email address on the assigned
  schedule. The inbox defaults to Open; also check Reviewing cases for follow-up.
  Use pagination so older cases are not overlooked. Email reports need the same
  restricted case process even if they were not submitted through the form.
- In-app reports are stored in the global `safety-reports` collection. Authenticated
  accounts can submit without an active subscription or accepted current terms.
  Banned, deleted, or signed-out users can email the contact. The form is text-only,
  bounded to 3,000 description characters and 500 reference characters, with five
  new reports per account per hour. Retrying the same submission is idempotent.
- `notifySafetyReport` sends only a case reference and an authenticated inbox link.
  It does not send the description, reference URL, or reporter identity. Delivery
  retries on failure and may produce duplicate notifications. Receipt confirmation
  means the report was stored, not that an email was read or a person reviewed it.
  Inspect cases with `notificationState: pending`, function delivery failures, and
  SendGrid delivery/bounce events. Repair configuration and replay the failed event
  when appropriate; the private inbox remains the source of truth. Configure alerting
  for failed delivery and overdue reviews before launch.
- Record a case note when beginning review. Treat imminent danger as urgent and
  escalate through appropriate emergency channels. Do not ask reporters to obtain,
  download, or resend sexual images of children. Do not copy report contents into
  general chat, ordinary tickets, analytics, or screenshots.

## Investigate and restrict access

1. Identify the referenced account/content using existing IDs, timestamps, and club
   information. Treat links and user descriptions as untrusted; the inbox displays
   them as text and does not automatically fetch or preview them. Use restricted
   operator tooling and the adopted evidence-handling process.
2. Preserve only the information needed and lawfully permitted before removal.
   Report references and case notes do not automatically preserve the original
   content. Do not download or redistribute suspected CSAM into ordinary local
   files, email, chat, or this repository. Follow the approved authority/legal
   process for evidence preservation.
3. Use the inbox **Remove chat message** action after confirming the club and
   message IDs. It replaces the message body and removes club-ping status. It
   retains the message ID/day grouping. Previously delivered notifications,
   screenshots, exports, or offline client caches cannot be recalled by this action.
4. Use **Restrict account** after verifying the user ID. This sets the live banned
   flag, including for officers/presidents, and revokes authentication sessions.
   If session revocation fails, the database ban remains effective; retry the action
   and investigate the failure. Self-restriction and restriction of another platform
   administrator are deliberately blocked: a separate trusted infrastructure
   administrator must remove privileged access and disable that Auth account.
   Restricting an account does not remove its past content. A president restriction
   may also require a trusted administrator to arrange club leadership recovery.
5. Use the existing authorized removal workflows for comments, sightings, catalog
   entries, alerts, and other supported content. Existing club tools require the
   relevant club membership/role; platform administrator status alone is not a
   universal content-access override. For unsupported content types or inaccessible
   clubs, use a designated infrastructure administrator. The inbox's removal action
   covers chat only. Do not close a case while harmful content remains accessible.
6. For media, ensure both the content record and the referenced Storage object are
   removed or access is disabled; removing a database reference alone does not
   invalidate a previously shared tokenized download URL. Check derivatives,
   thumbnails, copies, and imported source content. Source removal may also require
   contacting the upstream provider. Verify access using the previously recorded
   reference without redistributing the material.

## Report, document, and close

- Report confirmed CSAM to NCMEC or the relevant regional authority according to
  applicable law and the adopted provider process. Public NCMEC information is at
  [CyberTipline](https://www.missingkids.org/gethelpnow/cybertipline). Do not treat
  this document or a closed case as proof that a required report was made.
- Record the investigation outcome, content restrictions, account action, authority
  report reference/receipt when applicable, reviewer, and required follow-up in the
  private case record. Do not paste illegal content into the notes. Where a report
  does not establish a violation, record the reason without making unsupported
  accusations against the reported user.
- Save a review with a note and close the case only after the required actions and
  follow-up are complete. The server rejects a stale review revision; refresh to
  avoid overwriting another reviewer. Reopen when new information requires review.
  Review and enforcement events are appended under
  `safety-reports/{id}/history`; the inbox shows the latest review note. Full history
  is available only to authorized infrastructure operators in Firestore.
- Respond to the reporter through the monitored contact when appropriate, using the
  case reference and disclosing only what is safe and appropriate. Do not promise
  confidentiality against lawful authority requests or disclose another user's
  private information unnecessarily.
- Periodically review open cases, access grants, delivery failures, response
  coverage, retention/holds, and the accuracy of the public standards.

Google policy references:
[Child Safety Standards](https://support.google.com/googleplay/android-developer/answer/14747720)
and [Child Endangerment](https://support.google.com/googleplay/android-developer/answer/9878809).
