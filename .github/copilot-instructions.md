# Copilot Instructions for quiz-app

## Project Overview
- This is a React 19 + Vite 6 quiz application using Ant Design 5.
- Main app flow is orchestrated in `src/App.jsx`.
- Core quiz modes are in `src/components/PracticeMode.jsx`, `src/components/ExamMode.jsx`, and `src/components/QuizMode.jsx`.
- Authentication and user-specific data use Firebase (`src/config/firebase.js`, `src/contexts/AuthContext.jsx`, `src/services/userService.js`).
- AI explanation features use Gemini (`src/utils/geminiApi.js`).

## Primary Goal When Assisting
When implementing a new feature or fixing a bug, prioritize:
1. Correctness and no regressions in quiz behavior.
2. UX consistency with existing Ant Design patterns.
3. Safe handling of auth/API key flows.
4. Small, focused changes over broad refactors.

## Coding Conventions
- Use functional React components and hooks only.
- Match existing code style in touched files (naming, import style, inline style patterns).
- For every new implementation, explicitly follow the conventions of the touched module and keep naming/style consistent with nearby code.
- Before finishing, verify convention compliance in all changed files (imports, state naming, handler naming, component structure, and Ant Design usage patterns).
- Prefer early returns and clear state transitions over deeply nested logic.
- Keep business logic in services/utilities when reused.
- Do not introduce new dependencies unless clearly necessary.
- Keep comments minimal and only for non-obvious logic.

## Git Workflow (Mandatory)
- For every feature implementation or bug fix, always create and work on a new branch.
- Branch naming should be descriptive:
	- Feature: `feature/<short-description>`
	- Bug fix: `fix/<short-description>`
	- Chore/refactor: `chore/<short-description>`
- Do not commit directly to `master`.
- After implementation and validation are complete, open a Pull Request targeting `master`.
- PR description must include: summary of changes, impacted files/flows, testing performed, and potential risks/tradeoffs.

## Data and Domain Rules
- Quiz data is JSON in `public/quiz/**` and custom uploads.
- Each question is expected to have: `id`, `question`, `options`, `answer` (array).
- `answer` must always be treated as an array (single or multiple correct answers).
- Preserve support for both single-answer and multi-answer questions.

## Routing and Asset Path Rules
- This app is deployed under `/quiz-app/` (GitHub Pages base path).
- Avoid hardcoding absolute asset URLs when adding new code.
- Prefer `import.meta.env.BASE_URL` for runtime-safe asset paths.
- Ensure local dev (`/`) and production base path both work.

## Feature Implementation Workflow
When adding a feature:
1. Locate the existing flow first (App state, mode component, and related services).
2. Reuse existing patterns/components before creating new abstractions.
3. Keep UI state local unless it must be shared globally.
4. Update only the minimal set of files required.
5. Validate empty, loading, error, and success states.

## Bug Fix Workflow
When fixing a bug:
1. Reproduce from code path and identify root cause.
2. Implement the smallest safe fix.
3. Check adjacent flows for regressions (practice mode, exam mode, quiz selection, auth).
4. Add guard rails for edge cases (null data, async timing, auth state, invalid input).

## Firebase and Auth Safety
- Never log tokens, API keys, or sensitive user data.
- For authenticated features, always handle unauthenticated states gracefully.
- Keep Firestore interactions in service layer when possible.
- Do not break login/logout side effects (API key sync and cleanup).

## Gemini/AI Feature Safety
- Handle missing API key and API failures gracefully.
- Keep markdown rendering sanitized.
- Do not block primary quiz functionality if AI service fails.

## UX and Accessibility
- Use Ant Design components for consistency.
- Keep responsive behavior intact for mobile and desktop.
- Ensure buttons and actions have clear labels.
- Maintain visible loading and feedback states (`Spin`, `message`, `Modal`, etc.).

## Testing and Validation Checklist
After changes, validate manually:
1. Load a demo quiz and start both Practice and Exam mode.
2. Upload a valid JSON quiz and verify validation errors for invalid JSON.
3. Test answer selection behavior for single and multi-answer questions.
4. Verify login/logout flows are still functional.
5. Verify save/resume progress still works for authenticated users.
6. Confirm no console errors in changed flow.

## Scope Discipline
- Do not rewrite unrelated components.
- Do not rename public props/state fields unless necessary.
- If a larger refactor is needed, propose it separately after delivering the fix/feature.

## Preferred Response Style for Future Edits
- Explain what changed, why, and impacted files.
- Call out any tradeoffs.
- Provide clear next steps only when useful.
