---
name: create-release-notes
description: Create or update Campus Cats release notes from a version, Git range, or supplied change list, using consistent user-facing summaries and grouped changes. Use for release notes, changelog entries, or app-store update copy.
---

# Create release notes

Write release notes for Campus Cats members and club administrators. Use a versioned, dated entry with a brief summary and changes grouped by type. This is a local convention informed by Keep a Changelog and the product-focused release notes published by GitHub and Microsoft; there is no single universal company standard.

## Establish the release scope

- Read `CHANGELOG.md`, `package.json`, `app.json`, and `app.config.js` as relevant. The existing changelog preserves the capstone 1.0.0 release; preserve historical entries unless the user requests revisions. Package and app versions can differ and do not prove that a release shipped.
- Honor an explicit version, date, audience, destination, and previous/target ref. Otherwise inspect local tags and history to identify a plausible range; use local Git data without requiring GitHub access. If the previous release or target cannot be established confidently, ask for that boundary while inspecting available context. Do not silently use the entire repository history or the current branch as a shipped release.
- Resolve refs to commits and inspect `git log BASE..TARGET`, `git diff --stat BASE TARGET`, and relevant diffs. Commit messages and PR titles are leads, not proof of behavior. Account for reversions, duplicate commits, feature flags, platform differences, and backend changes that may need separate deployment.
- For supplied change lists without code evidence, draft from the supplied facts and identify that limitation in the handoff. Do not invent versions, dates, measured improvements, fixes, rollout status, or availability. Use `Unreleased` for an undated draft; if a version is known but shipping is unconfirmed, label it a draft without assigning a release date.

## Write the entry

Use this shape; replace the angle-bracket fields and omit empty or irrelevant sections. A patch release may need only a summary and Fixed. The ordering below is the repo convention.

```markdown
## <version> - <YYYY-MM-DD>

<One or two sentences explaining the most useful changes for this release.>

### Action required

- <Who must act, what they must do, and when; include a migration/help link if available.>

### Added

- **<Feature>:** <New capability and where the member or administrator can use it.>

### Changed

- **<Experience>:** <Improved behavior and its practical benefit.>

### Deprecated

- <What is being phased out, its replacement, and a confirmed removal date if known.>

### Removed

- <What is no longer available and the supported alternative if there is one.>

### Fixed

- <The visible problem that is now corrected, including the affected platform when relevant.>

### Security

- <Verified security improvement and any necessary user action, using public disclosure details.>

### Known issues

- <Verified remaining limitation, affected users/platforms, and a confirmed workaround if available.>

**Full changelog:** [<base>...<target>](<verified comparison URL>)
```

- Use Added for new capabilities, Changed for improvements to existing behavior, Deprecated for features scheduled for removal, Removed for retired features, Fixed for corrected bugs, and Security for security changes. Surface breaking changes and required actions before the ordinary categories; also explain the affected behavior in its appropriate category without repeating the same paragraph.
- Prioritize user impact within each category. Describe what members or administrators can now do, where to find it, and any access or platform restrictions. Preserve the app's terminology, such as Cat-alog, sightings, feeding stations, clubs, and officers.
- Consolidate related commits into one meaningful bullet. Exclude tests, refactors, formatting, and dependency updates unless they have a concrete user or operator impact relevant to the requested audience. Avoid vague claims such as “various bug fixes” and unsupported claims about speed, reliability, or security.
- Keep each bullet to one or two sentences. Use plain language and precise verbs. Distinguish previews and limited rollouts from general availability when supported by evidence.
- Include known issues only when verified as relevant to this release. Do not automatically carry forward capstone limitations or mark them resolved without evidence. Include only public security details; keep personal information, credentials, and private operational details out of release notes.
- Add useful PR, issue, documentation, or comparison links only when their destinations are verified. A full-changelog link is optional, and no network access is needed for a local-only draft.

## Save and check

Default to adding an entry to root `CHANGELOG.md`, newest first below its document introduction. Reuse an existing matching version or Unreleased entry rather than duplicating it. Preserve prior entries and unrelated edits. If the user asks only for a draft, return the Markdown without changing files; honor an explicit output path.

When app-store copy is requested, derive a short “What's new” summary from the same verified changes, using plain bullets without Git links or internal details. Follow any supplied store length limit; do not assume one limit applies to every channel. Keep the full changelog unless the user requested only store copy.

Before finishing, check every claim against its evidence, verify the scope/version/date, remove unused template fields and empty headings, and check links and Markdown. Report the output path and comparison range (or supplied source), plus any unresolved release facts separately from publication-ready prose. Creating release notes does not itself authorize tagging, deploying, committing, pushing, or publishing a release.

## Format references

These explain the chosen convention; ordinary use does not require browsing them again.

- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/): dated versions, meaningful change categories, newest entries first, and curated changes.
- [GitHub Changelog](https://github.blog/changelog/): product-facing descriptions of features, improvements, and fixes.
- [VS Code release notes](https://code.visualstudio.com/updates): release summaries, feature explanations, and relevant usage details.
- [GitHub generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes): optional PR and comparison evidence to curate rather than copy verbatim.
