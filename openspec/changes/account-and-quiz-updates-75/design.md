# Design

## Context

See [proposal](proposal.md). AccountMenu owns click/keyboard activation and focus; App owns route guards. Google identity comes from AuthContext. Language/theme already have robust local-storage fallbacks. My quizzes owns private CRUD. The catalog has stable bank IDs but no reviewed public change registry.

## Goals / Non-Goals

**Goals:** add a clear account workspace and honest update discovery, reusing existing state and navigation.

**Non-Goals:** edit Google identity, add cloud-synced preferences, replace quiz CRUD, deliver notifications or expand account permissions.

## Decisions

- Proposed routes: #/profile (authenticated workspace with a guest sign-in state) and #/updates (public). Keep current default/fallback/alias behavior. Reuse go/useHashRoute for every entry so exam Cancel/Leave/Resume still works.
- Add Profile and Manage quizzes to AccountMenu through explicit navigation callbacks; retain AI Settings and Sign out. Profile renders Google name/email/avatar read-only and reuses the existing language/theme setters. State clearly that these preferences apply on this device. This implements the owner's chosen Google-info + QuizMos-settings scope without adding profile-write/schema risk.
- Profile links to the current AI Settings and My quizzes flows. Do not fetch private quiz contents just to populate the profile. #80 adds its history destination when the history release gate is enabled; no placeholder link to an unfinished route.
- Make updates discoverable from Quiz Bank and the footer, avoiding another crowded header row at 320px. Use existing cards/list rows and tokens, with left-aligned navigation/content and right-side utilities.
- Add a focused data registry plus pure validation for canonical bank ID, kind, ISO content date, summary and source revision. Seed at least one actually reviewed recent bank change. Candidate sources are CTFL commit 241c5b1 (2026-11-01) and deduplication commit 4dd9bf4 (2026-10-30); verify their deltas before writing copy. A UI deployment such as #76 is not a bank-content entry.

## Risks / Trade-offs

- Auth transitions can expose an old name/avatar → render only current-context identity and test delayed auth/account changes.
- A change date can be confused with a build/review date → keep the registry's date semantics explicit and show the reviewed source revision.
- New profile/update layouts could drift from existing design → retain Ant Design/tokens, readable rows, 44px controls and the repository matrix. The broad design-system query certification learning dashboard returned a showcase/child-oriented typography mismatch; use relevant accessibility/error guidance and the established app skin, not that visual direction.

## Verification matrix

| Requirement   | Planned evidence                                                                                              | Status  |
| ------------- | ------------------------------------------------------------------------------------------------------------- | ------- |
| CQ-ACCOUNT-01 | Current/missing Google fields; local preference persistence/storage failure; no identity/cloud-profile writes | Pending |
| CQ-ACCOUNT-02 | Account-menu keyboard/touch and active-exam Cancel/Leave/Resume through each entry                            | Pending |
| CQ-ACCOUNT-03 | Auth loading, guest deep links, sign-in failure, sign-out/account switch with no stale private UI             | Pending |
| CQ-UPDATES-01 | Pure registry validation; source/date/content review; canonical link and invalid-entry tests                  | Pending |
| CQ-UPDATES-02 | Guest discovery, empty/newest-first list, deep-link reload/Back and guarded navigation                        | Pending |

Apply 320/390/412/768/1280px and landscape, VN/EN, both themes, focus and reduced motion. Use fixture-backed auth; no real account changes are needed for routine verification.

## Migration Plan

One #75 feature PR after #77; #78 content review and #79 evidence work can proceed independently. Run yarn verify/E2E and latest-head CI. After owner-requested merge/deploy, smoke public updates and guest/profile navigation; signed-in acceptance uses fixtures or a designated authorized account. Revert routes/menu/registry together to roll back. Existing preferences, profile fields and quiz data remain compatible.
