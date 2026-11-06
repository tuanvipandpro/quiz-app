# Working on QuizMos

React 19, Vite, Ant Design; Node 24 LTS and Yarn 1.22.22 with tracked `yarn.lock`. Commands: `yarn doctor`, `yarn dev` (5173), `yarn verify`, `yarn test:e2e` (isolated 5174). Setup/source map: [README](README.md).

## Core workflow

- Write documentation in English.
- Assess the request and reuse/create a GitHub issue **before implementation**, including docs/tests/config/data changes. Read-only investigation may precede tracking. Routine issue creation/updates are authorized by a change request; if tracking is unavailable, retain a draft and report the blocker before editing.
- Classify purpose and risk: `feature`, `bugfix`, `hotfix`, `refactor`, `minor`, `docs`, `chore`, `data`. Minor means isolated presentation changes preserving behavior and meaning; broad or higher-risk work needs broader checks.
- Keep minor issue/PR descriptions brief. Docs/policy/templates use format/link/config checks; minor UI uses applicable lint/build and focused visual checks. Other implementation changes use `yarn verify` and relevant regressions. Repeat checks only for changes, failures or unresolved concerns. CI selects components and docs/assets/full from the diff; labels never bypass checks.
- Follow [Git process](docs/git-process.md): issue branches target their milestone release; production PRs come only from same-repo `develop`. Link issues/PRs both ways. Use `Refs #N`, not automatic closing keywords. Record acceptance evidence, status and remaining work.
- Wait for required CI on the latest head. Merge only when requested. Close the issue only after accepted scope is verified, required PRs are merged, and required post-merge CI/rollout checks pass. Keep partial/unverified work open; cancellation is not implementation.

## Guardrails

- Read affected implementation/tests, identify owners and indirect effects, then make the smallest maintainable change. Follow the user's scope; report actual results and limitations.
- Keep rendering in components, orchestration in hooks, external IO in services and domain logic in utilities. Reuse existing validators, translations, tokens and shared configuration.
- Preserve question IDs/aliases, account-scoped drafts and checkpoints. Multiple-choice answers are arrays; yes/no and dropdown answers are mappings. `aws-ace` resolves to Google ACE.
- Preserve bank-first/provider navigation, featured AIP-C01/CCAR-P, EN default with VN/EN, both themes and 320px support. Header/nav align left, utilities right. Asset paths use `import.meta.env.BASE_URL` (`/` production, `/quiz-app/` dev/E2E).
- Never commit/push real credentials or expose them in logs/artifacts. Review staged/outgoing changes and run a redacted secret scan before push; stop on unresolved findings. Follow [secret handling](docs/contributing.md#credentials-and-secrets) for GitHub Secrets and private runtime keys. Use fixtures/emulators for routine auth/AI/Firebase tests. Cloud custom quizzes stay behind verified compatible production Rules; #42 tracks rollout. Do not refresh guide review hashes without content review.
- Guest AI uses BYOK; App AI requires verified non-anonymous authentication, explicit source choice and server quota. Keep Workers Free with no paid or silent BYOK fallback. Follow [App AI rollout](worker/README.md); #53 gates production activation.
- Store disposable screenshots/logs/traces/reports in ignored or CI artifacts. Commit maintained docs, source assets and purposeful test fixtures/baselines. `public/summaries/` is published study content, not development documentation. No evidence bundle for routine minor work.

## Read when relevant

Read only applicable sections; do not load the whole contributor guide for every task. Reuse instructions already in context unless they may have changed.

- Classification, test planning or closure questions: [tracking/types](docs/contributing.md#tracking-every-change), [minor/check effort](docs/contributing.md#minor-changes-and-verification-effort), [delivery gates](docs/contributing.md#implement-verify-merge-then-close).
- UI work: use the local [UI/UX skill](.agents/skills/ui-ux-pro-max/SKILL.md). Cosmetic edits use the minor plan; layout/navigation/modal/behavior changes use [full UI acceptance](docs/contributing.md#mobile-uiux-acceptance-criteria).
- Product identity, quiz/content or saved-data changes: [product/data constraints](docs/contributing.md#product-and-data-constraints). Significant boundaries/refactors: [structure rules](docs/contributing.md#code-structure-and-extensibility).
- Features/specs: [OpenSpec rules](docs/contributing.md#spec-driven-work) and the relevant proposal/design/spec/tasks; use pinned `yarn sdd`, not a global CLI.
- Firebase Rules/indexes or cloud rollout: [release procedure](firebase/README.md). Evidence retention questions: [evidence budget](docs/contributing.md#documentation-and-evidence-budget).

Keep this entry point within 600 words / 6 KiB (checked in CI). Maintain detailed rules in the linked guide; keep task history in issues/PRs.
