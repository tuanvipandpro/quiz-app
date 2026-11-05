# Tasks

## 1. Backend

- [x] 1.1 Implement Firebase JWT verification and bounded Worker inference (CQ-AI-01/02); verify signed-token/claims and malformed input tests.
- [x] 1.2 Implement D1 quota, request identity, private result reuse and cleanup (CQ-AI-03/04); verify real local D1 concurrency, retries, reset and failure tests.
- [x] 1.3 Document pinned setup/config, Free-only enablement and rollback; verify Worker dry-run build and local integration commands.
- [x] 1.4 Raise the personal allowance to 20/day with global 100/day unchanged; apply a forward migration preserving used attempts/results and verify the old five-attempt boundary and new concurrent limit.

## 2. Frontend

- [x] 2.1 Implement account-scoped source selection, HTTP adapter and cancellation/cache semantics (CQ-AI-05/06); verify unit tests and browser account/mode flows.
- [x] 2.2 Implement quota/settings/error UI VN/EN (CQ-AI-07); verify phone/desktop/theme matrix, focus and selected rendered screenshots.
- [x] 2.3 Simplify BYOK settings with one provider editor, on-demand help and the shared sign-in dialog; verify key preservation, errors, keyboard focus and responsive VN/EN themes.
- [x] 2.4 Always explain in Vietnamese while preserving English technical terms for App AI and BYOK; verify server policy, legacy requests, cache/retry reuse across UI language changes and accessible result language.
- [x] 2.5 Require question analysis, the selected answers, reasons for every correct choice and reasons for every alternative; verify all supported formats and readable four-part Markdown with a bounded 1536-token App AI output.

## 3. Acceptance

- [x] 3.1 Run verify, Worker integration and E2E suites; update scenario evidence and PR with actual results/limitations.
- [x] 3.2 Verify the Free account and complete authorized production provisioning/activation/smoke, configuration merge and post-merge CI/deploy; preserve historical evidence from #54/#63/#64.
- [ ] 3.3 Complete the wider prompt-v6 quality review across all formats, ambiguity, incorrect marked answers, conflicting references and long input; use retained evidence first and a freshly authorized bounded staging sample for missing outputs.
- [ ] 3.4 Measure near-cap/cold-key/multi-POP CPU and usage boundaries. **Deferred by owner**; outside the M1 critical path and not reported as measured or passed.
- [ ] 3.5 Deliver the #53 acceptance MR through latest-head required CI, owner-requested merge and post-merge checks; keep the issue open while quality acceptance remains incomplete.

The original composite task 3.2 was split on 2026-11-06 to distinguish completed rollout from pending quality and explicitly deferred CPU work. See [acceptance matrix](../../../docs/m1-app-ai-acceptance-53.md). No new inference or quality pass is implied by the split.
