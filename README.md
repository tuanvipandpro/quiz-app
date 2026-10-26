# Quiz App

A React certification quiz app for Cloud, AI and software testing. Practice questions, take timed mock exams, read curated Quick Summaries and request AI explanations with your own Gemini or Groq key.

[Live demo](https://tuanvipandpro.github.io/quiz-app/) · [Question formats](docs/question-formats.md) · [Write a Quick Summary](docs/quick-summary-authoring.md)

## Get started

Use Node.js 20 or newer and Yarn Classic 1.x. The repository declares Yarn 1.22.22, includes a tracked `yarn.lock`, and its deployment workflow uses Node.js 20.

```bash
git clone https://github.com/tuanvipandpro/quiz-app.git
cd quiz-app
yarn install
yarn dev
```

Open the URL printed by Vite, normally `http://localhost:5173/quiz-app/`.

| Task | Yarn | npm equivalent |
| --- | --- | --- |
| Install dependencies | `yarn install` | `npm install` |
| Development server | `yarn dev` | `npm run dev` |
| Automated tests | `yarn test` | `npm test` |
| Production build | `yarn build` | `npm run build` |
| Preview production build | `yarn preview` | `npm run preview` |
| Publish the built `dist/` directory | `yarn deploy` | `npm run deploy` |

CI installs with `yarn install --frozen-lockfile`. A production build writes to `dist/`; run the build before previewing or deploying it.

## Quiz library

The app includes **20 quiz sets**, grouped by category and searchable by name. Counts below describe the files in this repository.

| Category | Quiz sets and question counts |
| --- | --- |
| Anthropic | Architect Foundations (CCA-F, 175), Architect Professional (CCAR-P, 126), Associate Foundations (CCAO-F, 119), Developer Foundations (CCDV-F, 53) |
| AWS | Cloud Practitioner (302), Solutions Architect Associate (529), Developer Associate (557), Data Engineer Associate (227) |
| Microsoft | Azure Fundamentals (AZ-900, 472), GitHub Copilot (GH-300, 115), Agentic AI Business Solutions Architect Expert (AB-100, 111), Azure AI Apps and Agents Developer Associate (AI-103, 117) |
| Google Cloud | Associate Cloud Engineer (302), Professional Cloud Architect (279), Professional Cloud Developer (359), Professional Data Engineer (139), Generative AI Leader (56) |
| ISTQB | Foundation Level v4.0 (240), AI Testing (118), Advanced Test Analyst v4.0 (42) |

Load a library quiz or upload a custom JSON file. The quiz overview shows the quiz name, question count and available modes. Selecting Exam reveals its count and duration settings. On phones, action buttons use icons with accessible names and tooltips; Practice and Exam keep their main actions in a bottom toolbar.

### Practice

- Work through questions sequentially, navigate back/forward or jump to a question number.
- Get feedback after answering a single-choice question, reaching the required multi-select count or completing every dropdown/yes-no part.
- Change an answer and see the updated result. Multi-select controls prevent choosing more than the required number of options.
- Copy the question, image reference, instructions and choices for use elsewhere. Copy does not add the marked-answer mapping.
- Request an AI explanation when signed in and a provider key is configured.
- Save a manual checkpoint for each library quiz when signed in, then Resume or Start from beginning from the quiz picker.

A checkpoint saves the current position, not selected answers. Saving is manual, and starting from the beginning keeps the existing checkpoint. Uploaded quizzes have no library quiz ID, so saving a checkpoint is disabled for them. Read/write failures show feedback and retry controls.

### Exam

- Randomly select 50, 60, 70 or 80 questions when the bank is large enough. Banks below 50 questions offer their full count.
- Choose a 60-minute or 120-minute limit.
- Shuffle multiple-choice options and the choices within each dropdown; yes/no order stays consistent.
- Keep selections while navigating, flag questions and review progress before submitting.
- Review selected, missing and correct answers after submission, with answer controls locked.
- Request AI explanations from the answer review.

**App scoring:** one point per question, with no partial credit. Every required choice/part must be correct to earn the point; only fully completed questions count as answered. A pass requires a score **greater than 80%**.

## Quick Summary

Four Anthropic quizzes have prepared Vietnamese guides, each with **eight topics** and an estimated **eight-minute** reading time. Topics contain core knowledge, scenario cues, wrong-answer traps, memory aids, primary references and links into Practice.

| Guide | Reviewed source |
| --- | --- |
| [CCA-F](public/summaries/anthropic-cca-f/vi.md) | 175 questions |
| [CCAR-P](public/summaries/anthropic-ccar-p/vi.md) | Original 63-question revision; the current bank has 126 questions and displays a review warning |
| [CCAO-F](public/summaries/anthropic-ccao-f/vi.md) | 119 questions |
| [CCDV-F](public/summaries/anthropic-ccdv-f/vi.md) | 53 questions |

Desktop has a contents sidebar; phones/tablets use a collapsible contents menu. Related-question buttons resolve stable question IDs to their current Practice positions without changing saved checkpoints. Loading failures offer Retry and Back.

Guides are authored separately as Markdown plus JSON metadata under `public/summaries/`, then published through [the guide registry](src/data/quickSummaries.js). Reading works without a login or AI key and makes no model request. A source fingerprint flags a guide for review when question content changes. Other quizzes and custom uploads keep the option disabled until a guide is published.

The guides follow the app's question banks and include source references; they do not certify complete official exam coverage. See [Quick Summary authoring](docs/quick-summary-authoring.md) for content structure, publication, fingerprints and validation.

## AI explanations

Google Gemini and Groq are supported. Sign in with Google, open **AI Settings** from the profile menu, add either provider's key and choose **Save**. **Test connection** sends a small generation request and consumes provider quota; it does not save the entered key.

Practice's Explain action requires sign-in. Exam review can also open AI Settings for a guest session, whose keys are stored in that browser. Explanations use concise Vietnamese Markdown, identify the provider/model and ask the model to flag questionable marked answers or missing context.

### Configured routing

The configured fallback order is defined in [modelRegistry.js](src/services/llm/modelRegistry.js). Models are attempted only when their provider has a saved key.

| Priority | Provider | Configured model IDs, in order |
| --- | --- | --- |
| 1 | Gemini | `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite` |
| 2 | Groq | `openai/gpt-oss-120b`, `openai/gpt-oss-20b` |
| 3 | Gemini | `gemini-3.8-flash`, `gemini-3.6-flash` |
| 4 | Gemini / Gemma | `gemma-4-31b-it`, `gemma-4-26b-a4b-it` |

These are application settings; access, availability and rate limits depend on the provider account. The router uses up to 20 seconds per attempt within a 60-second generation budget. Rate limits put a model on cooldown using the provider's retry guidance, with a 60-second default. Transient failures use a short cooldown; authentication failures skip the provider until its key/session is refreshed or a connection test succeeds. Invalid requests and content blocks stop fallback.

Closing an explanation, changing the question/account or leaving the mode cancels pending work. Successful explanations stay in a per-tab memory cache for 30 minutes, up to 100 entries, keyed by account and full question/choice/marked-answer content. Concurrent identical requests share one call; errors are not cached. Key/account changes invalidate the relevant cache, and reloading clears it. **Regenerate** requests a fresh explanation and consumes provider quota.

### Data and credentials

| Data | Storage and behavior |
| --- | --- |
| Quiz banks and Quick Summaries | Static files tracked in Git |
| Practice checkpoints | `users/{uid}` document, under `quizProgress.{quizId}`; stores quiz ID, zero-based index, question ID and timestamp |
| Signed-in provider keys | `users/{uid}` document, under `llmProviders.{gemini|groq}.apiKey`; active-user credentials are cached in memory |
| Guest provider keys | Browser localStorage under `quiz_llm_guest_keys`; cleared when signing in/out |
| Generated explanations | Memory only in the current tab; not written to Firestore |

Saving one checkpoint preserves other quizzes and profile fields. Resume follows the saved question ID after reordering, with a safe fallback for removed questions and older index-only checkpoints. Existing Gemini-only `geminiApiKey` fields remain readable and migrate when the Gemini key is saved or cleared. Signing out keeps profile keys in Firestore while clearing local session credentials and explanations.

Provider requests go directly from the browser to Gemini/Groq. Keep personal provider keys and service-account secrets out of source control.

## Firebase and deployment configuration

The app initializes Firebase from [src/config/firebase.js](src/config/firebase.js). For an independent deployment, configure your own Firebase project, enable Google Sign-In, allow the deployment domain and provision Firestore access for user profiles.

Firestore rules are managed outside this repository. Restrict `users/{uid}` access to its owner and support the `quizProgress` and `llmProviders` fields. The client and its tests do not deploy or verify live security rules.

### Base path

[Vite configuration](vite.config.js) defaults to `/quiz-app/`. Set `VITE_BASE` to serve under a different path.

PowerShell:

```powershell
$env:VITE_BASE = '/'
yarn build
yarn preview
```

Bash:

```bash
VITE_BASE=/ yarn build
VITE_BASE=/ yarn preview
```

Use the matching base when starting a preview or development server as well. Runtime quiz/summary paths use `import.meta.env.BASE_URL`.

### GitHub Pages

A push to `master` runs [deploy.yml](.github/workflows/deploy.yml): Node.js 20, frozen Yarn install, production build, then `yarn deploy`. The deploy script uses `gh-pages -d dist`, publishing the built directory to the `gh-pages` branch. Configure the repository's Pages publishing source to match that branch and its root directory.

For manual publication:

```bash
yarn build
yarn deploy
```

Personal AI keys are supplied through AI Settings. The active router reads profile/browser credentials rather than a shared build-time provider key.

## Question JSON and content imports

A quiz is a non-empty JSON array with unique question IDs. Required fields are `id`, `question`, `options` and `answer`.

| Format | Type | Answer shape |
| --- | --- | --- |
| Single/multiple choice | `multiple_choice`, or omitted | Array of correct option keys |
| Yes/no statements | `yes_no` | Object mapping each statement ID to its correct choice key |
| Row/inline dropdowns | `dropdown` | Object mapping each slot ID to its correct choice key |

Example single-choice question:

```json
[
  {
    "id": "q1",
    "question": "Which option is correct?",
    "options": { "A": "First option", "B": "Correct option" },
    "answer": ["B"],
    "imageUrl": ""
  }
]
```

For multi-select, use an array such as `"answer": ["A", "C"]`. Dropdowns define `slots` and per-slot options; yes/no defines `statements` and shared Yes/No options. An inline dropdown template includes each `{{slotId}}` exactly once. See [question-formats.md](docs/question-formats.md) for complete examples and behavior.

The optional `explanation` field is retained as source content. AI explanations are generated separately, and Exam review shows marked choices. New imports/uploads validate strictly; historical incomplete/image demo questions retain their basic compatibility.

### Reviewed Anthropic import

The [October 26, 2026 audit](docs/imports/anthropic-2026-10-26.json) records the CCAR-P update and new CCAO-F/CCDV-F banks: 63 equivalent CCAR-P questions skipped, 63 added, and all original records/IDs/positions retained. New ID collisions receive suffixes, and differing marked-answer text is recorded while preserving the original answer.

Replay that reviewed revision:

```bash
node scripts/import-anthropic-quizzes.mjs "path/to/source-files"
node scripts/import-anthropic-quizzes.mjs "path/to/source-files" --check
```

Replace `path/to/source-files` with the directory containing `CCAR_P.json`, `CCAO_F.json` and `CCDV_F.json`. Normal mode writes banks and an audit; `--check` verifies zero new additions without writing files. The CCAR-P mapping is gated by source-file and original-bank hashes, so a different revision needs a new equivalence review.

## Source layout

```text
public/
  quiz/                         Built-in question banks
  summaries/<quizId>/           meta.json and vi.md per guide
  sample-quiz.json               Downloadable custom-quiz example
src/
  App.jsx                       Library selection and mode orchestration
  components/
    PracticeMode.jsx            Practice, Copy and manual checkpoints
    ExamMode.jsx                Timer, submission, scoring and review
    Question.jsx                Multiple-choice rendering
    StructuredQuestion.jsx      Dropdown and yes/no rendering
    QuizMode.jsx                Compact mode selector
    QuickSummaryMode.jsx        Guide reader and related-question links
    ExplanationDialogs.jsx      AI explanation and marked-answer UI
    SettingsModal.jsx           Gemini/Groq key management
  data/quickSummaries.js         Published-guide registry
  config/firebase.js            Firebase client initialization
  contexts/AuthContext.jsx      Authentication and session lifecycle
  hooks/                        Auth, progress and explanation hooks
  services/
    llm/                        Credentials, router, providers and cache
    quickSummary.js             Guide loading, validation and fingerprints
    quizProgressStore.js        Per-user/per-quiz progress state
    userService.js              Firestore profile and checkpoint operations
  utils/                        Question model, merging, checkpoints and scrolling
scripts/                        Reviewed quiz import tooling
tests/                          Native Node.js test suites
docs/                           Format/authoring guides and import audit
.github/workflows/deploy.yml    GitHub Pages build/publication
```

The app uses React 19, Vite 6, Ant Design 5, Firebase 12 and React Markdown. Explanations sanitize supported HTML; Quick Summary ignores raw HTML and uses ordinary Markdown without GFM tables.

## Validation and contributions

Tests use the native Node.js test runner and isolate provider/Firebase boundaries. They cover routing, credential/session behavior, explanation caching, checkpoints, answer formats, imports and published-guide assets. They require no live provider key.

Before submitting a change:

```bash
yarn test
yarn build
```

Create a focused `feature/`, `fix/` or `chore/` branch from `master`, then open a pull request targeting `master`. Include the resulting behavior, validation and relevant limitations.

For quiz content, preserve existing IDs, validate marked keys/mappings, review duplicates and keep source context. For guides, update content before refreshing the reviewed fingerprint and extend the asset tests. For UI changes, manually check Practice/Exam and guide navigation on phones (including 320px), tablet and desktop, plus any changed save/resume or error states.

## License

The package declares the [MIT license](https://opensource.org/licenses/MIT).
