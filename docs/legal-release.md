# Legal release checklist

Campus Cats ships the legal documents as public Expo Router pages. Production hosting
must keep these URLs available without authentication:

- Terms of Service: `https://campuscats-d7a5e.web.app/legal/terms`
- Privacy Policy: `https://campuscats-d7a5e.web.app/legal/privacy`
- Account deletion: `https://campuscats-d7a5e.web.app/legal/account-deletion`
- Child Safety Standards: `https://campuscats-d7a5e.web.app/legal/child-safety`

Before publishing a mobile release:

1. Have qualified counsel review the operator name, contact details, governing-law
   choice, billing terms, liability allocation, age threshold, and privacy disclosures.
2. Confirm the `supportEmail` in `config/platformInfo.json` is monitored and can receive
   verified privacy and deletion requests. After changing it, rebuild and redeploy the
   web and Cloud Functions artifacts and publish updated native or OTA clients so every
   user-facing and emailed contact reference changes together.
3. Build and deploy the production web export, then open all four URLs in a private
   browser window and verify they do not require a Campus Cats account.
4. Deploy `firestore.rules` and `storage.rules` with the app release. When the Terms
   change, update the version in `presentation/legal/termsAgreement.ts` and both rules files together so
   prior consent is rejected and the new acceptance can be stored.
5. Add the Privacy Policy URL to App Store Connect and Google Play Console.
6. Add the account-deletion URL to Google Play Console's Data safety form.
7. Reconcile the App Store privacy nutrition label and Google Play Data safety form
   with `presentation/legal/legalDocuments.ts` and the current production integrations.
8. From an ordinary test account, exercise More → Account → Delete account and verify
   that authentication, Firestore records, linked iNaturalist identity, and owned
   Storage objects are removed. Verify that a President receives the transfer prompt.
9. Re-run this checklist whenever a data category, provider, integration, billing
   model, retention practice, or user-generated-content feature changes.
10. Complete [the child safety activation and response procedure](child-safety-response.md)
    before certifying Play Console child safety standards. Confirm the installed
    Android build, private inbox, contact delivery, and actual authority reporting
    process separately from the repository policy text.

The in-app sources of truth are `presentation/legal/legalDocuments.ts` and
`presentation/legal/termsAgreement.ts`; update the effective date whenever
policy text materially changes. Individual documents can carry an `effectiveDate`;
the safety-reporting privacy update does not change the accepted Terms version.
