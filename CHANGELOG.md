# Release notes

This document preserves the shipped features and known limitations of the team's capstone release.

## Version 1.0.0

### Primary features

- **Cat sighting reports:** members can submit a cat's name, condition, location, and photos.
- **Sighting map:** sightings appear as map pins and can be filtered by age.
- **Announcements:** administrators can create updates that are visible to all users.
- **Announcement notifications:** published announcements can trigger push notifications.
- **Station directory:** members can view stored feeding-station information.
- **Station management:** administrators can add and update Firestore-backed stations.
- **Restocking workflow:** station details include restocking data plus stocked/unstocked filtering.
- **Cat-alog:** members can explore known stray cats, their details, photos, and recent sightings.
- **Cat-alog management:** administrators can create and maintain detailed cat profiles.
- **Administrative controls:** role-aware creation and editing tools are available throughout the app.

### Additional features

- **Georgia Tech SSO:** Georgia Tech Single Sign-On is integrated through a SAML authentication flow.
- **Alumni whitelist:** alumni can apply for access, and administrators can review applications.
- **Club information:** the settings area makes Campus Cats contact details available to members.
- **User management:** authorized administrators can promote, demote, and manage users.
- **Responsive layouts:** screens adapt to different mobile dimensions and platform behaviors.

### Fixes included in the release

- Kept the Android login action accessible while the keyboard is open.
- Corrected Android date-picker presentation.
- Standardized report-button alignment across devices.
- Surfaced photo-permission failures instead of failing silently.
- Prevented back navigation from returning an authenticated user to the login screen.
- Restored the Android status bar with platform-specific styling.
- Prevented duplicate Cat-alog entries during uploads.
- Expanded button hit areas beyond their text labels.

### Known limitations

- **First-attempt SSO failure:** some browser sessions can fail during initial Georgia Tech account creation; retrying may complete sign-in.
- **Blocked-user enforcement:** after the SSO integration, blocking a user does not consistently prevent a later login.
- **Tablet layouts:** wider, more square screens such as iPads receive less-polished layouts than phone-sized screens.
- **Fixed data fields:** create/edit screens do not support adding new domain fields without an application change.
- **Map query efficiency:** the home map performs more database queries than necessary, although no visible performance impact was observed during the capstone release.
