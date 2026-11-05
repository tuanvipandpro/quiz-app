# Design

## Context

See [proposal](proposal.md). QuickSummaryMode already displays a stale-source warning. check:guides compares stored source metadata with current banks but cannot establish conceptual accuracy or mapping relevance. README contains older counts. This is published study-content work, not a new renderer.

## Goals / Non-Goals

**Goals:** complete an auditable review of the four current snapshots and retain honest partial status.

**Non-Goals:** alter quiz identities/answers, remove stale warnings, add AI-authored filler or use a hash refresh as content evidence.

## Decisions

1. Freeze each reviewed bank's commit/hash/count in a small review matrix before editing. Review the guide and actual questions affected by the previous/current diff, plus retained mappings for conceptual fit. Read primary references where claims require verification.
2. Record added/removed/reordered question IDs and the guide sections they affect. Correct the Markdown/mappings first; update that guide's reviewed hash/count last. If the bank moves, rebase and reconcile before publishing.
3. Keep a concise maintained review note for source/provenance and non-obvious mapping decisions; keep disposable import reports/screenshots under ignored artifacts. Do not introduce a second content catalog.
4. Use one #78 data PR when all four guides are reviewed. If a justified partial delivery is chosen, leave remaining guide rows and #78 open; do not broaden answer corrections into this PR.

## Risks / Trade-offs

- Passing schema/link checks could mask wrong exam concepts → require actual content/source review in addition to automated checks.
- Duplicate removal can make old ordinal positions misleading → map by stable IDs and inspect the intended question text.
- Updating counts in docs early can imply a finished review → keep implementation/review/rollout statuses distinct.

## Verification matrix

| Requirement | Planned evidence                                                                                    | Status                             |
| ----------- | --------------------------------------------------------------------------------------------------- | ---------------------------------- |
| CQ-GUIDE-01 | Frozen source/prior hashes, four-guide concept/primary-source review and content-first metadata     | Local/code CI pass; deploy pending |
| CQ-GUIDE-02 | All current stems/marked choices and added structured parts reviewed; stable link E2E and ID tests  | Local/code CI pass; deploy pending |
| CQ-GUIDE-03 | Strict guide/catalog check, 21 guide/dedup tests, 14 rendered/link cases and preserved stale signal | Local pass; production pending     |

## Migration Plan

Implementation evidence: [maintained review note](../../../docs/study-guide-review-2026-11-06.md) records each source, mapping decisions and corrected claims. All four banks remain byte/content unchanged. Version 2 guides cover 195/126/137/96 current IDs; word counts are 1593/1528/1562/1519. `yarn verify` passed 193 Node tests and strict SDD/catalog/build/isolation; strict `check:guides` is green and focused guide/dedup tests passed 21/21. The 14-case guide E2E suite passed after correcting test expectations that incorrectly compared the rendered title to Copy's options-inclusive text and a dropdown's omitted trailing Select instruction. Existing renderers were unchanged. Native keyboard activation, MC/Yes-No/dropdown related links, Back, preserved stale-warning behavior and the viewport/language/theme matrix are covered. Rendered 320px VN/dark and 1280px EN/light samples were inspected; initial diagnostics and final captures are ignored artifacts. Primary references and current product caveats were reviewed rather than mechanically replacing hashes. #96 tracks separate dated bank assumptions. Latest-head CI and post-merge publication remain open.

Run check:guides, catalog validation, quickSummary tests, yarn verify and relevant guide E2E. Inspect long content on phone/desktop and the warning/link states. After latest-head CI and owner-requested merge, verify published guides and links. Roll back a guide and its review metadata together; preserve unrelated bank data.

Code head `e8a400e9255fbee79de50ee539a2710325835f8d` passed required [CI 42092540782](https://github.com/tuanvipandpro/quiz-app/actions/runs/42092540782), including both browser shards, Rules and backend checks. The initial shard-1 cancellation was a documented 15-minute job timeout after 10m46s installing Chromium dependencies; its failed-job rerun passed without changing tests or timeouts. This acceptance-only documentation update still requires its own latest-head CI; owner-requested merge and published status/link smoke remain open.
