# Campus Cats installation guide

This guide covers local setup for the Campus Cats Expo application. For a project overview, start with the [main README](README.md).

## Prerequisites

- [Node.js](https://nodejs.org/) (an active LTS release) and npm
- [Git](https://git-scm.com/)
- One of the following development targets:
  - a physical iOS or Android device;
  - an Android emulator;
  - the iOS Simulator on macOS; or
  - a supported web browser.

Expo's local CLI is invoked through `npx`, so a global `expo-cli` installation is not required.

## Install

Clone the repository and install the locked dependency versions:

```bash
git clone https://github.com/willakins/Campus-Cats.git
cd Campus-Cats
npm ci
```

If you intentionally need to update the dependency lockfile, use `npm install` instead of `npm ci`.

## Start the app

Start the Expo development server from the repository root:

```bash
npx expo start --clear
```

From the Expo terminal interface, press:

- `a` for a configured Android emulator;
- `i` for the iOS Simulator on macOS; or
- `w` for the web client.

For a physical device, follow the QR-code instructions shown by Expo. Depending on the locally installed Expo Go version and this project's Expo SDK version, a development build may be required.

If LAN discovery is unavailable, retry with Expo's tunnel transport:

```bash
npx expo start --clear --tunnel
```

The package scripts provide equivalent platform-specific entry points:

```bash
npm run android
npm run ios
npm run web
```

## Service configuration

The UI can start without every production integration, but complete functionality relies on services configured for the original Campus Cats deployment:

| Capability | Service dependency |
| --- | --- |
| Accounts and Georgia Tech SSO | Firebase Authentication and the configured SAML provider |
| Sightings, cats, stations, announcements, and users | Cloud Firestore |
| Uploaded photos | Firebase Storage |
| Maps | Platform-specific Google Maps configuration |
| Announcement notifications | Expo Notifications and deployed Cloud Functions |
| Whitelist emails | Deployed Cloud Functions and a SendGrid secret |

External contributors may not have access to the original Firebase project, SAML provider, or messaging credentials. Use a separate development Firebase project when extending the application, and never commit service-account files or private API secrets.

## Verification

Run the configured linter with:

```bash
npm run lint
```

Jest Expo is configured in `package.json` for adding and running automated tests.

## Troubleshooting

| Problem | Suggested action |
| --- | --- |
| `expo` cannot be found | Run commands through `npx expo ...` from the repository root after `npm ci`. |
| The QR code cannot connect | Confirm the device and computer share a network, or use `--tunnel`. |
| Expo Go reports an SDK mismatch | Use a compatible Expo Go client or create an Expo development build. |
| Firebase requests fail | Confirm the selected Firebase project, enabled products, security rules, access permissions, and quotas. |
| Native maps do not load | Confirm the relevant maps SDK and platform key are enabled for the development app. |
| Push notifications do not register | Use a physical device, grant notification permission, and verify the Expo/Firebase configuration. |
| Dependencies are inconsistent | Restore the committed lockfile and rerun `npm ci`. |

## Backend operations

Authorized maintainers can find the repository's rule-deployment notes in [FIREBASE.md](FIREBASE.md). Treat deployments as production-affecting operations and confirm the active Firebase project before running them.
