# Quiz App

Practice certification questions, take timed mock exams and read curated study guides. React 19, Vite, Ant Design and Firebase.

[Live app](https://tuanvipandpro.github.io/quiz-app/) · [Agent workflow](AGENTS.md) · [Custom-quiz cloud storage backlog](https://github.com/tuanvipandpro/quiz-app/issues/42)

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

| Command                                     | Purpose                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| `yarn doctor`                               | Check Node, installed tooling, lockfile and environment tracking            |
| `yarn lint`                                 | ESLint checks across application, scripts and tests                         |
| `yarn format` / `yarn format:check`         | Apply/check the formatting baseline; excludes banks and generated files     |
| `yarn test`                                 | Node unit/integration tests, with isolated Firebase/AI boundaries           |
| `yarn check:catalog`                        | Validate counts/schema/duplicates; report guides needing review             |
| `yarn check:guides`                         | Same check, failing while guide review is outstanding                       |
| `yarn build` / `yarn check:build`           | Build production and ensure no E2E auth/profile fixtures leak into it       |
| `yarn verify`                               | Doctor, lint, format, Node tests, catalog, build and build isolation checks |
| `yarn test:e2e`                             | Playwright desktop and phone flows                                          |
| `yarn test:e2e:headed` / `yarn test:e2e:ui` | Inspect browser tests interactively                                         |
| `yarn verify:all`                           | All standard checks plus browser tests                                      |

Install the test browser once:

```sh
yarn playwright install chromium
yarn test:e2e
```

Browser tests render the actual app using test-only auth/profile services selected by `vite.e2e.config.js`. They cover the library, aliases, checkpoint resume, JSON validation/formats, answer restoration, sign-out confirmation and exam lifecycle. External requests are blocked; tests never sign into a real account or call a paid AI API. This is not a substitute for deployed Firestore Rules tests or physical iOS/Android checks.

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
  fixtures/                Isolated auth/profile service doubles
scripts/                   Diagnostics, catalog/build checks and reviewed imports
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

- **Issue #42:** retrieve/review deployed Firestore Rules, version rules/config, add Emulator ownership/quota/concurrency tests, then implement the three-slot custom-quiz service and management UI. Preserve existing profile/checkpoint access; do not replace production rules with guessed defaults.
- Review the four published guides above against their expanded banks; this cleanup does not certify their new coverage.
- Continue extracting App orchestration only around well-tested feature boundaries. Header extraction and stylesheet separation are the first step.
- Add WebKit/real-device smoke coverage and selected visual baselines after the initial browser suite is stable.
- Keep PR acceptance criteria mapped to evidence and mark partial work explicitly. Issue templates and the PR template capture this information.

Local `.vite/`, `dist/`, `artifacts/` and test reports are disposable outputs. Keep useful test logic in `tests/`, not in copied app files under a cache directory.
