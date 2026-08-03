# Campus Cats behavior and authorization matrix

This matrix is the compatibility contract for the architecture refactor. Existing
collection names, document fields, Storage paths, and user-visible flows remain stable
unless a later decision explicitly changes them.

| Capability                                 | Unauthenticated | Member        | Admin                 | Super-admin           |
| ------------------------------------------ | --------------- | ------------- | --------------------- | --------------------- |
| Submit a valid whitelist application       | Allow           | Allow         | Allow                 | Allow                 |
| Read member-visible app content            | Deny            | Allow         | Allow                 | Allow                 |
| Create a sighting                          | Deny            | Allow as self | Allow as self         | Allow as self         |
| Update or delete a sighting                | Deny            | Own only      | Own only              | Own only              |
| Manage catalog cats                        | Deny            | Deny          | Allow                 | Allow                 |
| Manage feeding stations and restocks       | Deny            | Deny          | Allow                 | Allow                 |
| Manage announcements                       | Deny            | Deny          | Allow                 | Allow                 |
| Manage contacts and whitelist applications | Deny            | Deny          | Allow                 | Allow                 |
| Manage members                             | Deny            | Deny          | Allow, excluding self | Allow, excluding self |
| Manage admins                              | Deny            | Deny          | Deny                  | Allow, excluding self |
| Manage super-admins or equal/higher roles  | Deny            | Deny          | Deny                  | Deny                  |
| Update a push token                        | Deny            | Own only      | Own only              | Own only              |
| Update non-privileged profile fields       | Deny            | Own only      | Own only              | Own only              |

## Critical workflow ordering

- Announcement data is persisted before notification delivery is attempted. A
  notification failure is reported as a warning and does not erase the announcement.
- A whitelist user is provisioned before credentials are emailed. If email delivery
  fails, the newly provisioned user is removed as compensation.
- Media replacement uploads new objects before changing the document. Failed document
  writes remove new uploads; obsolete objects are deleted only after the document is
  safely updated.

## Test seams

- Feature behavior is tested through public module interfaces with in-memory ports.
- Persistence and media behavior use shared contracts against in-memory and Firebase
  Emulator adapters.
- Screens and forms are tested through accessible rendered interactions.
- Callable behavior is tested through dependency-injected handlers, with emulator
  tests covering Firebase wrappers.
- Firestore and Storage access are tested as authorization matrices in the Emulator
  Suite.
- Camera, photo library, maps, SAML, and push notification integrations receive a
  documented physical-device/simulator checklist in addition to automated tests.
