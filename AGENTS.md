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
- `worker/`: App AI API/auth/quota and D1 migrations. `yarn test:worker` uses local D1 and signed fixtures; `yarn worker:check` only bundles.
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
- Guest uploads stay in the tab. Cloud custom quizzes use 3 owner-only Firestore slots, 1–100 questions and instance/version-scoped drafts/checkpoints. Track production rollout in #42; do not enable the client before compatible Rules are published and verified.
- Guest AI uses BYOK. App AI requires a verified non-anonymous Firebase user, explicit source choice and server quota. Keep Cloudflare on Free with an allowlisted model; never add paid fallback or silently use a user's BYOK credentials. Enable App AI only after Free-account, quality and CPU/usage verification in #53.

## Required review before every change

- Identify the root cause or requested outcome, affected flows, existing owners of the logic/configuration, and potential UI/UX impact before editing. Include indirect effects such as loading, errors, saved state and navigation.
- For UI-facing changes, use the installed local [UI/UX Pro Max skill](.agents/skills/ui-ux-pro-max/SKILL.md). Read its pinned upstream guidance and relevant references, run the smallest relevant local search, and verify result relevance before applying it. Follow [the integration guide](docs/ui-ux-skill.md) for commands, provenance and updates. Apply guidance to React/Ant Design and the agreed product behavior; external recommendations never override the user's scope or alignment decisions.
- The skill is vendored development tooling, not an application dependency. Record search queries, relevant result IDs/titles, applied guidance and justified deviations in the PR. If Python/search is unavailable or returns no relevant result after one retry, use the bundled references and explicitly report that fallback. Purely non-visual changes still require a UI-impact assessment, but not an invented redesign.
- Choose the smallest maintainable correction. Refactor within the affected responsibility when needed; do not turn a focused fix into an unrelated architecture rewrite.

## Mobile UI/UX acceptance criteria

- Design affected layouts for phones first. Check widths 320, 390 and 412px, then 768 and 1280px; also inspect landscape when changing navigation, sticky controls or modals. Verify both VN/EN and light/dark on the changed flow, including the longest relevant labels/question content.
- Keep content within the viewport, controls reachable and text readable. Use flexible layout and existing breakpoints; avoid device-name checks and per-phone positioning patches. Sticky UI must respect safe areas and leave room for focused inputs and the on-screen keyboard.
- Phone controls need at least 44x44 CSS-pixel hit areas. Keep visible focus, meaningful labels for icon-only controls and actions usable without hover. Preserve text zoom; target at least 4.5:1 contrast for normal text and 3:1 for large text in both themes, and respect reduced motion.
- Cover loading, empty, success, validation error, permission/network failure and disabled states where applicable. Prevent duplicate submissions, explain failures near the affected action, and preserve valid user input for retry.
- Preserve predictable Back/Cancel/Resume behavior. Confirm destructive or session-ending actions and maintain keyboard focus through dialogs. Compact mobile labels must retain their meaning and accessible names.
- Inspect the rendered result and attach relevant before/after evidence with viewport, language and theme. Automated geometry checks complement visual review; label browser emulation honestly and do not claim physical iPhone/Samsung testing without doing it.

## Code structure and extensibility

- Give each module a clear responsibility: components render UI, hooks orchestrate state, services own external IO, utilities hold testable domain logic, and data/config modules own shared definitions. Keep Firebase/provider calls out of presentation code.
- Reuse existing components, validators, tokens and service contracts. Extract cohesive behavior when responsibilities mix or rules repeat; do not keep appending unrelated logic to App.jsx or create generic abstractions for hypothetical future features.
- Keep dependencies explicit through props, function parameters or the existing service boundaries. Prefer pure helpers for validation/scoring/transforms so failure and edge cases can be tested without a browser or live service.
- Put variable environment settings, provider/model metadata, routes, shared limits and repeated options in their appropriate existing configuration/registry. Use named constants for meaningful shared invariants. Do not scatter magic numbers, provider-specific branches or duplicated rules across components.
- Use the translation catalog for user-facing UI strings and shared design tokens/styles for colors, spacing and typography. Do not add arbitrary inline style patches to repair one screen width. Local, obvious literals and intentional test fixtures are acceptable; avoiding hardcoding does not mean moving every value into configuration.
- Add providers, quiz types or modes through the existing registries/contracts where applicable. Preserve stable IDs and data compatibility; document migration needs before changing persisted shapes. Never substitute demo data or fake success for missing production behavior.
- Handle invalid/missing data, async races, cancellation, account changes and service errors at the boundary that owns them. Surface useful UI states without exposing secrets or losing the user's work.

## Implementation and verification

- Reuse components/services and keep changes focused. No unrelated dependency upgrades or question-answer rewrites.
- Asset paths respect `import.meta.env.BASE_URL` (`/quiz-app/` in production).
- Never log or commit provider API keys. `.env` stays local; Firebase web configuration is public, not authorization.
- Test auth/AI/Firebase through fixtures or emulators. Do not exercise real accounts or billable AI calls for routine tests.
- `vite.e2e.config.js` is test-only and cannot build. Do not copy App.jsx into a harness; use the real app with replaced service boundaries.
- Add regression tests for meaningful behavior changes. For UI changes, inspect the relevant phone/desktop, language and theme states.
- Run `yarn verify`; run `yarn test:e2e` for UI/auth/navigation changes. Report actual commands/results and limitations. Preserve failure screenshots/traces for diagnosis.
- CI deploys the verified build only after unit, catalog, build and browser checks succeed on master.
- Before completion, review the changed files against the rules above and the PR checklist. State which UI states/viewports and tests were actually checked, any tradeoff, and any unverified requirement. These instructions and manual evidence complement CI; lint/test success alone does not prove good UX or architecture.

## Spec-driven work

- OpenSpec is pinned in devDependencies. Use `yarn sdd <command>` instead of an unpinned/global CLI; the wrapper disables telemetry and update checks. Generated Codex workflows live in `.agents/skills/`; preserve AGENTS.md as the shared project policy.
- For a feature, read its proposal/spec/design/tasks before implementation. Default to one feature PR; the initial setup PR is a bootstrap exception, not a two-PR requirement for every change.
- Current change: `openspec/changes/custom-quizzes-42/`. Track implementation and rollout evidence separately; do not mark production steps complete or close #42 based only on local tests or planning completion.
- Every requirement needs scenario/test evidence. `sdd:validate` proves structure only; `sdd:status` planning completion is not acceptance completion. Update the verification matrix when implementing.
- `firebase/baseline/firestore.rules` preserves the user-supplied deployed baseline, not an API-exported confirmation. `firebase/firestore.rules` is the candidate policy. Preserve provenance and recheck published Rules/indexes before rollout; follow `firebase/README.md`. Never deploy the index fragment alone or replace unrelated production configuration.
- `yarn test:rules` starts Firestore on loopback with `demo-quiz-app`, requires Java 21+, and tests baseline and candidate policies through client SDK contexts. Never point tests at the real project; the emulator runner refuses project/config overrides.
- Run `yarn verify` (includes SDD validation); run `yarn test:rules` when rules/emulator plumbing changes. `yarn verify:all` includes baseline rules and browser tests.

## Useful task prompts

- Feature: define user outcome, acceptance criteria, affected flows and exclusions; demonstrate each implemented criterion.
- UI: identify viewport/theme/language and exact elements to change; retain established alignment and provide before/after evidence.
- Import: identify the source revision, check duplicate/answer conflicts, preserve IDs, and write a reviewable report under ignored `artifacts/imports/`.
