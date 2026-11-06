# QuizMos

Signed-in App AI is implemented behind an optional API URL and a disabled-by-default Worker. Guests use Gemini/Groq BYOK. See [Cloudflare Free setup and rollout](worker/README.md) and [App AI verification](openspec/changes/app-ai-worker/verification.md) for #53; local fixtures do not establish production/model readiness. Quiz persistence remains Firestore.

Practice certification questions, take timed mock exams and read curated study guides. React 19, Vite, Ant Design and Firebase.

The root opens a dark-first landing with four viewport sections, native scroll snap and reduced-motion support; **Start practicing** opens `#/library`. **Donate** is visible in the header/hero and opens `#/donate`; its Back buttons return to the first Home section. Public receiving details and its activation flag live in [donation configuration](src/data/donation.js). Recheck the static QR and bank recipient before changing or reactivating the receiving account.

[Live app](https://quizmos.runs-at.dev/) · [Agent workflow](AGENTS.md) · [Custom-quiz cloud storage backlog](https://github.com/tuanvipandpro/quiz-app/issues/42)

Core instructions live in the compact [AGENTS.md](AGENTS.md); task-specific policy is in the [contributor guide](docs/contributing.md). Read the sections relevant to the work. The PR checklist records evidence; CI enforces automated checks, while visual and architectural judgment require review.

## Local UI/UX skill

UI/UX Pro Max is installed in [.agents/skills/ui-ux-pro-max](.agents/skills/ui-ux-pro-max/SKILL.md), pinned to the reviewed upstream commit with scripts, data, references and license included. For UI work, use `$ui-ux-pro-max` and follow `AGENTS.md`; record the guidance applied and browser evidence. See [setup, search commands and update procedure](docs/ui-ux-skill.md). Search needs Python 3; `yarn check:ui-skill` checks payload integrity offline without Python and is included in `yarn verify`.

## Run locally

Use **Node 24 LTS** (`.nvmrc`) and **Yarn 1.22.22** (`packageManager`). Install Yarn using your Node manager/Corepack, or `npm install --global yarn@1.22.22`.

```sh
yarn install --frozen-lockfile
yarn doctor
yarn dev
```

Development runs at **http://localhost:5173/quiz-app/** with a strict port. E2E tests launch their own isolated server on **5174**; they never reuse the development server. `yarn preview` serves the production build separately.

The committed `src/config/firebaseProject.json` contains the app's public Firebase web identifiers. To use another project, copy `.env.example` to `.env` and fill the optional overrides. `.env` is local and untracked. Gemini/Groq provider keys are entered in the signed-in **AI Settings** UI; do not put provider secrets in `VITE_*` variables or source control.

Untracking `.env` does not remove previous commits. Rotate provider keys that were committed previously; Firebase's public web identifiers are a separate kind of configuration.

Follow the [credential policy](docs/contributing.md#credentials-and-secrets): review staged/outgoing changes and run a redacted secret scan before push. Use GitHub Actions Secrets for authorized CI/deployment secrets, and backend/Worker secret storage for private runtime keys. Secrets injected into `VITE_*` or generated frontend files become public. Commit only secret names/references and blank or synthetic examples.

## Commands

| Command                                     | Purpose                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `yarn doctor`                               | Check Node, installed tooling, lockfile and environment tracking                                  |
| `yarn check:ui-skill`                       | Verify the pinned UI/UX skill payload and provenance offline                                      |
| `yarn lint`                                 | ESLint checks across application, scripts and tests                                               |
| `yarn format` / `yarn format:check`         | Apply/check the formatting baseline; excludes banks and generated files                           |
| `yarn test`                                 | Node unit/integration tests, with isolated Firebase/AI boundaries                                 |
| `yarn check:catalog`                        | Validate counts/schema/duplicates; report guides needing review                                   |
| `yarn check:guides`                         | Same check, failing while guide review is outstanding                                             |
| `yarn build` / `yarn check:build`           | Build production and ensure no E2E auth/profile fixtures leak into it                             |
| `yarn test:e2e`                             | Playwright desktop and phone flows                                                                |
| `yarn test:e2e:headed` / `yarn test:e2e:ui` | Inspect browser tests interactively                                                               |
| `yarn sdd:validate` / `yarn sdd:status`     | Validate SDD structure / inspect planning artifacts                                               |
| `yarn test:rules` / `yarn emulators:start`  | Test or inspect the local Firestore baseline (Java 21+)                                           |
| `yarn verify`                               | Doctor, UI skill integrity, lint, format, Node tests, SDD/catalog validation, build and isolation |
| `yarn verify:all`                           | All standard checks, Firestore baseline tests and browser tests (Java 21+)                        |

Install the test browser once:

```sh
yarn playwright install chromium
yarn test:e2e
```

Browser tests render the actual app using test-only auth/profile services selected by `vite.e2e.config.js`. They cover the library, aliases, checkpoint resume, JSON validation/formats, answer restoration, sign-out confirmation and exam lifecycle. External requests are blocked; tests never sign into a real account or call a paid AI API. This is not a substitute for deployed Firestore Rules tests or physical iOS/Android checks.

## SDD setup for issue #42

OpenSpec **1.15.0** is pinned locally. Its Codex workflows are generated in `.agents/skills/`; reopen the agent/IDE if new skills are not discovered immediately. Use the pinned wrapper, which disables telemetry/update checks:

```sh
yarn sdd list
yarn sdd:status
yarn sdd:validate
yarn sdd instructions apply --change custom-quizzes-42 --json
```

Read [proposal](openspec/changes/custom-quizzes-42/proposal.md), [requirements](openspec/changes/custom-quizzes-42/specs/custom-quizzes/spec.md), [design](openspec/changes/custom-quizzes-42/design.md), [tasks](openspec/changes/custom-quizzes-42/tasks.md) and the [acceptance matrix](openspec/changes/custom-quizzes-42/verification.md). Implementation and production rollout have separate evidence; `planningComplete` or a successful build does not mean #42 is deployed. Review the [Rules/indexes release procedure](firebase/README.md) before merging/enabling persistent uploads.

The default workflow is one feature/change in one PR, with specs and implementation evolving together. The separate setup PR is the one-time bootstrap. OpenSpec config references AGENTS.md, which routes to the maintained [feature workflow](docs/contributing.md#spec-driven-work).

### Firestore baseline and local tests

`firebase/baseline/firestore.rules` preserves the baseline supplied by the user as published rules for `quiz-app-f70d5`; provenance and its LF-normalized hash are in `firebase/rules-baseline.json`. It was not independently exported through the management API. `firebase/firestore.rules` is the candidate policy adding three private custom-quiz slots while preserving profile access. Recheck the published Rules and complete indexes before rollout; no production deployment is implied by these files.

Install **Java 21+**, set `JAVA_HOME`, and put its `bin` directory on PATH. No Firebase login or production credentials are needed for these tests:

```sh
yarn test:rules
yarn emulators:start
```

The runner tries JAVA_HOME, PATH, then an optional portable JDK under ignored `artifacts/tools/java21/`. The setup on this machine used a checksum-verified Temurin 21 archive there without changing system settings. That archive is not committed; fresh clones/CI must provide Java. `yarn doctor:sdd` checks availability without starting an emulator.

The runner uses only project `demo-quiz-app`, binds Firestore to `127.0.0.1:8080` (hub 4400, logging 4500), and refuses project/config override arguments. `test:rules` starts the emulator, executes the client-SDK baseline suite, then stops it. Direct test execution without the expected emulator environment fails closed. Auth contexts are mocked by the Rules test library; rules-disabled contexts only seed fixtures.

The local Firebase config is deliberately named `firebase.emulator.json`; no production alias, deploy command or Firebase deploy CI job is added. CI installs Java 21 and runs these baseline tests before browser tests and website deployment. `verify` now includes SDD structural validation; `verify:all` also requires Java and runs rules/E2E tests.

The seven historical baseline tests prove the supplied policy locally. Candidate Rules and real-SDK transaction tests cover custom ownership, quotas, concurrency, stale revisions and checkpoint resets. Browser tests replace the custom-quiz service as well as auth/profile; they complement the real Emulator tests. Firebase Tools is pinned to 15.34.2; Rules Unit Testing 5.0.0 remains compatible with Firebase 12.

On failure, inspect `playwright-report/` and `test-results/` for screenshots and traces. CI retains them for seven days. No automatic retries hide a failing test. To run one project: `yarn test:e2e --project=phone`.

## Product behavior

- The catalog has **20 unique banks**, grouped by provider. AWS AIP-C01 and Anthropic CCAR-P are featured.
- EN is the first-visit default. The VN/EN toggle changes UI labels, not question/guide content. Light/dark preferences persist.
- **My quizzes** validates and previews JSON with 1–100 questions, up to 1 MiB per file. Guest uploads stay in the tab. Signed-in users explicitly save up to **3 private cloud quizzes**, with rename, JSON replacement, delete and custom checkpoints. Cloud document saves use a conservative **750 KiB** serialized envelope budget; valid raw files may still be too large to save. Errors retain the preview for retry. Compatible Firestore Rules must be deployed and verified before the client is enabled in production (see #42 rollout status).
- Practice gives feedback and supports manual cloud checkpoints for bank quizzes. Mock exam defaults to **Standard exam**, which reveals answers after submission or expiry. **Learning exam** shows feedback once each question is fully answered; answers stay editable until the exam ends and the score uses the final answers. Both modes preserve shuffled questions, answers, flags, mode and the absolute deadline across refresh.
- Exam setup shows the saved draft's mode. **Resume** keeps that draft's settings; changed selections apply to **Start a new exam**, with confirmation before replacing a running draft. Legacy drafts/links default to Standard. Switching accounts during an exam returns to setup without creating a draft for the next account.
- AI Settings lives in the account menu. Sign-out requires confirmation and clears tab drafts; cloud checkpoints and saved profile keys remain.
- `aws-ace` is a legacy alias for **Google ACE**, not a Cloud Practitioner bank. Its retired static JSON remains only for old asset URLs. Links and account-scoped progress/drafts resolve to `gcp-ace`.
- Multiple-choice `answer` values are arrays; yes/no and dropdown values are mappings. The authoritative validator is `src/utils/questionModel.js`. Complete examples and format help appear on My quizzes and in `public/examples/`.

## Source layout

```text
src/
  App.jsx                  Routes, quiz loading, study orchestration
  components/              Header, library, upload, study and account UI
  styles/                  Tokens, shell, library, study and upload styles
  contexts/ + hooks/       Auth, language, navigation and session state
  data/ + i18n/            Catalog, aliases, brands, formats and messages
  services/                Firebase boundaries and guide loading
    llm/                   Credentials, explanation cache and Gemini/Groq routing
  utils/                   Validation, scoring, importing and draft/progress helpers
public/
  quiz/                    Static question banks
  summaries/               Published meta.json + Vietnamese study content
  examples/ + providers/   Sample uploads and branded assets
tests/
  *.test.js                Node tests
  e2e/                     Playwright scenarios
  firestore/               Client-SDK baseline Rules tests (demo emulator only)
  fixtures/                Isolated auth/profile service doubles
scripts/                   Diagnostics, SDD/emulator runners, checks and imports
openspec/                  Accepted baseline specs and the pending #42 change
.agents/skills/            OpenSpec workflows and the pinned local UI/UX skill
firebase/                  User-supplied rules baseline and provenance
```

Legacy Copilot instructions and old manual harnesses are not required to build or test. Use AGENTS.md to locate relevant contributor/skill guidance; public study guides are app content and remain published.

## Data changes and study-guide review

Preserve IDs and marked answers unless a review explicitly authorizes a correction. Check the actual content against the provider/exam before changing metadata. Schema, count and duplicate checks do not prove exam alignment.

The historical Anthropic importer remains available as `node scripts/import-anthropic-quizzes.mjs <snapshot-directory> --check`. Remove `--check` only for an intentional reviewed import; generated reports go to ignored `artifacts/imports/`; keep them separate from development guidance.

Four guides currently require content/coverage review:

| Guide  | Reviewed questions | Current bank |
| ------ | -----------------: | -----------: |
| CCAR-F |                175 |          201 |
| CCAR-P |                 63 |          157 |
| CCAO-F |                119 |          151 |
| CCDV-F |                 53 |           96 |

AIP-C01's reviewed fingerprint matches its 136-question bank. Existing guide warnings are intentional. Review the Markdown, concepts, primary references and topic-to-question mappings before updating `sourceQuestionCount`/`sourceQuizHash`. Do not relabel a stale guide as reviewed merely to make a check green.

## Delivery

Every change starts with assessment and a GitHub tracking issue before implementation, including documentation, tests, data and configuration work. Reuse a matching open issue or create one with the [tracked-change form](https://github.com/tuanvipandpro/quiz-app/issues/new/choose). Follow [the tracking policy and work-type matrix](docs/contributing.md#tracking-every-change) for feature, bugfix, hotfix, refactor, minor, docs, chore and data changes. Isolated color/logo/display-copy changes can use the [minor check plan](docs/contributing.md#minor-changes-and-verification-effort): brief issue/PR, applicable formatting/lint/build and focused visual/smoke checks. Documentation and policy/template-only changes need content/link/format/config checks rather than full local runtime verification. Required CI follows the actual changed-file scope, independently of the selected work-type label.

Link the issue and PR in both directions using `Tracking issue: #N` / `Refs #N`. Keep the issue open through implementation, CI and merge. Close as completed only after acceptance evidence, passing required CI on the latest head, merged PRs and any required post-merge deployment/configuration checks are recorded. Use explicit closure after verification instead of automatic closing keywords; see [the delivery lifecycle](docs/contributing.md#implement-verify-merge-then-close).

CI uses [component routing and docs/assets/full profiles](docs/contributing.md#ci-profiles). `.github/workflows/test.yml` orchestrates the pipelines: `frontend.yml` runs frontend build/Rules/browser checks, while `backend.yml` runs Worker/shared-contract/auth/D1 tests and bundling. Worker-only changes do not run frontend builds or browser tests; frontend-only changes do not run the Worker suite. Shared prompt/validator modules, dependencies, CI and unrecognized paths select both components. The required `test-and-build` check keeps its name and validates every selected component. Full E2E remains split into two shards; Yarn downloads are cached by lockfile.

Issue PRs target a dated milestone release from `develop`; promotions into protected `develop` and then the production/default branch use PRs. Production PRs must come only from this repository's `develop`. See the canonical [Git process](docs/git-process.md). CI checks main/master, develop and `work/release-mN-yyyyMMdd`; only the main/master default branch deploys. After a production push/merge and a passing gate, separate release flags examine **runtime files in the actual push `before..after`**, independently of CI selection. `src/`, `public/`, `index.html` and `vite.config.js` release the frontend; production Worker modules/config/migrations release the backend; the shared prompt/validator and package/lockfile may release both. Tests, development docs, workflow/check scripts, Firebase deployment configuration and staging configuration alone do not publish an app, even if CI checks both components. PRs neither deploy nor receive Cloudflare credentials; an unverifiable push diff blocks release.

`deploy-frontend.yml` publishes `site-build`; `deploy-backend.yml` publishes `worker-build`, uploading artifacts only when the component actually needs release. Artifacts belong to the same run and are not rebuilt during release. The frontend waits for the backend only when both need release. Master runs are serialized to avoid cancelling an active deployment; new PR commits still cancel older CI runs. Retry a failed runtime release through its corresponding run; a new docs push is not a deployment retry. No build-time Gemini key is required.

Backend CD requires the GitHub Actions **Secret** `CLOUDFLARE_API_TOKEN`; the account ID is already in `worker/wrangler.jsonc`. See [backend CD setup](worker/README.md#github-actions-backend-cd). Missing credentials or an incompatible D1 schema block backend release with an explicit error; CI does not automatically apply migrations or Firebase Rules.

Production runs at `https://quizmos.runs-at.dev/`. CI sets `VITE_BASE=/` for the verified build; assets and quiz data use `import.meta.env.BASE_URL`. Local development and the isolated E2E server keep `/quiz-app/`. Supply the same `VITE_BASE` when building and previewing an override locally. `public/CNAME` preserves the custom domain when `gh-pages` publishes `dist/`; the old GitHub Pages URL redirects to the custom domain.

Before testing Google sign-in on the new origin, add `quizmos.runs-at.dev` to Firebase Authentication's authorized domains. Browser-only guest data remains scoped to the old origin; cloud data keeps its existing account and quiz IDs. To roll back to the default GitHub Pages address, remove the custom domain and `public/CNAME`, then build with `VITE_BASE=/quiz-app/`.

## Next setup increments

- **Issue #42 rollout:** review the feature evidence, compare current published Rules/indexes with the preserved baseline, authorize and verify compatible Rules before merging/enabling the client, then smoke test production. The repository does not automatically deploy Firebase configuration.
- Review the four published guides above against their expanded banks; this cleanup does not certify their new coverage.
- Continue extracting App orchestration only around well-tested feature boundaries. Header extraction and stylesheet separation are the first step.
- Add WebKit/real-device smoke coverage and selected visual baselines after the initial browser suite is stable.
- Keep PR acceptance criteria mapped to evidence and mark partial work explicitly. Issue templates and the PR template capture this information.

Local `.vite/`, `dist/`, `artifacts/` and test reports are disposable outputs. Keep useful test logic in `tests/`, not in copied app files under a cache directory.

Use the issue/PR for task reasoning and results. Keep generated screenshots/logs/traces in ignored local folders or CI artifacts, following the [evidence budget](docs/contributing.md#documentation-and-evidence-budget). Commit only maintained documentation, source assets, or fixtures/baselines with an ongoing purpose; routine task evidence does not need its own repo report.
