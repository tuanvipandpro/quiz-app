# Design

## Context

AI currently requires Gemini/Groq credentials in the hook and service. Its cache is in memory by account/prompt, and UI provider labels use conditionals. See the proposal for #53 goals.

## Goals / Non-Goals

Keep component/hook/service boundaries and share the validator/prompt; use a small Worker and D1 quota. Do not change quiz persistence or add AI Gateway/R2 or paid inference.

## Decisions

- The Worker uses jose/WebCrypto to verify Firebase RS256 with a JWK cache from the endpoint published in Firebase OIDC discovery; authentication precedes quota and inference. Tests use real RSA JWTs with a fixture key resolver, not a production auth bypass.
- `POST /v1/explanations` accepts a requestId containing UTC date + UUID, question and language. `GET /v1/usage` returns server quota/reset state. The allowlist currently uses `@cf/aisingapore/gemma-sea-lion-v4-27b-it`: live benchmarks found Llama 3.2 3B inadequate for language/reasoning, while SEA-LION improved substantially. Prompt version 6 always instructs/explains in Vietnamese and preserves English technical terms; VN/EN changes only the UI, without imposing a minimum word count on simple questions. The adapter reads chat-completion output and rejects empty/truncated/tool-call responses. Production defaults to disabled; clients cannot supply arbitrary prompt/model/UID/key values.
- The D1 request ledger has primary key `(uid, request_id)` and fingerprints question/fixed explanation language vi/model/prompt version. SQLite BEFORE INSERT triggers atomically enforce user 20/global 100 and the pending-user guard in one statement. Every dispatched reservation counts as an attempt, including upstream failure; outcomes that are uncertain are not automatically refunded. The UI explicitly describes attempt quota. Dated IDs prevent expired retries from consuming new attempts; retention is 2 days, stale pending requests become failed, and they are not re-dispatched automatically.
- Successful results are stored by request for response-loss retries; the frontend memory cache is scoped by account/source/prompt, and UI language changes preserve explanations and pending attempts. Regenerate uses a new UUID. Private explanations are not shared across accounts. Scheduled cleanup removes old ledger entries; requests with prior-day IDs are rejected.
- Body cap 16 KiB; prompt cap 12 KiB in UTF-8; output 1536 tokens; timeout 25s. Measure JWT/hash/validation CPU against the Worker Free 10ms limit; inference wait is not local CPU. A small model may not meet certification-quality requirements: do not enable production before review.
- Source preferences are account-scoped; guests must use BYOK. Without a public API URL, App AI is unavailable and BYOK continues working. Settings show source and quota; dialogs follow the UI skill's error-recovery/disabled-state guidance. The hook owns snapshot/late-request guards; credentials are not copied.
- App AI and BYOK share the Vietnamese prompt and registry labels; original question/options are not translated. Legacy clients sending language en/vi remain supported; the Worker normalizes to vi so a UI language switch does not create a different fingerprint. Existing study flow continues controlling Standard/Learning gating.
- BYOK settings show one key form for the selected provider; provider changes neither alter model-routing order nor discard unsaved inputs. Key acquisition/storage/testing instructions live in a help dialog; errors and results remain near the input. Sign in opens the same `SignInModal` and sign-in hook as the header; closing it returns to the existing form, and the initial Sign in button does not invoke OAuth directly.
- Pass reduced-motion preferences to `ConfigProvider` through the `motion` token and update on media-query changes. Initialize without motion before reading the preference so Ant Design retains a stable MotionProvider and does not remount forms when preferences change. Reduced-motion CSS still applies to custom elements, but modal closing no longer depends on a 0s animation-end event.

## Risks / Trade-offs

- Failed dispatch may already consume Neurons, so it still counts as an attempt; retrying the same ID returns the prior error, while Regenerate is an explicit new attempt.
- If the server process dies between reservation and result storage, the request remains pending until lease expiry; the same ID never invokes inference again. This trades availability for bounded cost.
- Platform free allowance is account-wide. Request counts are an additional guard, not proof of a Neuron budget; there is no paid fallback. D1 outages fail closed.
- CORS is not authorization; Firebase signature/claim verification authenticates the user. Logs exclude keys/token/question/result.

## Migration Plan

Do not migrate quizzes/profiles. Add dependencies/config/tests, then deploy the Worker disabled with D1 migrations and an AI binding after the user sets up Free. Benchmark designated samples before enabling the Worker and building the frontend with its URL. Roll back by disabling the Worker/URL while retaining BYOK. Firebase Rules are unchanged.

## Open Questions

The Cloudflare Free account, staging endpoint and sampled quality/CPU results are recorded in [rollout evidence](rollout.md). App AI and BYOK use prompt v6 with four sections: question analysis, answers, reasons for correct choices and reasons other choices are wrong/less suitable. Both cover every choice/row/blank; App AI stays concise within 1536 output tokens, while BYOK may explain in more detail. Keep global quota at 100/day and personal quota at 20/day through migration 0002 without resetting used attempts. Request limits do not guarantee sufficient Neurons for every payload; Free exhaustion still fails closed. Production activation/smoke, #64 merge and post-merge CI/deploy passed. Split acceptance tasks retain wider quality review as pending and the CPU-boundary benchmark as owner-deferred; see the [acceptance matrix](../../../docs/m1-app-ai-acceptance-53.md). UI/local/staging integration must not be presented as production evidence.
