# Refactor verification checklist

This checklist records the acceptance state for the behavior-first architecture
refactor tracked by issue #129. Automated items are reproducible in CI. Native items
must be recorded by the maintainer who performs them before the draft PR is marked
ready.

## Automated

- [x] Node 22 root typecheck and lint pass with zero TypeScript errors.
- [x] Jest Expo unit and route suites pass.
- [x] Global owned-TypeScript coverage is at least 80% for statements, branches,
      functions, and lines.
- [x] Domain and application branch coverage is at least 90%.
- [x] Functions build and injected callable-handler tests pass.
- [x] Firestore/Storage adapter contracts and security-rule tests pass against
      `demo-campus-cats-test` emulators.
- [x] No legacy singleton facade, selected-record store, persistence class, or image
      handler reference remains.
- [x] Existing Firestore collection names, document fields, and Storage folders remain
      codec/adapter compatibility contracts; no data migration is required.

## Native and manual — required before ready for review

- [ ] Verify automatic light and dark appearance on iOS, Android, and web; confirm no
      illegible status, map overlay, dialog, keyboard, or native input state.
- [ ] Verify 200-percent text reflow on a narrow phone and a tablet/web-width viewport.
- [ ] Enable Reduce Motion and confirm navigation and press feedback remain usable
      without nonessential transforms.
- [ ] With VoiceOver or TalkBack, verify initial screen focus, labeled tabs, icon-only
      actions, form errors, busy states, galleries, and confirmations.
- [ ] With a keyboard on web, verify visible focus, logical focus order, and activation
      for tabs, controls, cards, forms, and administration actions.
- [ ] On one physical device, verify email login and logout.
- [ ] On one physical device, verify SAML success, cancellation, offline failure, and
      retry.
- [ ] On one physical device, verify camera and photo-library permission, selection,
      upload, replacement, and deletion flows.
- [ ] On one physical device, verify map location selection and rendering.
- [ ] On one physical device, verify notification permission, push-token registration,
      and announcement delivery.
- [ ] On the other platform's simulator/emulator, verify core navigation and map
      rendering in both appearances and at its largest accessibility text setting.
- [ ] Confirm the PR remains free of production Firebase deployments and mobile build
      publication.

Record the device model, OS versions, app build identifier, tester, date, and any
follow-up issue links in the draft PR when completing the native section.
