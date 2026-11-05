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

| Requirement | Planned evidence                                                                                | Status  |
| ----------- | ----------------------------------------------------------------------------------------------- | ------- |
| CQ-GUIDE-01 | Per-guide source revision, substantive Markdown/reference review, reviewed hash updated last    | Pending |
| CQ-GUIDE-02 | Mapping diff plus semantic spot/full affected-question review; link/scoring-ID tests            | Pending |
| CQ-GUIDE-03 | check:guides, honest partial rows, rendered guides and related-question navigation after deploy | Pending |

## Migration Plan

Run check:guides, catalog validation, quickSummary tests, yarn verify and relevant guide E2E. Inspect long content on phone/desktop and the warning/link states. After latest-head CI and owner-requested merge, verify published guides and links. Roll back a guide and its review metadata together; preserve unrelated bank data.
