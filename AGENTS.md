# Working on QuizMos

## Start here

- React 19 + Vite + Ant Design. Node 24 LTS, Yarn 1.22.22, tracked `yarn.lock`.
- `yarn doctor`, `yarn dev` (5173), `yarn verify`, `yarn test:e2e` (isolated 5174).
- Read the implementation and tests before editing. Work on a descriptive branch and open a PR. Merge only when requested.
- Follow the user's latest scope. Report completed, partial and deferred work explicitly; a passing build does not establish that every acceptance criterion is complete.

## Tracking every change

- Every requested change needs a GitHub issue **before implementation**. This covers code, tests, configuration, dependencies, documentation/specs, quiz data, repository tooling and external production configuration. Read-only investigation, answering questions and preparing an unsent issue draft may precede tracking.
- Assess the request first: desired outcome or reproducible failure, affected flows, owners, UI/data impact, risk and exclusions. Distinguish confirmed causes from hypotheses; record unknowns and how they will be investigated.
- Search existing issues and reuse a relevant open issue when the outcome and scope match. Otherwise create one. A request to change this repository includes authorization for routine issue creation and progress updates; do not ask for separate confirmation just to log the work. Merge and production-action authorization still follow the user's scope and the rules below.
- Record the work type, risk, assessment, scope/exclusions, observable acceptance criteria, documentation/test plan and any rollout/rollback needs. API-created issues must contain the same information as the issue form. Do not include credentials or private user data in logs/evidence.
- One cohesive outcome can cover multiple files, commits and follow-up fixes. Give unrelated outcomes separate linked issues. Update the issue before expanding scope; creating an issue does not authorize unrelated implementation.
- If tracking access is unavailable, report the blocker and retain the draft. Continue read-only investigation, but do not start implementation or represent a local draft as a published issue.

### Classify work and scale documentation/tests

Choose a primary type and note secondary types when useful. Record risk as low, medium or high with a reason; unresolved risk needs investigation. Documentation and new tests should be proportional to behavior, scope and risk, not file count. Mixed changes use the strongest applicable verification requirements; do not relabel work to bypass them.

| Type       | Use for                                                                     | Documentation/evidence                                                                                                                         | Additional verification appropriate to the change                                                                                                                   |
| ---------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feature`  | New or intentionally changed user capability                                | Outcome, scope and acceptance scenarios; OpenSpec proposal/spec/design/tasks under the existing feature workflow; user/setup docs where needed | Map each scenario to evidence; test domain and service behavior plus applicable UI/auth/navigation E2E and failure states                                           |
| `bugfix`   | Existing behavior violates its contract                                     | Reproduction, expected/actual behavior, root cause, affected flows and correction; update docs/specs if inaccurate                             | Add a meaningful regression that fails before the fix when feasible, then passes; exercise adjacent behavior and explain any reproduction/test limitation           |
| `hotfix`   | Urgent production breakage or regression                                    | Concise incident impact, reproduction, confirmed cause or explicit hypothesis, focused fix, rollout and rollback; keep the issue current       | Reproduce and target the failure first, then run the affected regression coverage and required gates; urgency never permits skipping CI or weakening assertions     |
| `refactor` | Internal restructuring with intended behavior preserved                     | Responsibility/boundary change, reason and invariants; design note only for a significant structural decision                                  | Existing tests must still establish behavior; add coverage only for meaningful uncovered invariants or risky boundaries, and compare relevant behavior before/after |
| `docs`     | Documentation, comments or metadata with no runtime/tooling behavior change | The correction itself and its reason in the issue/PR; no redundant design document                                                             | Check formatting, local links, referenced commands and factual accuracy; do not invent runtime tests for prose-only edits                                           |
| `chore`    | Tooling, CI/build, dependencies or repository process                       | Purpose, affected workflows/configuration, compatibility and operational instructions where needed                                             | Validate the changed configuration/toolchain and representative success/failure paths; use security, build or smoke checks when relevant                            |
| `data`     | Quiz-bank or published study-content updates                                | Source revision/provenance, content review, ID/alias/answer compatibility and guide-review evidence                                            | Validate schema/catalog and meaningful content alignment; exercise rendering/scoring when affected; hashes alone are insufficient                                   |

The table scales **additional** docs and tests. `yarn verify` and required CI gates remain the baseline. Run E2E for UI/auth/navigation changes and emulator tests for Rules/emulator changes as specified below. Higher risk (auth, permissions, persisted data, migrations, external services or deployment) requires the corresponding failure, compatibility and rollout evidence regardless of type. A configuration-only production task still needs an issue and a PR containing the reviewable configuration or rollout documentation.

### Implement, verify, merge, then close

1. Put the issue number in the descriptive branch name where practical, reference it in commits, and include `Tracking issue: #N` in every PR. Link the PR back from the issue. Use `Refs #N` rather than automatic issue-closing keywords in PR descriptions or commits so merge cannot close an issue ahead of validation or rollout.
2. Keep the issue current at meaningful milestones: assessed, implementing, PR opened, awaiting CI, awaiting merge, and rollout/verification when applicable. Record acceptance evidence, scope changes, failures and remaining work; do not post updates for unchanged polls.
3. After implementation, run the applicable checks, review the diff and report actual results/limitations. Inspect CI for the **latest PR head** and wait for all required checks to pass. Earlier green commits, pending/cancelled/failed checks or a skipped required check do not satisfy this gate. An explicitly inapplicable conditional job (such as PR deployment) is not a required check. Investigate failing/flaky checks and retain their evidence; record why a rerun is justified instead of rerunning until green or weakening assertions.
4. Keep the issue open while awaiting CI or merge. Merge only when the user has requested it and the latest required checks have passed. If the head changes, inspect the new head's results before merging.
5. Confirm all PRs needed for the issue's accepted scope are actually merged. Check required post-merge CI; if delivery includes deployment, external configuration or production validation, verify those outcomes too. A merged PR, successful build or archived OpenSpec change alone is not completion.
6. Before closing as completed, update the issue with acceptance results, merged PR/commit links, CI evidence and applicable rollout/smoke results. Close only when all accepted criteria and required delivery gates are satisfied. Keep partial, failed or unverified work open; split deferred scope into a linked follow-up only with the user's agreement. Reopen a prematurely auto-closed issue and explain the missing gate.
7. A PR closed without merging does not complete its issue. Cancellation, duplication or superseded work may be closed as not planned only with an explicit user decision and a recorded reason; never report it as implemented.

These are agent workflow rules supported by templates; templates do not technically enforce issue linkage or CI/merge permissions. The agent must verify the evidence rather than assume that filling a template satisfies the policy.

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
- Guest uploads stay in the tab. Cloud custom quizzes use 3 owner-only Firestore slots, 1–100 questions and instance/version-scoped drafts/checkpoints. Track production rollout in #42; do not enable the client before compatible Rules are published and verified.

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
- Asset paths respect `import.meta.env.BASE_URL` (`/` on the production custom domain; `/quiz-app/` for local development and isolated E2E).
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
