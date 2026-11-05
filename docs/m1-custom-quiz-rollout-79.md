# Custom-quiz rollout verification plan

Tracking issue: [#79](https://github.com/tuanvipandpro/quiz-app/issues/79). Coordination: [#87](https://github.com/tuanvipandpro/quiz-app/issues/87).

Type: chore/docs planning. Begin with read-only evidence reconciliation; implementation and production acceptance remain open.

## Existing source of truth

- [Release procedure](../firebase/README.md)
- [Custom-quiz acceptance matrix](../openspec/changes/custom-quizzes-42/verification.md)
- [Existing tasks](../openspec/changes/custom-quizzes-42/tasks.md)

## Work package

1. Read current #42/#79 records and locate any owner-supplied publication/smoke evidence. Distinguish historical snapshots from current published state; the old zero-login finding is not a claim about today's credentials.
2. Through an already authorized owner/admin connection, retrieve the published Rules revision and complete indexes/field overrides. Record revision/hash/time/provenance without private question contents or credentials. Compare actual deployed policy with the supplied baseline and candidate, including overlapping grants and profile access.
3. Reconcile a candidate locally if required. Run baseline/candidate emulator SDK scenarios for owner/guest/Bob, 3-slot concurrency, 1/100 question boundaries, version conflicts, replacement/checkpoints and size failures. An index fragment alone is not a deployable configuration.
4. Only when the applicable rollout/account scope is authorized, verify bounded designated-account save/read/reload/second-context/delete behavior. Keep access or live-evidence gaps open; do not use personal incidental accounts or call local fixtures production proof.
5. Update Firebase/README/OpenSpec release status with actual evidence. Preserve closed #42 history and use #79 for the follow-up. Any real Rules/index change has a reviewable PR and follows the existing release order/rollback procedure; unchanged deployed policy may need only evidence/document reconciliation.

Required outputs: provenance/drift comparison, scenario-to-evidence matrix, permitted production-smoke result and an explicit remaining-gap list. Status: not executed by this plan.

## Delivery

This issue has its own planning MR based directly on master. Preserve closed #42 history. Subsequent evidence/configuration work follows #79 and the release procedure; no production mutation is performed by this planning MR. Verify this Markdown, local links and referenced contracts; run applicable emulator/runtime checks only when the later implementation changes those boundaries. Close #79 only after its actual rollout evidence and required PR/CI gates are satisfied.
