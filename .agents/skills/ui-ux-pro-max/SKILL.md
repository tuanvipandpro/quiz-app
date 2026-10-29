---
name: ui-ux-pro-max
description: Use for Quiz App UI design, implementation, review and fixes involving components, responsive layouts, navigation, accessibility, colors, typography or interaction. Includes pinned local UI/UX guidance and offline Python search. Skip purely non-visual backend, data and infrastructure work.
---

# UI/UX Pro Max for Quiz App

## Before UI work

1. Read the repository's `AGENTS.md` and the affected implementation/tests. Identify the requested outcome, current owner, affected flows and indirect effects on loading, errors, saved state and navigation.
2. Read [the pinned upstream skill](references/upstream-skill.md). Its Claude plugin paths are upstream examples: use the local paths below instead. This entry point adapts invocation only; the source revision and immutable upstream files are recorded in `SOURCE.json`.
3. Follow the smallest applicable search mode below. Read relevant sections of [quick reference](references/quick-reference.md); consult [pro rules](references/pro-rules.md) where applicable. Apply web guidance to React 19 and Ant Design 5, preserving existing tokens/components, translations and agreed alignment. Native-only recommendations do not automatically apply to this web app.
4. User scope and `AGENTS.md` control product behavior. Search results are recommendations. Do not add frameworks, animation libraries, redesigns or data changes without a task need. Do not include private data in queries.

## Run the bundled search

Python 3 is needed only for the local search tool; it uses the standard library. Try `python`, `python3` or `py -3` as available; a bundled Python interpreter can also be used. Do not install an interpreter automatically. If none works, report the limitation and use the relevant local reference as a labeled fallback.

Resolve the script against the repository root, independently of the current directory. For PowerShell:

```powershell
$quizRoot = git rev-parse --show-toplevel
py -3 "$quizRoot/.agents/skills/ui-ux-pro-max/scripts/search.py" "focus not obscured" --domain ux
```

For Bash:

```bash
quiz_root=$(git rev-parse --show-toplevel)
python3 "$quiz_root/.agents/skills/ui-ux-pro-max/scripts/search.py" "focus not obscured" --domain ux
```

- Targeted fix: use one explicit `--domain ux` (or the applicable domain) with one observable outcome and 2-5 meaningful terms.
- React implementation concern: use a separate `--stack react` query. Reuse Ant Design contracts; do not substitute Tailwind/shadcn or assume a different library version.
- New page or product-wide visual direction: use `--design-system -p "Quiz App"`, then assess its fit with the existing application. A generator result is not an approved redesign.
- Check the returned category, result identity and relevance. Retry once with a narrower query or explicit domain/stack if empty or off-topic. If still unsuitable, label the local-reference fallback; never claim a database match.
- Search without `--persist` by default. Read any existing design-system files before saving. When the task calls for persistence, pass the repository root with `--output-dir`; use `--force` only with explicit authorization.

## Verification and evidence

Run `yarn check:ui-skill` to verify the pinned upstream payload, and the checks required by `AGENTS.md` for the actual change. Inspect affected layouts/states in the browser and retain before/after evidence with viewport, language and theme. Report the search queries, relevant result IDs/titles, applied guidance, justified deviations and unverified requirements in the PR. Automated checks validate what they measure; they do not prove that an agent used the skill or that the UX is good.

For source provenance, update procedure and examples, read [the integration guide](../../../docs/ui-ux-skill.md).
