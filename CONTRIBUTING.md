# Contributing to Campus Cats

Campus Cats began as a five-person Georgia Tech Computer Science capstone. Preserve the
team attribution in the README and avoid wording that assigns the project to a single
contributor.

## Development workflow

1. Use Node 22.23.2 with npm 10 and install exact dependencies with `npm ci`.
2. Create a focused branch and keep changes within the issue's stated scope.
3. Add or update public-boundary behavior tests before changing behavior.
4. Run `npm run quality` and `npm run test:coverage`.
5. For backend, adapter, or rule changes, also run the Functions and Firebase emulator
   commands in [the testing guide](docs/testing.md).
6. Open a draft pull request and complete the
   [verification checklist](docs/verification-checklist.md).

Feature modules return typed outcomes and must not accept React setters, routers,
alerts, or Firebase types. Presentation owns loading, confirmation, errors, and
navigation. New persistence or native integrations belong behind a narrow port with a
deterministic in-memory implementation or an equivalent contract test.

Do not point automated tests at a production Firebase project. Do not deploy Functions,
rules, or builds from an ordinary contributor branch.
