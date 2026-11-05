# Cloudflare rollout evidence

Status reconciled on 2026-11-06: production activation and Chrome smoke passed on 2026-11-01; #64 merged and post-merge CI/deploy passed. Wider v6 quality acceptance remains open in #53; the CPU-boundary benchmark is **Deferred by owner**. See the [acceptance matrix](../../../docs/m1-app-ai-acceptance-53.md). Dated sections below preserve deployment history and their then-current status.

## Account and staging

- Workers Free was verified in the Dashboard: **Free / $0 / Current plan**, and confirmed by the user. The subscription API returned 403; `default_usage_model=standard` was not treated as billing-plan evidence.
- Device login succeeded. OAuth is stored in the Windows keyring; its token was neither printed nor committed. Codex command sessions need an updated Windows PATH to find the globally installed keyring helper.
- Separate staging D1: `quiz-app-ai-staging`, ID `3b0d6b06-7e9d-4dd1-95c8-57c3652ead89`, APAC location hint; migration `0001_ai_requests.sql` is applied.
- Staging URL: `https://quiz-app-ai-staging.tuanvipandpro.workers.dev`. The initial AI-disabled version was `9f4fb0c1-cb66-455f-b967-3ce89611573f`; the optimized JWK/prompt v4 version was `bf29c051-1616-4d67-b034-7af9422a3148`.
- Staging permits only local browser origins on 5173/5177 and still requires a valid Firebase ID token. No production Worker or D1 was created/enabled at this stage; the GitHub Pages repository variable was unchanged.
- An ignored `.env.development.local` connects the local app to staging; production builds do not read this development-only variable.

## Live model evaluation

Used public examples, three public bank questions, one intentionally mislabelled answer and one underspecified question. No private custom quiz was sent. Raw results/screenshots remain in ignored `artifacts/app-ai/cloudflare/`.

1. Llama 3.2 3B failed evaluation: an EN request produced VN output, fabricated details and contradictory reasoning.
2. Language-specific prompts and system instructions fixed language selection, but the small model still handled missing context poorly.
3. Selected `@cf/aisingapore/gemma-sea-lion-v4-27b-it` from the available catalog. Its official schema uses chat-completion; the adapter reads that format and rejects empty, truncated or tool-call output.
4. The SEA-LION sample had 18 cases with the requested language and semantically correct primary answers; all ended with `stop`. The provider reported **397.608164 Neurons**. REST latency from this machine was **1.540–5.273s**, median **3.3365s**; this is not Worker CPU time.
5. Review found two distractor-analysis errors: reversing the Step Functions/Lambda relationship and misidentifying a dropdown-choice label. Prompt v4 restricted App AI to the primary answer/core rationale, retaining detail for BYOK. Six focused reruns retained correct answers/languages without repeating those errors, though some wording remained unnatural. This small sample does not establish accuracy across all certification content.

No paid plan, payment-required model or AI Gateway credits were used. SEA-LION reports use provider-returned `usage.neurons`, not estimates based on Llama 3B coefficients.

## Live authentication and quota

- The user designated the existing signed-in app session and authorized at most two staging explanations. Exactly two were run, EN and VN; both succeeded and quota changed **5 → 4 → 3**.
- An aggregate D1 query confirmed **2 records in `done` state**, without reading/printing UID or private content in quota evidence.
- Before/after testing: the same question 1/136, 0/136 answered; no answers were selected, questions changed or Save position pressed. UI language was restored to EN. BYOK keys were not edited.
- Anonymous `/v1/usage` returned 401 `AUTH` as contracted. Live screenshots containing the account name remain local/ignored and are not published in the repository.

## Worker CPU

- GraphQL Analytics showed initial cold X.509 authentication around **15.347 ms**, although requests succeeded through runtime flexibility. This was not treated as meeting the Free 10 ms target.
- Switched to the JWK endpoint published in Firebase OIDC discovery, retaining jose/WebCrypto and complete signature/issuer/audience/time/non-anonymous checks. Public/imported-key caching preserves TTL/rotation semantics; real RSA/JWK signing tests were added.
- After optimization, the smoke window had **6 invocations**, **0 Worker errors**; the highest grouped p99 values were **6.066 ms** and **7.271 ms**. Microsecond units were confirmed through GraphQL schema introspection.
- This is cold/warm evidence from a small real-payload sample, not a load test or worst-case 12 KiB prompt evidence across every POP.

