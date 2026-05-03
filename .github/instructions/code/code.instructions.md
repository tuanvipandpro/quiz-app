---
applyTo: "src/**/*.{js,jsx,ts,tsx}"
---

# Code Instructions

## Scope
- Applies to feature implementation and bug fixes in source code.

## Mandatory Git Flow
- For every implementation/fix, work on a new branch.
- Branch naming:
  - `feature/<short-description>` for new features.
  - `fix/<short-description>` for bug fixes.
  - `chore/<short-description>` for cleanup/refactor.
- Do not commit directly to `master`.
- After completion and validation, open a PR targeting `master`.

## Project Conventions
- Use functional React components and hooks only.
- Match naming/style/import patterns from nearby code in the touched file.
- Keep changes minimal and focused; avoid unrelated refactors.
- Reuse existing components and Ant Design patterns before adding new abstractions.
- Prefer early returns and clear state transitions.
- Keep reusable business logic in services/utilities.
- Do not add new dependencies unless necessary.

## Domain Rules
- Quiz question shape must include: `id`, `question`, `options`, `answer`.
- Always treat `answer` as an array (single-answer and multi-answer both supported).
- Preserve behavior across Practice mode, Exam mode, and quiz selection flows.

## Asset and Routing Rules
- App deploy base path is `/quiz-app/`.
- Avoid hardcoded absolute asset URLs in new code.
- Prefer `import.meta.env.BASE_URL` to support both local dev and production.

## Auth and API Safety
- Never log API keys, tokens, or sensitive user data.
- Handle unauthenticated states gracefully for auth-required features.
- Keep Firestore logic in service layer when possible.
- If Gemini explanation fails, do not break core quiz usage.

## Done Criteria
- Validate loading, empty, success, and error states for changed flow.
- Ensure no console errors in changed area.
- In PR summary include: what changed, impacted flow/files, tests run, and known tradeoffs.
