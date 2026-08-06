# Campus Cats behavior and authorization matrix

This matrix is the compatibility contract for the architecture refactor. Existing
collection names, document fields, Storage paths, and user-visible flows remain stable
unless a later decision explicitly changes them.

| Capability                                 | Unauthenticated | Member                       | Officer               | Vice-President        | President             | Developer              |
| ------------------------------------------ | --------------- | ---------------------------- | --------------------- | --------------------- | --------------------- | ---------------------- |
| Submit a valid whitelist application       | Allow           | Allow                        | Allow                 | Allow                 | Allow                 | Allow                  |
| Read member-visible app content            | Deny            | Allow                        | Allow                 | Allow                 | Allow                 | Allow                  |
| Create a sighting                          | Deny            | Allow as self                | Allow as self         | Allow as self         | Allow as self         | Allow as self          |
| Update or delete a sighting                | Deny            | Own only                     | Own only              | Own only              | Own only              | Own only               |
| Manage catalog cats                        | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Manage feeding stations and restocks       | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Manage announcements                       | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Manage contacts and whitelist applications | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Manage members                             | Deny            | Deny                         | Allow, excluding self | Allow, excluding self | Allow, excluding self | Allow, excluding self  |
| Manage officers                            | Deny            | Deny                         | Deny                  | Allow, excluding self | Allow, excluding self | Allow, excluding self  |
| Manage Vice-Presidents                     | Deny            | Deny                         | Deny                  | Deny                  | Allow, excluding self | Allow, excluding self  |
| Promote/demote Member ↔ Officer            | Deny            | Deny                         | Deny                  | Allow                 | Allow                 | Allow                  |
| Promote/demote Officer ↔ Vice-President    | Deny            | Deny                         | Deny                  | Deny                  | Allow                 | Allow                  |
| Add a disciplinary notice to a Member      | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Ban or unban a Member                      | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Browse Developer accounts                  | Deny            | Deny                         | Deny                  | Deny                  | Deny                  | Read-only              |
| Crown a President                          | Deny            | Deny                         | Deny                  | Deny                  | Transfer only         | First appointment only |
| Manage Presidents or Developers ordinarily | Deny            | Deny                         | Deny                  | Deny                  | Deny                  | Deny                   |
| View app billing costs                     | Deny            | Deny                         | Callable only         | Callable only         | Callable only         | Callable only          |
| Manage app branding and privacy            | Deny            | Deny                         | Deny                  | Deny                  | Allow                 | Deny                   |
| View contributors while anonymous          | Deny            | Hidden (self ownership only) | Allow                 | Allow                 | Allow                 | Allow                  |
| View contributors while non-anonymous      | Deny            | Allow                        | Allow                 | Allow                 | Allow                 | Allow                  |
| Open Firebase or Google Cloud consoles     | Deny            | Deny                         | Deny                  | Deny                  | Deny                  | Allow                  |
| Update a push token                        | Deny            | Own only                     | Own only              | Own only              | Own only              | Own only               |
| Update non-privileged profile fields       | Deny            | Own only                     | Own only              | Own only              | Own only              | Own only               |
| Read visible imported iNaturalist records  | Deny            | Allow                        | Allow                 | Allow                 | Allow                 | Allow                  |
| Inspect hidden/inactive imported records   | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Sync, moderate, link, or override imports  | Deny            | Deny                         | Callable only         | Callable only         | Callable only         | Callable only          |

## Critical workflow ordering

- Announcement data is persisted before notification delivery is attempted. A
  notification failure is reported as a warning and does not erase the announcement.
- A whitelist user is provisioned before credentials are emailed. If email delivery
  fails, the newly provisioned user is removed as compensation.
- Ordinary promotion stops at Vice-President. Presidential succession is a separate
  Firestore transaction: the successor becomes President at the same time the outgoing
  President becomes Officer. A Developer may appoint the first President only when no
  President exists.
- Officer, Vice-President, President, and Developer are classified as power roles.
  Power roles may discipline, ban, and unban Member accounts, but no power-role
  account may be targeted by those moderation controls.
- Banning first marks the Firestore profile as banned, then disables the Firebase Auth
  account and revokes its refresh tokens. Firestore and Storage rules deny banned
  accounts all app data except their own profile, allowing the client to explain the
  ban and sign out safely. Unbanning re-enables Auth before clearing the profile ban.
- Media replacement uploads new objects before changing the document. Failed document
  writes remove new uploads; obsolete objects are deleted only after the document is
  safely updated.
- Sighting and catalog contributor identities are stored separately from public
  content. Creates and deletes update both documents atomically. The default is
  anonymous: officers may inspect identities, while contributors receive only the
  self-access required to maintain their own sightings. Turning anonymity off makes
  those identities visible to all active Members.

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
