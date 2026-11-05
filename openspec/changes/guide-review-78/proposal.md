# Proposal

## Why

check:guides reports four Anthropic banks whose published guide review snapshots lag the current bank: CCAR-F 175/195, CCAR-P 63/126, CCAO-F 119/137 and CCDV-F 53/96. Tracking: [#78](https://github.com/tuanvipandpro/quiz-app/issues/78); coordination: [#87](https://github.com/tuanvipandpro/quiz-app/issues/87).

## What Changes

- Review the four guides against actual current question contents, concepts, primary references and question-ID mappings.
- Correct content/mappings and reconcile stale README counts using recorded source revisions.
- Advance reviewed hashes/counts only after substantive review, retaining the stale warning for any unfinished bank.
- Preserve question IDs, aliases and marked answers; an answer correction requires a separately justified review.

## Capabilities

### New Capabilities

- `study-guide-integrity`: accurate mappings and evidence-backed published guide review state.

### Modified Capabilities

None. Existing guide loading/navigation and bank scoring contracts are retained.

## Impact

Data change with documentation updates, medium learning-accuracy risk. Owners: public/summaries, guide metadata, current catalog checks and maintained README. Review against the bank revisions recorded when implementation begins; abort/reconcile a changed source rather than stamping a stale review. One focused data PR can contain all four reviewed guides; partially reviewed work remains explicit. No runtime redesign or mechanical hash refresh.
