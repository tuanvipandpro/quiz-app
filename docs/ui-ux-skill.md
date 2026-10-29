# Local UI/UX Pro Max skill

Quiz App vendors UI/UX Pro Max in `.agents/skills/ui-ux-pro-max/`. The skill travels with the repository; it does not depend on a remote README or a global CLI installation. Codex discovers repository skills from `.agents/skills`; if it does not appear after checkout, reopen the session. Invoke `$ui-ux-pro-max` explicitly when needed. Discovery and task matching are not guarantees of correct application: review the recorded guidance and rendered result.

## Source and local adaptation

- Upstream: <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill>.
- Reviewed revision: `28b3b8dee8c976df4fa3e94aed4e092ad43fcb03`.
- `SOURCE.json` records upstream paths and SHA-256 hashes of exact imported bytes, including the root MIT `LICENSE`.
- Runtime Python scripts, data and reference documents are copied unchanged. The original upstream `SKILL.md` is retained unchanged as `references/upstream-skill.md`.
- The local `SKILL.md` is the Codex entry point. It adapts Claude plugin paths, routes work to the existing React/Ant Design contracts and requires task-scoped evidence.
- Upstream `scripts/tests/` is omitted: several tests require tools and repository structure outside the skill. Project integration checks live in `tests/uiUxSkill.test.js`.
- Imported files are excluded from Prettier and Git line-ending conversion to preserve upstream bytes. Python bytecode caches are ignored. No application runtime dependency is added.

`yarn check:ui-skill` verifies missing, changed and unrecorded payload files offline. It also runs within `yarn verify`. This establishes payload consistency with the checked-in inventory, not independent upstream authenticity, agent compliance or design quality.

## Search locally

Use Python 3 (`python`, `python3`, `py -3` on Windows, or an existing bundled interpreter). No pip packages, API keys, live services or network calls are needed for search. Python is only needed for UI guidance search, not for the application or the Node integrity check. If unavailable, report that limitation and use the bundled reference guidance as an explicit fallback.

From the repository root, for a focused UX concern:

```sh
python .agents/skills/ui-ux-pro-max/scripts/search.py "focus not obscured" --domain ux
```

For React implementation guidance:

```sh
python .agents/skills/ui-ux-pro-max/scripts/search.py "controlled input state" --stack react
```

For a new page or an agreed broader visual direction:

```sh
python .agents/skills/ui-ux-pro-max/scripts/search.py "education quiz learning" --design-system -p "Quiz App"
```

Use the absolute script path resolved from the repository root when working in a subdirectory; see the skill entry point for PowerShell/Bash examples. Search output does not change the app. Verify each result's relevance; retry once if unsuitable, then label any reference-only fallback. Do not introduce another component framework or persist a replacement design system merely because the generator recommends it.

## Workflow and PR evidence

For UI-facing work, read the local skill and relevant references, inspect the affected code/tests, then search for the actual task. Keep the existing product rules, translations, semantic tokens and Ant Design components. Use `--design-system` for new pages or broader direction, a domain search for a focused concern, and `--stack react` when implementation guidance is needed.

In the PR, record queries, result IDs/titles, applied recommendations and justified deviations. Follow `AGENTS.md` for screenshots, viewport/language/theme coverage, loading/error/disabled states, keyboard access and navigation. Run `yarn verify` and, for UI/auth/navigation changes, `yarn test:e2e`. This tooling integration itself changes no application UI, so it needs no before/after UI screenshots or browser acceptance matrix.

## Updating the pinned source

1. Choose a full upstream commit and review its skill, scripts, license and relevant data changes. Do not update automatically from `main`.
2. Import that commit into a temporary directory using the skill installer with `--ref <full-commit>` and `--dest <temporary-directory>`. Keep only the same runtime/reference scope; preserve the upstream skill under `references/upstream-skill.md` and the repository-root license under `LICENSE`.
3. Review the payload diff before replacing files. Retain and reconcile the local Codex entry point. Regenerate `SOURCE.json` from the newly imported upstream bytes, preserving each original source path; update the reviewed revision in this guide.
4. Run `yarn check:ui-skill`, `yarn verify`, the UX and React searches above, and the design-system command. Confirm output is relevant and that imports do not write outside the requested output directory. Do not refresh hashes simply to accept unexplained modifications.
5. Open a focused PR with the upstream revision, payload/adaptation changes and actual results. Updating the skill does not authorize redesigning the application.
