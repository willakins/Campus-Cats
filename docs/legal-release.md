# Legal release checklist

Campus Cats ships the legal documents as public Expo Router pages. Production hosting
must keep these URLs available without authentication:

- Terms of Service: `https://campuscats-d7a5e.web.app/legal/terms`
- Privacy Policy: `https://campuscats-d7a5e.web.app/legal/privacy`
- Account deletion: `https://campuscats-d7a5e.web.app/legal/account-deletion`

Before publishing a mobile release:

1. Have qualified counsel review the operator name, contact details, governing-law
   choice, billing terms, liability allocation, age threshold, and privacy disclosures.
2. Confirm `willakins23@gmail.com` is monitored and can receive verified privacy and
   deletion requests. Replace it in `legal/policies.ts` if the operating entity adopts
   a dedicated address.
3. Build and deploy the production web export, then open all three URLs in a private
   browser window and verify they do not require a Campus Cats account.
4. Deploy `firestore.rules` and `storage.rules` with the app release. When the Terms
   change, update the version in `legal/policies.ts` and both rules files together so
   prior consent is rejected and the new acceptance can be stored.
5. Add the Privacy Policy URL to App Store Connect and Google Play Console.
6. Add the account-deletion URL to Google Play Console's Data safety form.
7. Reconcile the App Store privacy nutrition label and Google Play Data safety form
   with `legal/policies.ts` and the current production integrations.
8. From an ordinary test account, exercise More → Account → Delete account and verify
   that authentication, Firestore records, linked iNaturalist identity, and owned
   Storage objects are removed. Verify that a President receives the transfer prompt.
9. Re-run this checklist whenever a data category, provider, integration, billing
   model, retention practice, or user-generated-content feature changes.

The in-app source of truth is `legal/policies.ts`; update the effective date whenever
policy text materially changes.
