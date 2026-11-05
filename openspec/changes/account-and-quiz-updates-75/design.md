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

| Requirement   | Planned evidence                                                                                      | Status                        |
| ------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------- |
| CQ-ACCOUNT-01 | Current/missing fields; keyboard and device-local preferences; blocked storage; no new profile writes | Local/CI pass; deploy pending |
| CQ-ACCOUNT-02 | Keyboard/touch menu and active-exam Cancel/Leave/Resume; native hash cancellation regression          | Local/CI pass; deploy pending |
| CQ-ACCOUNT-03 | Deferred auth, guest sign-in failure/retry, sign-out and Alice/Bob/guest identity replacement         | Local/CI pass; deploy pending |
| CQ-UPDATES-01 | Four domain tests; reviewed CTFL source/date/count/context; invalid metadata and canonical link cases | Local/CI pass; deploy pending |
| CQ-UPDATES-02 | Guest discovery, empty list, deterministic ordering, reload/Back, bank link and exam guard            | Local/CI pass; deploy pending |

Apply 320/390/412/768/1280px and landscape, VN/EN, both themes, focus and reduced motion. Use fixture-backed auth; no real account changes are needed for routine verification.

Implementation evidence (2026-11-06): the account/app/custom-quiz E2E run passed all 84 cases after correcting four tests to activate visible Radio.Button labels instead of their zero-size internal inputs. Keyboard preference changes are covered separately. Four focused public-entry/landing cases passed. The new native hash test reproduced a real Cancel bug in both projects: an unannotated forward hash event was mistaken for a Back traversal. Deferring that event to the existing hashchange handler fixed it; all eight focused native/programmatic exam-guard cases passed with unchanged drafts/deadlines. Initial diagnostics and final screenshots/logs remain under ignored `artifacts/implement-m1/`.

Rendered Profile/Updates samples were inspected at 320px VN/dark and VN/light, 1280px EN/light, and landscape. Geometry covers all stated widths and language/theme combinations; new controls retain 44px targets and measured menu/settings text contrast is at least 4.5:1. Profile uses current AuthContext identity and existing preference setters only. UI search `account settings navigation --domain ux` returned Keyboard Navigation and Sticky Navigation; applied labelled groups, visible keyboard focus, existing header offset and left alignment. Breadcrumbs were unnecessary for these flat destinations.

Registry provenance: reviewed commit `241c5b16dc23b04eb9ce0a5c7a63e4833b492a46`, dated 2026-11-01, against its parent. CTFL grew 240 → 276, adding IDs 243–278; question 88 changed from an incomplete user-story stem to explicit payment acceptance criteria and test-cycle context. The published summary claims only those inspected changes. No bank answers or guide review hashes were changed.

## Migration Plan

[Runtime-head CI](https://github.com/tuanvipandpro/quiz-app/actions/runs/42085609548) passed on `86e9566a1621d1864a82945adb41c221ae2d8824`, including verify, Rules, both full E2E shards, backend verification and the aggregate gate. Staged/outgoing redacted scans were clean. This acceptance-only documentation update still requires its latest-head checks; owner-requested merge, deployment and production acceptance remain pending and #75 stays open.

One #75 feature PR after #77; #78 content review and #79 evidence work can proceed independently. Run yarn verify/E2E and latest-head CI. After owner-requested merge/deploy, smoke public updates and guest/profile navigation; signed-in acceptance uses fixtures or a designated authorized account. Revert routes/menu/registry together to roll back. Existing preferences, profile fields and quiz data remain compatible.
