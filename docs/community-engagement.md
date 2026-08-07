# Community engagement

The **Community** bottom tab groups Announcements, Events, Surveys, Votes, and Chat without
increasing the five-item bottom navigation. Announcements remains the default section
so the existing update workflow stays one tap away. The labeled section controls
scroll horizontally when text does not fit. Chat is intentionally a non-interactive
placeholder until a messaging design and moderation policy are approved.

## Events

Officers and higher roles can create an event with a title, details, location, event
date, expiration date, and one required picture. Event pictures live under
`community-events/<event-id>/` in Cloud Storage. The Firestore event document stores
the resolved image URL.

An event becomes expired at the end of its selected expiration day. Expired events
disappear from Member-facing Community lists and direct app routes. Officers retain an
Expired view for operational history and can delete an event and its image. Expiration
is a presentation lifecycle, not automatic database deletion.

## Surveys

Officers publish surveys containing one or more required questions. Supported question
types are:

- Multiple choice: exactly one option.
- Select all: one or more options.
- Short answer: up to 500 characters.
- Long answer: up to 5,000 characters.

Published question wording, options, ordering, and privacy mode are immutable so past
responses always retain their original meaning. Officers may close a survey. Closed
surveys remain visible in the Past view, and officers retain access to every response.

Every survey card and response screen labels the survey **Anonymous** or **Named**.
The disclosure is repeated directly above the questions and in the submit button.

### Anonymous response storage

Survey definitions live in `community-surveys`; answers live in `survey-responses`.
Anonymous response documents contain no user ID, email, role, or other respondent
snapshot. Named response documents contain the submitting user's identity snapshot.

Each account may submit once. A trusted `submitSurveyResponse` callable validates every
answer against the current survey, then writes the random response and a separate
`survey-submission-receipts/<user-id>__<survey-id>` document in one Firestore
transaction. Direct client writes to both collections are denied. The receipt links
the account to the random response solely to enforce one submission.
Firestore rules let only that account read its receipt; officer response-history screens
cannot read receipts and therefore cannot join an anonymous answer back to a Member.
As with any hosted application, Firebase project owners with administrative database
access remain outside app-level security rules.

The trusted callable and Firestore rules reject:

- Member-created or modified survey definitions.
- Responses to closed surveys.
- a named response without the authenticated user's exact identity snapshot;
- an anonymous response that contains a respondent field;
- a response without its matching new receipt; and
- a second response after a receipt already exists.

## Contests and elections

Officers may publish a general contest with 2 to 20 choices, an optional picture for
each choice, and a voting window from 1 to 14 days. This supports decisions such as a
new club logo without treating a ballot as an ordinary survey. Every active account
gets one private ballot, and aggregate results appear only after voting closes.

Only the current President may start a presidential election. The President chooses a
nomination window from 1 to 31 days and a voting window from 1 to 14 days. During the
first round, each member may nominate themself or abstain once. When that window ends,
the vote automatically enters the second round with the self-nominees as choices. A
scheduled Function broadcasts that presidential voting has started. The election
reports a result; it does not automatically change account roles. Presidential
succession remains a separate deliberate administration action.

Definitions live in `community-votes`. Trusted callables write self-nominees,
nomination receipts, anonymous ballots, and ballot receipts to their separate
collections in transactions. Clients cannot write those records directly. Nominees
are member-readable so the second-round ballot can be rendered; ballots are never
member-readable. Each account can read only its own participation receipts. The
`getCommunityVoteResults` callable returns counts only after the stored closing time.

## Release checks

Before deployment:

1. Run root quality, unit, coverage, and emulator checks.
2. Deploy Firestore and Storage rules plus Functions before releasing the Community
   client.
3. As an Officer, create an image-backed event and both an anonymous and named survey.
4. As a Member, confirm the privacy disclosure, submit once, and confirm a second
   submission is rejected.
5. Confirm Officer results show identity only for the named response.
6. Advance an event beyond its expiration date and confirm Members no longer see it
   while Officers see it under Expired.
7. As an Officer, create an image-backed contest and confirm each account can vote once
   and results remain hidden until close.
8. As the President, start an election at both duration boundaries, exercise nominate
   and abstain with separate accounts, and verify the second-round notification and
   nominee-only ballot.

Do not deploy Firebase resources from an ordinary contributor branch.
