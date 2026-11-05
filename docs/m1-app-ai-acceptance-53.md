# App AI quality acceptance plan

Tracking issue: [#53](https://github.com/tuanvipandpro/quiz-app/issues/53). Coordination: [#87](https://github.com/tuanvipandpro/quiz-app/issues/87).

Type: chore/docs planning. App AI activation is already delivered; output-quality acceptance remains open. The owner-deferred boundary CPU benchmark stays deferred.

## Existing source of truth

- [Worker release instructions](../worker/README.md)
- [Current tasks](../openspec/changes/app-ai-worker/tasks.md)
- [Rollout evidence](../openspec/changes/app-ai-worker/rollout.md)
- [Verification matrix](../openspec/changes/app-ai-worker/verification.md)

## Work package

1. Reconcile the issue's current acceptance with historical app-ai-worker artifacts. Activation/#64 merge/deployment already have evidence. The current issue explicitly defers the boundary CPU benchmark by owner decision; keep it labelled Deferred and avoid treating a small historical p99 sample as a pass.
2. Prepare an offline review matrix covering all five question formats, single/multiple answers, ambiguity/incorrect marked answers, long options and conflicting included content. Grade captured prompt-v6 outputs for the four requested sections, correct per-choice reasoning, Vietnamese with preserved English terms and honest uncertainty. Record failures against source facts/primary references, not fixture formatting alone.
3. Use existing captured evidence first. If missing cases require new model output, define a bounded staging sample, current designated account/budget and stop conditions before running live inference. Historical unused call allowances are not a fresh unlimited authorization. Routine tests remain fixture-based; no new model, quota, plan or paid fallback is part of this work package.
4. If the review identifies a prompt/runtime correction, scope it in a focused #53 PR with prompt-version/cache compatibility tests and required Worker/UI checks. Otherwise deliver the review/evidence reconciliation only.
5. Before closure, split the status of original composite task 3.2 transparently: completed rollout, remaining/passed output quality and explicitly deferred CPU-boundary work. Do not check a combined task as fully measured when part is deferred. Record the accepted scope and actual post-merge/rollout evidence.

Required outputs: reviewed case matrix, quality findings/resolutions and coherent acceptance/deferred status. Status: not executed by this plan. CPU-boundary testing is outside this M1 critical path unless the owner reopens that scope.

## Delivery

This issue has its own planning MR based directly on master. Review source facts and the retained/deferred status; keep live inference within a current authorized account/budget, and use fixtures for routine checks. If later review requires a prompt/runtime correction, deliver it through the focused #53 MR with relevant tests and evidence. Planning readiness does not establish model-quality acceptance or a measured CPU-boundary pass.
