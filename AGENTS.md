# Working on Quiz App

## Start here

- React 19 + Vite + Ant Design. Node 24 LTS, Yarn 1.22.22, tracked `yarn.lock`.
- `yarn doctor`, `yarn dev` (5173), `yarn verify`, `yarn test:e2e` (isolated 5174).
- Read the implementation and tests before editing. Work on a descriptive branch and open a PR. Merge only when requested.
- Follow the user's latest scope. Report completed, partial and deferred work explicitly; a passing build does not establish that every acceptance criterion is complete.

## Source map

- `src/App.jsx`: routing, quiz loading and study orchestration.
- `src/components/`: UI; `src/hooks/`: stateful behavior; `src/contexts/`: auth/language.
- `src/services/`: Firebase and AI boundaries. `src/services/llm/`: credentials, caching and provider routing.
- `src/data/`: catalog, stable IDs/aliases, brands and format examples.
- `src/utils/questionModel.js`: validation/scoring contract. `public/quiz/`: static banks.
- `public/summaries/`: published study content, not development documentation.
- `tests/*.test.js`: Node tests. `tests/e2e/`: browser tests. `tests/fixtures/`: test-only services.

## Product and data constraints

- Bank-first navigation; featured AIP-C01 and CCAR-P; group by provider.
- EN defaults, VN/EN toggle, light/dark, phone widths down to 320px.
- Header/navigation align left with utilities right. Center only the intended introductory/card/upload content. Keep long questions and form labels readable.
- Multiple-choice answers are arrays. Yes/no and dropdown answers are mappings. Use the shared validator.
- Preserve question IDs, quiz aliases, cloud checkpoints and account-scoped drafts. `aws-ace` resolves to Google ACE; it is not an AWS Cloud Practitioner bank.
- Verify actual quiz contents before changing provider/name/code. Count/schema/hash checks alone do not establish exam alignment.
- Do not refresh a guide's reviewed hash until its content and question mappings have been reviewed. `yarn check:guides` exposes outstanding reviews.
- Custom uploads currently stay in the tab. Firestore persistence and 3-quiz quota remain issue #42.

## Implementation and verification

- Reuse components/services and keep changes focused. No unrelated dependency upgrades or question-answer rewrites.
- Asset paths respect `import.meta.env.BASE_URL` (`/quiz-app/` in production).
- Never log or commit provider API keys. `.env` stays local; Firebase web configuration is public, not authorization.
- Test auth/AI/Firebase through fixtures or emulators. Do not exercise real accounts or billable AI calls for routine tests.
- `vite.e2e.config.js` is test-only and cannot build. Do not copy App.jsx into a harness; use the real app with replaced service boundaries.
- Add regression tests for meaningful behavior changes. For UI changes, inspect the relevant phone/desktop, language and theme states.
- Run `yarn verify`; run `yarn test:e2e` for UI/auth/navigation changes. Report actual commands/results and limitations. Preserve failure screenshots/traces for diagnosis.
- CI deploys the verified build only after unit, catalog, build and browser checks succeed on master.

## Useful task prompts

- Feature: define user outcome, acceptance criteria, affected flows and exclusions; demonstrate each implemented criterion.
- UI: identify viewport/theme/language and exact elements to change; retain established alignment and provide before/after evidence.
- Import: identify the source revision, check duplicate/answer conflicts, preserve IDs, and write a reviewable report under ignored `artifacts/imports/`.
