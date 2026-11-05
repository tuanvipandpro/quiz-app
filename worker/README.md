# App AI — Cloudflare Free

The Worker serves `GET /v1/usage` and `POST /v1/explanations`. Every request requires a Firebase ID token for the correct project; guests continue using Gemini/Groq BYOK. Quizzes, profiles and progress remain in Firestore. D1 stores only the request ledger and private results; the daily cron removes records older than two days (data may remain until the next cron run). Tests neither deploy nor invoke live AI.

## Current production resources

- Worker `quiz-app-ai`: `https://quiz-app-ai.tuanvipandpro.workers.dev`, enabled with `APP_AI_ENABLED=true` on 2026-11-01, version `d46400b0-f4c8-496e-b808-94786c297b8c`.
- D1 `quiz-app-ai`: `2be26a7b-7393-4f50-a857-990d8a1a7d29`, APAC; migrations `0001_ai_requests.sql` and `0002_increase_personal_quota.sql` are applied. The account ID and binding are stored in `wrangler.jsonc`; do not create this database again.
- The GitHub Actions repository **Variable** `VITE_APP_AI_URL=https://quiz-app-ai.tuanvipandpro.workers.dev` is set, and the website has been rebuilt/deployed. This is a public URL, not a Secret; the website receives changes to this variable only after a rebuild.
- This flow requires no provider API key, Firebase service-account secret or Cloudflare API token in GitHub Actions. The Worker uses AI/D1 bindings; manual deployments use the Wrangler OAuth session in the keyring. The GitHub workflow only builds and publishes the website.
- The production Chrome smoke test passed with the user-designated signed-in session: a four-part Vietnamese explanation, quota 19→18, and VN/EN switches preserving the result and quota. #64 merged and post-merge CI/deploy passed. #53 remains open for wider v6 quality review; the owner deferred the CPU-boundary benchmark. See [rollout evidence](../openspec/changes/app-ai-worker/rollout.md#production-activation--2026-11-01) and the [acceptance matrix](../docs/m1-app-ai-acceptance-53.md). Historical sampled p99 is not a boundary pass.

## Local verification

`yarn test:worker` uses real Miniflare D1, signed RSA JWT fixtures and an inference stub. `yarn test:e2e` starts a loopback test API on 5176 and Vite on 5174; `/__test/*` endpoints exist only in the Node fixture, not the Worker. `yarn worker:check` bundles in dry-run mode. Backend CI/CD has separate workflows called by `.github/workflows/test.yml` after component routing; Worker-only changes do not run frontend builds or browser tests.

## GitHub Actions backend CD

After a push/merge to `master`, if the **backend release flag** from the actual push `before..after` is set and `test-and-build` passes, `deploy-backend.yml` downloads the verified `worker-build` bundle from the same run and deploys it with Wrangler `--no-bundle`. Backend CI and release flags are independent: tests, workflow/check scripts, docs or `wrangler.staging.jsonc` changes do not release production. An unverifiable push diff blocks release; retry failed deployments through their corresponding run instead of pushing docs. PRs only run lint/contract/auth/D1 tests and a dry-run bundle; they do not receive deployment tokens or invoke live AI. The workflow uses the lockfile-pinned Wrangler instead of installing a new CLI during release.

Create a custom Cloudflare API token named `quizmos-github-deploy`, scoped to the production account, with Account permissions **Workers Scripts / Edit**, **Workers AI / Read**, **Account Settings / Read** and **D1 / Read**. The Worker currently uses only workers.dev, so Zone permissions are unnecessary. Store the token directly in the repository Actions **Secret** `CLOUDFLARE_API_TOKEN`; never use an Actions Variable, `VITE_*`, a committed source/env file or an issue/chat message for its value. The public account ID is already tracked in Wrangler config; no account ID secret is needed. Cloudflare guidance: [GitHub Actions authentication](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).

CD checks for a credential before deployment. `scripts/check-worker-migrations.mjs` only SELECTs names from `d1_migrations` and compares them with the revision's SQL files; it neither reads the request ledger nor applies SQL automatically. Missing/different migrations, API errors or invalid evidence block release. For a new migration, review and apply it separately through the owner-authorized rollout procedure before rerunning CD; do not grant D1 Edit merely to let CI migrate automatically.

Frontend deployment is separate and receives no Cloudflare secret. CI/workflow changes check both components without independently requesting release; shared prompt, `questionModel.js` or package/lockfile changes may check/release both. Production Worker modules, `wrangler.jsonc` and migration SQL request only backend release. CI/CD setup does not change Firebase Rules, Workers Free, the model or quotas.

## User account setup

For remote work, use `yarn wrangler login --device --browser=false`: open the link and enter the code on the device you are using; the remote machine receives the result automatically. Optionally use `--use-keyring` for the operating system credential store. On Windows, Wrangler needs the `@napi-rs/keyring@1.3.0` helper; if it is installed globally but an old terminal cannot find it, open a new terminal to receive the Windows PATH. `whoami` confirms authentication, not the Workers Free plan. The subscription API may return 403 with Wrangler OAuth scopes; in that case, the owner must confirm the plan in the Dashboard before provisioning resources or invoking a model.