## Isolated worktree — 2026-11-01

- Moved the App AI session into a separate managed worktree on branch `codex/app-ai-worker` after the CTFL session took the original checkout. The original checkout's branch and CTFL changes were untouched.
- The separate dev server uses 5177 and its own ignored `.env.development.local`. Browser inspection opened Quiz Bank; the actual module on 5177 contained the App AI hook and staging URL. The new origin has its own sign-in session.
- Staging version `d69a6f3f-f5a8-4e89-a928-e10bda988f82` added `localhost:5177` and `127.0.0.1:5177` to the allowlist while retaining 5173. Production configuration was unchanged.
- Live CORS checks: OPTIONS from 5177 returned 204; unauthenticated GET usage from both 5177 hosts and localhost:5173 returned 401 AUTH with the correct allow-origin; an unlisted origin returned 403 ORIGIN without allow-origin. No inference or additional live quota was used.
- `yarn install --frozen-lockfile` and `yarn verify` passed in the new worktree, including 147 Node tests and production build/isolation. Local E2E was not rerun because another session occupied the test port; UI smoke covered desktop EN/dark only, with no layout change.

## Production provisioning — 2026-11-01

- PR #54 merged into master at `552eda7`; post-merge CI and website deployment passed. This step did not automatically deploy or enable the Worker.
- At the user's setup request, created production D1 `quiz-app-ai` (`2be26a7b-7393-4f50-a857-990d8a1a7d29`, APAC) and applied migration `0001_ai_requests.sql`. A read-only schema check confirmed the table, two indexes and `ai_reserve` trigger; quiz/profile data was neither read nor modified.
- Production Worker: `https://quiz-app-ai.tuanvipandpro.workers.dev`, initially provisioned as `f1b08ebb-53b8-410b-99ea-e4ada7aaf399`, then running prompt v5 at version `69e7f7a7-b3d1-428a-89bb-abe732409d2f` with `DB`/`AI` bindings, cleanup cron and `APP_AI_ENABLED=false`. Production-origin preflight returned 204, unauthenticated requests returned 401 AUTH with the correct allow-origin, and unlisted origins returned 403 ORIGIN.
- The GitHub variable `VITE_APP_AI_URL` was not configured and the frontend was not rebuilt to enable App AI at this stage. No secret or Cloudflare plan change was added; the account remained the one the owner confirmed as Workers Free.
- The user authorized at most four Explain calls for this rollout: two staging large-payload checks and two production EN/VN UI checks, with explanations always Vietnamese per the new preference. None had been used because the app session was signed out and Google account selection did not finish; no browser token was extracted or real auth replaced with fixtures. Synthetic EN/VN samples passed validation with prompt v5 at 12,077 bytes for both UI locales within the 12,288 cap; these samples still lacked live inference/CPU evidence.
- Results, the configuration PR and status remain tracked in [issue #53](https://github.com/tuanvipandpro/quiz-app/issues/53). Raw logs/test samples are in ignored `artifacts/production-rollout/`.

## Vietnamese explanation policy — prompt v5

The user confirmed that explanations always use Vietnamese while preserving English technical terms, independently of VN/EN. The shared prompt applies to App AI/BYOK; the Worker accepts legacy language en/vi but normalizes to vi. Cache/retry does not spend another attempt solely because UI locale changes; the result region declares lang=vi. Questions/options and quiz data are unchanged.

Staging deployed v5 as `9cedad12-fdfb-4b90-8381-24462b359f69`; production v5 remained disabled. The live v3/v4 benchmarks above are historical evidence, not v5 explanation-quality verification. v5 checks currently use fixtures; live smoke must finish within the user's authorized limit before production enablement.

## Complete explanations and quota 20 — prompt v6

The user requested question analysis, justification for every correct answer and every wrong/less-suitable choice, followed by a quota increase. Prompt v6 applies all four sections to App AI/BYOK, retaining Vietnamese and English technical terms; App AI caps output at 1536 tokens. Migration 0002 raises personal quota from 5 to 20 while preserving global 100/day and data.

Applied the migration and deployed staging version `9c8b11cc-b7a3-4c87-ab6a-c6a21bd58f92` and production version `509bbd39-1e69-4e60-abdf-99c300b78c79`. Production remained disabled. Aggregate ledger before/after migration: staging retained 5 records and 5085 stored result characters; production retained 0 records. Used attempts were not reset.

Local verification: 182 Node tests, 15 Worker/auth/migration tests and 20 AI browser cases passed. UI fixtures check four headings, each choice and long-token wrapping in existing viewports/themes; they do not evaluate model quality. The user manually tested live, supplied four-part output and accepted the current version; no additional inference was run for formatting. Chrome showed the signed-in session and real staging quota, resolving the initial sign-in blocker. Comprehensive live v6 quality/CPU measurement is still missing; task 3.2 remains open.

## Production activation — 2026-11-01

- After the user manually checked prompt v6, accepted its output and requested PR #63 merge, continued the already-authorized setup/activation. PR #63 merged at `c33295ba45b9e18bdd32f925566ca0c12bb244ad`.
- Staging analytics review starts only at v6 deployment `9c8b11cc-b7a3-4c87-ab6a-c6a21bd58f92`: **6 requests, 0 errors**, highest grouped CPU p99 **9.123 ms**. Older v5 samples are not attributed to v6. These are invocations rather than inference counts, and do not establish worst-case payload/POP behavior.
- Worker dry-run passed; production deployed with `APP_AI_ENABLED=true`, version `d46400b0-f4c8-496e-b808-94786c297b8c`. Model, quota, D1, allowlist and Workers Free were unchanged. Read-only settings confirmed enablement; production preflight returned 204, unauthenticated usage 401 AUTH, and unlisted origins 403 without allow-origin.
- Set the GitHub Actions repository Variable `VITE_APP_AI_URL=https://quiz-app-ai.tuanvipandpro.workers.dev`, without adding a secret. Rerunning verify and its dependencies in [master run 41312669951, attempt 2](https://github.com/tuanvipandpro/quiz-app/actions/runs/41312669951/attempts/2) passed and deployed the website. Independent jobs retained their earlier successful results. Production HTML HTTP 200 served `/assets/index-BFrdsZ45.js`, matching gh-pages; the HTTP 200 asset contained the production API URL and no staging URL.
- Chrome on `https://quizmos.runs-at.dev` restored the designated account session. Used **1/2 authorized production calls**; neither of the 2 staging calls in this rollout was used. Public CCAR-P question 50 returned **C**, four Vietnamese sections and A/B/D reasoning aligned with transparency/scope/timeline constraints. Quota **19→18**; VN then EN preserved the answer and 18/20, with result region `lang=vi`. No answer was selected, question changed or Save position pressed: before/after remained question 50/126, 0 answered and the same checkpoint. BYOK keys were neither used nor edited. Screenshot/ledger remain ignored in `artifacts/production-rollout/`.
- The production sample after enablement had **10 requests, 0 errors**, highest grouped CPU p99 **9.207 ms**. It includes different Worker request types, not only inference. Together with the user-accepted quality sample, it confirms operational rollout, not all certification questions, near-cap payloads or every POP. Historical Neurons measurements above are not attributed as v6-specific costs.

## Pending acceptance

Production activation, one live smoke call, #64 merge and [post-merge CI/deploy](https://github.com/tuanvipandpro/quiz-app/actions/runs/41317854864) are complete. The original composite task 3.2 is split in [tasks](tasks.md): rollout complete, wider quality pending, CPU-boundary work owner-deferred and acceptance-MR delivery pending. One good answer or small-sample p99 does not establish missing criteria. The eight-case staging pack is ready for fresh account/budget authorization; this reconciliation ran no live inference and routine tests use stubs.
