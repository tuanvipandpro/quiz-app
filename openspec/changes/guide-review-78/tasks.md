# Tasks

## 1. Review content against recorded source revisions

- [x] 1.1 Record each target bank's current commit/hash/count and prior guide snapshot in the review matrix; verify CQ-GUIDE-01 source provenance and reconcile any changes before editing.
- [x] 1.2 Review CCAR-F guide concepts, primary references and actual question mappings; correct content first, update its reviewed metadata last and verify CQ-GUIDE-01 and CQ-GUIDE-02 with mapping/content evidence plus guide checks.
- [x] 1.3 Perform the same substantive review/correction/metadata sequence for CCAR-P, with source and related-question evidence for CQ-GUIDE-01 and CQ-GUIDE-02.
- [x] 1.4 Perform the same substantive review/correction/metadata sequence for CCAO-F, with source and related-question evidence for CQ-GUIDE-01 and CQ-GUIDE-02.
- [x] 1.5 Perform the same substantive review/correction/metadata sequence for CCDV-F, with source and related-question evidence for CQ-GUIDE-01 and CQ-GUIDE-02.

## 2. Publish honest reviewed state

- [x] 2.1 Reconcile maintained README/review notes, run check:guides/catalog and quickSummary tests, and inspect guide rendering/related links; verify CQ-GUIDE-03 and leave every unfinished bank explicitly pending.
- [x] 2.2 Run yarn verify and relevant E2E, review/secret-scan one #78 data PR and wait for latest-head CI, recording actual content acceptance rather than only hash equality.
- [ ] 2.3 After owner-requested merge and deploy, verify published guide statuses and intended related-question links before closing #78.

## Workflow follow-up

- Sync/archive after the guide review is accepted; keep separately justified question-answer corrections outside this change.
