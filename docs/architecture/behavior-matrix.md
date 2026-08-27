# Campus Cats behavior and authorization matrix

This matrix is the compatibility contract for the architecture refactor. Existing
collection names, document fields, Storage paths, and user-visible flows remain stable
unless a later decision explicitly changes them. ADR 0003 intentionally replaces the
root persistence layout with tenant paths and separates platform administration from
club roles.

| Capability                                 | Unauthenticated | Member                       | Officer               | Vice-President        | President             | Developer              |
| ------------------------------------------ | --------------- | ---------------------------- | --------------------- | --------------------- | --------------------- | ---------------------- |
| Submit a valid whitelist application       | Allow           | Allow                        | Allow                 | Allow                 | Allow                 | Allow                  |
| Read member-visible app content            | Deny            | Allow                        | Allow                 | Allow                 | Allow                 | Allow                  |
| Create a sighting                          | Deny            | Allow as self                | Allow as self         | Allow as self         | Allow as self         | Allow as self          |
| Update or delete a sighting                | Deny            | Own only                     | Own only              | Own only              | Own only              | Own only               |
| Manage catalog cats                        | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Manage feeding stations and restocks       | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Manage announcements                       | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Read active community events               | Deny            | Allow                        | Allow                 | Allow                 | Allow                 | Allow                  |
| Manage events and view expired events      | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Read open and past surveys                 | Deny            | Allow                        | Allow                 | Allow                 | Allow                 | Allow                  |
| Submit one response to an open survey      | Deny            | Allow                        | Allow                 | Allow                 | Allow                 | Allow                  |
| Create/close surveys and inspect responses | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Read contests/elections and final results  | Deny            | Allow                        | Allow                 | Allow                 | Allow                 | Allow                  |
| Nominate/abstain and cast one private vote | Deny            | Allow                        | Allow                 | Allow                 | Allow                 | Allow                  |
| Create a general contest                   | Deny            | Deny                         | Allow                 | Allow                 | Allow                 | Allow                  |
| Start a presidential election              | Deny            | Deny                         | Deny                  | Deny                  | Allow                 | Deny                   |
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
| Manage club subscription billing           | Deny            | Deny                         | Deny                  | Deny                  | Callable only         | Deny                   |
| Manage app branding and privacy            | Deny            | Deny                         | Deny                  | Deny                  | Allow                 | Deny                   |
| View contributors while anonymous          | Deny            | Hidden (self ownership only) | Allow                 | Allow                 | Allow                 | Allow                  |
| View contributors while non-anonymous      | Deny            | Allow                        | Allow                 | Allow                 | Allow                 | Allow                  |
| Open Firebase or Google Cloud consoles     | Deny            | Deny                         | Deny                  | Deny                  | Deny                  | Deny                   |
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
  President becomes Officer. A Developer may run the same succession workflow while
  retaining the Developer role; any current President becomes an Officer.
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
- Event pictures are required and are uploaded before the event document is published.
  Expired events disappear for Members but remain in the Officer history view.
- Published surveys are immutable and closed rather than deleted. Each submission
  atomically creates a random response and a per-account receipt. Anonymous response
  documents omit identity; named responses include the current user snapshot. Receipts
  prevent duplicate submissions and are unreadable by Officer result screens.
- Community vote definitions are immutable. Nomination and ballot callables re-read
  the stored phase inside their Firestore transactions, create a per-account receipt,
  and keep anonymous ballots separate. Presidential voting begins from timestamps,
  and a scheduled Function broadcasts the second-round opening once.
- Club content and public profiles are tenant-scoped. A suspended user may read only
  their own global identity and `clubs/{clubId}/access/public`; the President retains
  server billing endpoints.
- Club authorization follows the numeric role hierarchy: Developer (`4`) inherits
  every President (`3`) action, President inherits Vice-President, and so on.
  `platformAdmin` remains an independent global flag for infrastructure-cost reports
  and provider console links; that flag alone does not add club-content permissions.

## Platform administration

| Capability                            | Ordinary account | `platformAdmin` account |
| ------------------------------------- | ---------------- | ----------------------- |
| View Firebase/Google Cloud app costs  | Deny             | Callable only           |
| Open provider administration consoles | Deny             | Allow                   |
| Gain additional club-content rights   | Deny             | Deny                    |

## Test seams

- Feature behavior is tested through public module interfaces with in-memory ports.
- Persistence and media behavior use shared contracts against in-memory and Firebase
  Emulator adapters.
- Screens and forms are tested through accessible rendered interactions.
- Callable behavior is tested through dependency-injected domain handlers, with emulator
  tests covering Firebase wrappers.
- Firestore and Storage access are tested as authorization matrices in the Emulator
  Suite.
- Camera, photo library, maps, SAML, and push notification integrations receive a
  documented physical-device/simulator checklist in addition to automated tests.
