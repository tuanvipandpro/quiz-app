# Anthropic duplicate review — 2026-10-30

Source revision: `56f617ccf498a963313b574c9b323afaa07363df`.
The review compared 605 questions across four banks. Normalized stems and choices
identified candidates; content review distinguished paraphrases from distinct tasks
that merely share a question template. Similarity scores alone never authorized removal.

| Bank                  | Before | Removed | After |
| --------------------- | -----: | ------: | ----: |
| CCAR-F (`CCA_F.json`) |    201 |       6 |   195 |
| CCAR-P                |    157 |      31 |   126 |
| CCAO-F                |    151 |      14 |   137 |
| CCDV-F                |     96 |       0 |    96 |

The complete removed-ID → retained-ID mapping and retired normalized-content hashes
are in `tests/fixtures/anthropicDeduplication.json`. Earlier question IDs and order are
retained. Shared questions across different certifications remain, as requested.
Other heuristic candidates remain unless their equivalence has been reviewed.

CCAR-P includes 29 reviewed paraphrases plus two special cases:

- `ccar-p-131` repeats four of the five identical rows in `ccar-p-38-import-1`;
  keep the complete five-row version.
- `ccar-p-128` repeats the refund-delegation scenario from `ccar-p-11` but replaces
  risk-based delegation with a broad human-review answer. Retain the earlier,
  context-sensitive question. Anthropic's Usage Policy distinguishes high-risk
  recommendations from carrying out a fixed rule or an already-made decision;
  transaction size alone does not establish the appropriate delegation boundary.

## CCAO-F 105 / 145 answer resolution

Both questions enumerate the same five assessment steps with different numbering.
Question 145's **D: 3, 5, 1, 4, 2** represents:

1. Identify audience, impact and reversibility.
2. Identify data types and sensitivity.
3. Compare against organizational policy and relevant regulatory considerations.
4. Decide whether to proceed, modify or decline.
5. Document the outcome and rationale.

In question 105, that is **1, 2, 3, 4, 5**. None of its old choices expressed that
sequence. Keep ID 105 and answer key B, replace B's text with the correct sequence,
replace the explanation, and remove duplicate 145. The old B incorrectly deferred
data sensitivity until after approval and documented an outcome before deciding it.

This is a dependency-based assessment of the question, not a claim to have obtained
an official exam answer key. These primary sources support the principles:

- [Anthropic Usage Policy](https://www.anthropic.com/legal/aup): privacy obligations,
  high-risk use cases, and human oversight depend on the intended use and data.
- [NIST AI RMF Playbook — Map](https://airc.nist.gov/airmf-resources/playbook/map/):
  establish purpose, users, impacts, context and requirements to inform go/no-go decisions.

Both were consulted on 2026-10-30. These sources do not prescribe this exact five-step
numbered answer. Correctness follows from the dependencies among the supplied steps.

## Compatibility and verification scope

- Bank IDs, quiz aliases and surviving question IDs stay stable. Catalog totals match
  the reduced banks. No provider/exam renaming or broad answer rewrite is included.
- Cloud checkpoint records are not rewritten. Existing resolution follows surviving
  IDs; a retired ID uses the existing adjusted/clamped-position fallback, which is
  covered by regression tests. It does not automatically redirect to the retained twin.
- Existing local drafts use a whole-bank fingerprint. As with other bank edits,
  prior drafts for the three changed banks cannot resume against the new content.
  No draft migration is introduced; account scoping and storage keys stay unchanged.
- CCAR-F guide links to four retired IDs are remapped to their retained questions.
  Its reviewed hash/count/date are preserved. The CCAO-F answer correction also makes
  its reviewed subset stale. The existing stale-guide signal remains active; this
  cleanup does not constitute a full guide-content review.
- The importer is not changed into a fuzzy matcher. Regression tests reject the
  reviewed retired signatures even if someone gives them new IDs, as well as exact
  normalized duplicates. Future paraphrases still require content review.
- This is a data correction. No visual layout, interaction, auth or navigation code
  changes are included; the UI impact is reduced counts, corrected answer content,
  valid guide references and the existing changed-bank recovery behavior.
