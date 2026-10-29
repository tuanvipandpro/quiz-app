# Quiz App

Practice certification questions, take timed mock exams and read curated study guides. React 19, Vite, Ant Design and Firebase.

[Live app](https://tuanvipandpro.github.io/quiz-app/) · [Agent workflow](AGENTS.md) · [Custom-quiz cloud storage backlog](https://github.com/tuanvipandpro/quiz-app/issues/42)

Every change follows the mandatory UI/UX and maintainability rules in `AGENTS.md`: assess user-facing impact, apply the reviewed UI/UX Pro Max guidance for UI work, check mobile/language/theme states, keep module responsibilities clear and centralize shared configuration. The PR checklist records evidence; CI enforces the automated checks, while visual and architectural judgment still require review.

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

## Commands

| Command                                     | Purpose                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `yarn doctor`                               | Check Node, installed tooling, lockfile and environment tracking                                |
| `yarn lint`                                 | ESLint checks across application, scripts and tests                                             |
| `yarn format` / `yarn format:check`         | Apply/check the formatting baseline; excludes banks and generated files                         |
| `yarn test`                                 | Node unit/integration tests, with isolated Firebase/AI boundaries                               |
| `yarn check:catalog`                        | Validate counts/schema/duplicates; report guides needing review                                 |
| `yarn check:guides`                         | Same check, failing while guide review is outstanding                                           |
| `yarn build` / `yarn check:build`           | Build production and ensure no E2E auth/profile fixtures leak into it                           |
| `yarn test:e2e`                             | Playwright desktop and phone flows                                                              |
| `yarn test:e2e:headed` / `yarn test:e2e:ui` | Inspect browser tests interactively                                                             |
| `yarn sdd:validate` / `yarn sdd:status`     | Validate SDD structure / inspect planning artifacts                                             |
| `yarn test:rules` / `yarn emulators:start`  | Test or inspect the local Firestore baseline (Java 21+)                                         |
| `yarn verify`                               | Doctor, lint, format, Node tests, SDD/catalog validation, production build and isolation checks |
| `yarn verify:all`                           | All standard checks, Firestore baseline tests and browser tests (Java 21+)                      |

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

Read [proposal](openspec/changes/custom-quizzes-42/proposal.md), [requirements](openspec/changes/custom-quizzes-42/specs/custom-quizzes/spec.md), [design](openspec/changes/custom-quizzes-42/design.md), [tasks](openspec/changes/custom-quizzes-42/tasks.md) and the [acceptance matrix](openspec/changes/custom-quizzes-42/verification.md). This setup PR prepares the feature; it does **not** implement cloud custom quizzes. All feature tasks remain open. `planningComplete` and successful structural validation do not mean #42 is finished. Do not apply/archive the feature until implementation is requested.

The default workflow is one feature/change in one PR, with specs and implementation evolving together. The separate setup PR is the one-time bootstrap. Existing project rules remain in AGENTS.md, and OpenSpec config references them rather than creating another competing rule set.

### Firestore baseline and local tests

`firebase/firestore.rules` is the baseline supplied by the user as the published rules for `quiz-app-f70d5`; provenance and its LF-normalized hash are in `firebase/rules-baseline.json`. It was not independently exported through the management API. It permits the owner profile document, denies guests/other users, and grants no custom-quiz subcollection access. Recheck the current published revision before future rollout.

Install **Java 21+**, set `JAVA_HOME`, and put its `bin` directory on PATH. No Firebase login or production credentials are needed for these tests:

```sh
yarn test:rules
yarn emulators:start
```

The runner tries JAVA_HOME, PATH, then an optional portable JDK under ignored `artifacts/tools/java21/`. The setup on this machine used a checksum-verified Temurin 21 archive there without changing system settings. That archive is not committed; fresh clones/CI must provide Java. `yarn doctor:sdd` checks availability without starting an emulator.

The runner uses only project `demo-quiz-app`, binds Firestore to `127.0.0.1:8080` (hub 4400, logging 4500), and refuses project/config override arguments. `test:rules` starts the emulator, executes the client-SDK baseline suite, then stops it. Direct test execution without the expected emulator environment fails closed. Auth contexts are mocked by the Rules test library; rules-disabled contexts only seed fixtures.

The local Firebase config is deliberately named `firebase.emulator.json`; no production alias, deploy command or Firebase deploy CI job is added. CI installs Java 21 and runs these baseline tests before browser tests and website deployment. `verify` now includes SDD structural validation; `verify:all` also requires Java and runs rules/E2E tests.

The seven baseline tests prove the supplied policy locally, not quota or cloud management. Those acceptance tests are planned in the feature matrix and must be implemented alongside the feature. Firebase Tools is pinned to 15.34.2; Rules Unit Testing 5.0.0 is pinned for compatibility with the existing Firebase 12 client.

On failure, inspect `playwright-report/` and `test-results/` for screenshots and traces. CI retains them for seven days. No automatic retries hide a failing test. To run one project: `yarn test:e2e --project=phone`.

## Product behavior

- The catalog has **20 unique banks**, grouped by provider. AWS AIP-C01 and Anthropic CCAR-P are featured.
- EN is the first-visit default. The VN/EN toggle changes UI labels, not question/guide content. Light/dark preferences persist.
- **My quizzes** validates and previews a JSON file with 1–100 questions, up to 1 MiB. The upload and study drafts stay in this browser tab. **Firestore persistence and a three-quiz quota are not implemented**; they are issue #42.
- Practice gives feedback and supports manual cloud checkpoints for bank quizzes. Exam preserves its shuffled questions, answers, flags and absolute deadline across refresh.
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
.agents/skills/            Generated OpenSpec workflows for Codex
firebase/                  User-supplied rules baseline and provenance
```

The removed `docs/`, Copilot instructions and old manual harnesses are not required to build or test. Development guidance lives in this README and `AGENTS.md`; public study guides are app content and remain published.

## Data changes and study-guide review

Preserve IDs and marked answers unless a review explicitly authorizes a correction. Check the actual content against the provider/exam before changing metadata. Schema, count and duplicate checks do not prove exam alignment.

The historical Anthropic importer remains available as `node scripts/import-anthropic-quizzes.mjs <snapshot-directory> --check`. Remove `--check` only for an intentional reviewed import; generated reports go to ignored `artifacts/imports/`, not a recreated docs folder.

Four guides currently require content/coverage review:

| Guide  | Reviewed questions | Current bank |
| ------ | -----------------: | -----------: |
| CCAR-F |                175 |          201 |
| CCAR-P |                 63 |          157 |
| CCAO-F |                119 |          151 |
| CCDV-F |                 53 |           96 |

AIP-C01's reviewed fingerprint matches its 136-question bank. Existing guide warnings are intentional. Review the Markdown, concepts, primary references and topic-to-question mappings before updating `sourceQuestionCount`/`sourceQuizHash`. Do not relabel a stale guide as reviewed merely to make a check green.

## Delivery

Pull requests run lint, formatting, Node tests, catalog checks, production build isolation and Playwright. Successful master builds upload a verified artifact; the dependent deploy job publishes that exact artifact to the existing `gh-pages` branch. Deployment cannot run ahead of failed tests. No build-time Gemini key is required.

The production base is `/quiz-app/`; assets use `import.meta.env.BASE_URL`. Optional `VITE_BASE` overrides must be supplied consistently for development/build/preview.

## Next setup increments

- **Issue #42:** implement the reviewed change plan, custom-quiz Rules/service/UI, and quota/concurrency acceptance tests. Baseline profile tests are now available; recheck published Rules/indexes for drift before an explicitly authorized rollout.
- Review the four published guides above against their expanded banks; this cleanup does not certify their new coverage.
- Continue extracting App orchestration only around well-tested feature boundaries. Header extraction and stylesheet separation are the first step.
- Add WebKit/real-device smoke coverage and selected visual baselines after the initial browser suite is stable.
- Keep PR acceptance criteria mapped to evidence and mark partial work explicitly. Issue templates and the PR template capture this information.

Local `.vite/`, `dist/`, `artifacts/` and test reports are disposable outputs. Keep useful test logic in `tests/`, not in copied app files under a cache directory.
