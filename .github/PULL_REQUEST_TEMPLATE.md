## Tracking and classification

Tracking issue: #<!-- required existing issue number; create/reuse the issue before implementation -->

- Primary type: <!-- feature | bugfix | hotfix | refactor | minor | docs | chore | data -->
- Secondary types, if applicable:
- Risk and reason: <!-- low | medium | high; explain UI/data/operational impact -->

Use `Refs #N` in commits and link this PR from the issue. Keep the issue open until required CI passes, the relevant PRs merge and any required rollout is verified. Close it explicitly with evidence; avoid automatic closing keywords. See [the tracking policy](https://github.com/tuanvipandpro/quiz-app/blob/master/docs/contributing.md#tracking-every-change).

For minor work, keep this description short: visible change, why behavior is preserved, acceptance and focused results. Remove inapplicable prompts instead of generating extra documents. Store disposable evidence in CI/local artifacts or a small PR attachment; justify any committed evidence with its ongoing purpose.

## Outcome

What problem does this solve, and what does the user see now?

## Scope

- Source → target follows the [Git process](https://github.com/tuanvipandpro/quiz-app/blob/develop/docs/git-process.md): production PRs must come only from this repository's `develop`; issue PRs target their milestone release.

- Completed acceptance criteria:
- Partial/deferred work:

## Verification

- Commands and results:
- Type/risk-based docs and test coverage: <!-- apply the contributor guide matrix; explain N/A, gaps and justified deviations -->
- Latest verified head and CI run: <!-- keep pending until checked; a previous green head is insufficient -->
- UI skill queries/results, applied guidance or justified fallback, if applicable:
- UI evidence (checked viewport/theme/language and minimal attachment or artifact link), if applicable:
- Committed evidence and ongoing purpose, if any:
- Data/checkpoint compatibility, if applicable:

## Rollout

Risks, configuration changes and recovery steps. Do not mark an issue complete when only its UI or a subset of its acceptance criteria is implemented.

- Post-merge CI/deploy/configuration/smoke checks required by this issue:
- Remaining gates before issue closure: <!-- update after merge and verification; do not pre-check completion -->

## Agent review checklist

Check an item only after verifying it. Explain any item that does not apply.

- [ ] Tracking issue existed before implementation; assessment, classification, scope and acceptance criteria are current, and issue/PR links work both ways.
- [ ] Staged/outgoing changes were reviewed and secret-scanned with redacted output; no real credentials or secret-bearing files are included. Required CI/runtime secrets use the appropriate secret store, not public frontend output.
- [ ] Root cause/outcome, affected flows and direct/indirect UI impact assessed.
- [ ] UI-facing work used the local UI/UX Pro Max skill and recorded relevant queries/results and applied guidance, or explained a reference-only fallback.
- [ ] Changed UI checked using the applicable minor or full matrix from docs/contributing.md, with actual states/viewports recorded; disposable evidence is kept outside Git.
- [ ] Responsibilities, reuse and extension points reviewed; shared rules/configuration are not duplicated or scattered as hardcoded values.
- [ ] Accessibility, navigation, data compatibility and async/error handling reviewed where affected.
- [ ] Actual verification results and limitations reported; emulated tests are not described as physical-device tests.
- [ ] Required CI on the latest PR head passed; remaining merge/rollout gates are recorded and the issue remains open until they are satisfied.