1. In Cloudflare Dashboard, confirm the account is on **Workers Free**. Do not upgrade, buy AI Gateway credits or select a model requiring a payment method. Repository Wrangler configuration cannot independently verify billing status.
2. Run `yarn wrangler login` on your machine; keep the token in the CLI credential store, not chat or a commit. If already authenticated, use `yarn wrangler whoami` to confirm the account.
3. For a new account without resources, create D1 with `yarn wrangler d1 create quiz-app-ai --config worker/wrangler.jsonc --update-config=false`, then update `account_id` and `database_id` in `worker/wrangler.jsonc`. For the existing production account, reuse the stored ID and skip creation. Binding `DB`, AI binding `AI` and the Firebase project ID are configured. R2 and a custom domain are unnecessary.
4. Keep `APP_AI_ENABLED=false`; `ALLOWED_ORIGINS` includes production `https://quizmos.runs-at.dev` and GitHub Pages origin `https://tuanvipandpro.github.io` for rollback. The production website builds at base `/`; local/E2E retain `/quiz-app/`. Add local origins only when needed in staging; do not use wildcards. Run `yarn wrangler d1 migrations apply quiz-app-ai --remote --config worker/wrangler.jsonc` after migration review.
5. Deploy disabled: `yarn wrangler deploy --config worker/wrangler.jsonc`. This production operation must follow the user's rollout instructions. The Worker receives `https://quiz-app-ai.<subdomain>.workers.dev`; the API URL is public configuration, not a secret.
6. Use separate staging to benchmark the model, JWT/validation CPU and Neurons with designated samples. Check correctness for AWS/Google/Anthropic, Vietnamese/English and the question formats; a small model does not automatically meet certification quality. Workers Free allows 10ms CPU/request, so measure both warm and cold key-cache cases. Fixture output is not quality evidence.
7. Only after Free/quality/CPU verification, enable `APP_AI_ENABLED=true`, redeploy, and set `VITE_APP_AI_URL` at frontend build time. CI must receive the URL through the same-named repository variable, already wired into the workflow. Smoke-test auth/quota/BYOK with the designated account. Do not merge an App AI-enabled client before the backend is ready.

## Isolated staging environment

`wrangler.staging.jsonc` targets the separate Worker and D1 `quiz-app-ai-staging`, allowing only local origins on 5173 and 5177. Workers Free was verified in the Dashboard; staging is enabled separately for smoke tests with the user-designated account. Do not benchmark against the production database. For a newly provisioned environment, keep it disabled until quality/CPU/usage and auth smoke results are reviewed; see the resources section above for current production status. Model catalog availability and `default_usage_model=standard` do not prove the account is on Free.

## Concurrent sessions

Each coding session uses its own worktree. Keep the main dev server on 5173; the App AI worktree may run `yarn dev --host 127.0.0.1 --port 5177`. Ports 5174/5176 are reserved for browser tests/API fixtures, not live-data previews. Do not switch branches in a checkout used by another session.

Create an ignored `.env.development.local` in the worktree with `VITE_APP_AI_URL=https://quiz-app-ai-staging.tuanvipandpro.workers.dev`. Staging allows both `localhost` and `127.0.0.1` on 5177; redeploy staging configuration when changing the allowlist. A different port creates a different browser origin and may require signing in again. Production configuration does not change with dev ports.

## Quotas and errors

Migration `0002_increase_personal_quota.sql` changes only the personal-limit trigger from 5 to 20, preserving data and the global limit of 100. A user who has used 5 attempts today has 15 remaining after migration. Apply the migration before deploying the Worker with the new policy; do not edit migration 0001 or delete records to raise quota. The safe rollback is to disable App AI; reducing quota requires a coordinated migration and Worker policy rather than reverting code alone to the old limit. Cached results are not regenerated automatically when the prompt changes; use Regenerate for a prompt v6 explanation.

- Defaults are 20 attempts/user/day and 100 attempts/app/day, enforced by fixed SQL triggers; changes require coordinated policy/migration updates and tests. UID comes from the verified token, not the request body.
- Request ID = UTC date + UUID v4. Reservations are atomic, with one pending request per user. The same ID/fingerprint returns the prior outcome; changed payload conflicts. After the UTC day changes, the old ID expires so cleanup cannot recreate the request. Reset time is displayed in the browser timezone.
- A dispatched request may consume Neurons despite a timeout/provider failure, so it still counts as an attempt. Retry does not dispatch again; Regenerate creates a new attempt. A pending request after a crash becomes TIMEOUT after its 120s lease, without automatic re-dispatch. Client cancellation does not establish that the provider has not run.
- Results are reused only for the request's owning UID; the frontend cache lasts 30 minutes/100 entries and clears on account changes. No public cache or token/key/question/result logging is used. Cron removes records older than two days.
- Limits: 16KiB body, 12KiB total UTF-8 system/user prompt, 1536 output tokens and 25s inference deadline. The allowlist currently contains only `@cf/aisingapore/gemma-sea-lion-v4-27b-it`; clients cannot choose arbitrary models or prompts. Prompt v6 always instructs and explains in Vietnamese while preserving English technical terms; legacy language en/vi is normalized to vi, and the VN/EN toggle changes only the UI. Explanations include question analysis, answers, reasons for every correct answer and reasons why each remaining choice is wrong or less suitable; question/reference content is unverified input. Chat completions must end with `stop`; empty, truncated or tool-call output is rejected.
- The Free account has 10,000 Neurons/day shared across Workers AI. The app's request quota is not a Neuron budget; platform exhaustion must report unavailable, with no paid fallback. D1 outages also fail closed.

## Rollback and status

Set `APP_AI_ENABLED=false` in configuration and redeploy to stop backend inference immediately; alternatively remove Actions Variable `VITE_APP_AI_URL` and rebuild/deploy the website to make App AI unavailable. Users may still explicitly select BYOK; the app does not switch sources automatically. Do not delete D1 data for rollback. #53 remains open for acceptance/the configuration PR; see [rollout evidence](../openspec/changes/app-ai-worker/rollout.md) for live results and evaluation limits. This feature does not close #42 or #52.

References: [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens).
