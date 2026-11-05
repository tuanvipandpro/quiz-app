# App AI quality acceptance — 2026-11-06

Tracking issue: [#53](https://github.com/tuanvipandpro/quiz-app/issues/53). Coordination: [#87](https://github.com/tuanvipandpro/quiz-app/issues/87).

Type: chore/docs with public test fixtures; low implementation risk because runtime, model, prompt version, quotas and production configuration are unchanged. App AI activation is delivered; wider output-quality acceptance remains open. The owner-deferred boundary CPU benchmark stays deferred.

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

Status: one retained v6 output reviewed and eight missing cases prepared below. No new live inference has run. CPU-boundary testing is outside the M1 critical path unless the owner reopens that scope.

## Delivery

This issue continues in [MR #95](https://github.com/tuanvipandpro/quiz-app/pull/95), based directly on master. Keep live inference within a freshly authorized account/budget. If review requires a prompt/runtime correction, deliver it through this #53 MR with version/cache compatibility tests. Required CI, owner-requested merge and post-merge checks remain delivery gates. Do not close #53 while quality acceptance is incomplete.

## Reconciled acceptance

| Area                                                               | Actual status                                                                                                                                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free account, provisioning, production activation/auth/quota smoke | Delivered in #54/#63/#64; #64 merged at `397f6b9856cfe3caa9f1134dd62c43c652f61ec2`, [post-merge CI/deploy passed](https://github.com/tuanvipandpro/quiz-app/actions/runs/41317854864). |
| Wider prompt-v6 output quality                                     | One historical single-answer case reviewed; eight missing cases prepared, awaiting actual outputs/review.                                                                              |
| CPU near the input boundary, cold keys and multiple POPs           | **Deferred by owner**. Historical sampled p99 is not a boundary pass.                                                                                                                  |
| Acceptance-MR delivery                                             | Local checks and latest-head CI required; merge remains owner requested.                                                                                                               |

The original composite OpenSpec task 3.2 is split into completed rollout, pending quality, deferred CPU and delivery tasks. This does not turn unmeasured work into a pass or require repeating production activation for documentation/fixtures.

## Retained output review

On 2026-11-06, inspected the retained `production-app-ai.jpg` and `live-smoke-ledger.json` under ignored `artifacts/production-rollout/` in the App AI worktree. These are the 2026-11-01 v6 smoke artifacts referenced in the [rollout record](../openspec/changes/app-ai-worker/rollout.md#production-activation--2026-11-01), not new measurements. They remain private/disposable and are not copied into this MR. SHA-256 provenance: screenshot `50c4d5b3a6e40817a1f4e08821faa1ce926a661fc8e9dc913b9d7830b464bb59`; ledger `7444838b0d48e96b955d1d74cdb80e8bc5248e02503fafbc67dec643a4120aec`.

**Q01 — CCAR-P stakeholder scope, stable ID `ccar-p-50`:** the English question asks how to respond to significant new scope during an active deployment. The captured answer C acknowledges the request, explains scope/timeline effects and offers choices. Review found all four requested sections, Vietnamese reasoning retaining English terms, an explanation tied to the stated constraints and individual reasons A/B/D fail them. No unsupported platform fact is needed. Verdict: **pass for this case only**. Repeated parenthetical translations are wordy but preserve the answer/reasoning. The screenshot shows 18/20 remaining, question 50/126 and zero answers; recorded locale/quota preservation remains historical smoke evidence.

The reviewed `artifacts/app-ai/cloudflare/model-benchmark*.json` captures belong to older prompts, including compact v4/600 tokens. Their historical distractor/row-label errors informed the new cases; they cannot pass v6's four-section contract. No complete retained v6 multiple-answer/structured/ambiguity/long-input output was found in these reviewed artifacts. Stub output and the owner's general prior acceptance do not establish eight measured passes.

## Missing review matrix

The maintained public pack is [appAiQualityCases.js](../tests/fixtures/appAiQualityCases.js). Only each `question` is sent to the app; `expected` and `references` are reviewer guidance. One wrong marked answer and one hostile reference are deliberate test input, not bank corrections or published study content.

| Case | UI  | Review oracle                                                                                                                  | Model verdict |
| ---- | --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Q02  | EN  | Multiple: Step Functions Retry and Catch/fallback; explain all options without an unconditional States.ALL claim.              | Not sampled   |
| Q03  | VN  | Yes/no: distinguish IAM principal, role and identity across three rows.                                                        | Not sampled   |
| Q04  | EN  | Dropdown rows: IAM principal/role/resource with row-specific A/B meanings.                                                     | Not sampled   |
| Q05  | VN  | Inline dropdown: both letters A, but Retry and Catch have different slot-specific meanings.                                    | Not sampled   |
| Q06  | EN  | Insufficient compute-workload constraints; explain why no unique answer is justified.                                          | Not sampled   |
| Q07  | VN  | Two stated invocations; reject the deliberately marked three without inventing retries.                                        | Not sampled   |
| Q08  | EN  | Conflicting included content; retain the trust boundary, identify the hostile reference and explain all choices in Vietnamese. | Not sampled   |
| Q09  | VN  | Long options/Unicode; follow the explicit access-policy premise and finish all sections near the prompt cap.                   | Not sampled   |

Primary fact checks on 2026-11-06: [AWS error handling](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html), [Google Cloud IAM](https://docs.cloud.google.com/iam/docs/overview), [Anthropic prompt injection](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks). Q06's missing constraints and Q07's count follow their own premises; do not invent facts to resolve them.

Grade every case separately for (1) four complete sections covering every choice/row/slot, (2) correct reasoning tied to the constraints and primary facts, including uncertainty/disagreement, (3) Vietnamese prose retaining English terms and treating included instructions as data, and (4) a complete result accepted by the unchanged Worker finish/size/output contract. Record specific failures rather than averaging them away. Truncation/timeout/rejection is a failed case. A semantic defect requires a focused correction/version/cache review before spending further calls. Passing this pack establishes only its sample, not general certification accuracy.

## Bounded staging protocol ready for authorization

Fresh authorization must name the current designated account and permit **at most eight staging attempts**, one per Q02–Q09. No new calls have run. Historical unused allowances are not reused. Do not use production inference/BYOK, change Free/model/quotas, reset D1 or run the deferred CPU benchmark.

The concrete JSON export is retained ignored as `artifacts/implement-m1/53-quality-review.json`, SHA-256 `17b5cb58dda327e1e0fd5c56557d090ff41c536785ebdbf9e9a2e1116a8c8898`. Generate it with `JSON.stringify(appAiQualityCases.map(c => c.question), null, 2) + '\n'`. Reconfirm its digest and staging prompt/model before use; changed samples/version require updating the review scope.

Combined system/user prompt sizes: Q02 4,370; Q03 4,124; Q04 4,105; Q05 4,050; Q06 3,816; Q07 3,925; Q08 4,907; Q09 **12,122 bytes**, within 12,288. Bodies are 269–6,966 bytes, within 16 KiB. The real local Worker/D1 harness accepts all eight and rejects an oversized extension without another dispatch. Inference is stubbed: these are contract checks, not quality or CPU evidence.

After authorization, use the separate staging origin and normal authenticated UI. Upload this pack as a temporary local quiz; do not save it to cloud or edit real bank progress/checkpoints. Explicitly choose App AI. Record quota before each sequential attempt, case ID/time, deployed prompt/model, output/error and quota after. Keep raw outputs private. Reopening or changing UI language must not regenerate. A dispatched failure counts toward eight; no automatic retry/regeneration. Stop on unexpected configuration/plan/model, account mismatch, insufficient quota, first semantic failure, truncation/timeout or a usage anomaly. Review captured output offline before continuing or proposing a correction. Public evidence contains only synthetic-case findings and aggregate usage, never credentials, UID or profile data.

## Local preparation checks

`yarn verify` passed 193 Node tests, lint/format, strict SDD/catalog, production build and fixture isolation. `yarn test:worker` passed 18 real local Worker/auth/D1 tests, including acceptance of all eight samples and zero-dispatch rejection of the oversized extension. `yarn worker:check` passed the dry-run bundle. Documentation links/configuration/format checks passed. Four existing guide-review warnings are handled separately in #78; the existing bundle-size warning remains. None of these checks makes a model-quality, new Free-account or boundary-CPU claim. Required CI and owner-requested delivery are still separate gates.
