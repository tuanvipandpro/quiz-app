---
applyTo: "**/*.{spec,test}.{js,jsx,ts,tsx},test-results/**/*,playwright.config.*"
---

# Test Instructions

## Scope
- Applies when creating or updating automated tests and test-related configuration.
- Covers unit tests, integration tests, and Playwright E2E tests.

## Mandatory Git Flow
- For all test work, create and use a dedicated branch.
- Branch naming examples:
  - `test/<short-description>` for test-focused updates.
  - `fix/<short-description>` if test changes accompany a bug fix.
- Open a PR to `master` after tests are stable.
- All PRs must include test results and documented test scope.

## Playwright E2E Test Guidelines

### Setup and Execution
- Playwright is configured via `playwright.config.js` with Chromium.
- Test specs are in the root level (e.g., `*.spec.js`).
- Run tests locally with:
  - `yarn test:e2e` - headless (CI mode).
  - `yarn test:e2e:headed` - visible browser.
  - `yarn test:e2e:ui` - interactive UI mode for debugging.
- Test results stored in `test-results/` directory.

### Test Organization and Naming
- Organize tests by user flow (e.g., `app-smoke.spec.js`, `practice-mode.spec.js`, `exam-mode.spec.js`).
- Use descriptive test names that state the expected user outcome.
- Example: `test('should load practice mode and navigate between questions')`.

### Page Fixtures and Base URL
- Configure baseURL in `playwright.config.js` to support `/quiz-app/` deploy path and local dev.
- Use `page.goto('/')` to navigate; Playwright handles baseURL automatically.
- Mock or stub external services (Firebase Auth, Gemini API) to avoid test flakiness.

### Selectors and Accessibility
- Prefer accessible selectors over brittle CSS/XPath:
  - `page.getByRole('button', { name: 'Practice Mode' })`
  - `page.getByLabel('Quiz Selection')`
  - `page.getByText('Your text here')`
- Avoid hard-coded delays; use explicit waits:
  - `page.waitForSelector()`, `page.waitForNavigation()`, `page.locator().isVisible()`
- Use `page.pause()` during debugging in headed/UI mode.

### User Flow Coverage (Priority Order)
1. **Load and Selection**
   - Load home page and display quiz options.
   - Select and load a demo quiz successfully.
   - Upload a custom valid/invalid JSON quiz.
   
2. **Practice Mode**
   - Navigate questions (previous/next/jump to).
   - Answer single and multi-answer questions correctly and incorrectly.
   - Request AI explanation (mocked or stubbed).
   - Save and resume progress from checkpoint.

3. **Exam Mode**
   - Start exam with time limit (60 or 120 min).
   - Answer and navigate during exam.
   - Flag/unflag questions for review.
   - Review all answers before submit.
   - Submit exam and view results.

4. **Auth-Gated Features**
   - Login/logout flow (stub Firebase).
   - API key storage and retrieval.
   - Firestore progress sync (mock).

### Assertions and Validation
- Assert UI state changes (visible/hidden, button enabled/disabled).
- Assert navigation outcomes (URL changes, page content updates).
- Assert persisted data (localStorage, mocked Firestore).
- For failed assertions, include page state snapshot in error output (e.g., `page.screenshot()`).

### Flakiness Prevention
- **Timing**: Use explicit waits, not fixed delays (no `page.waitForTimeout()`).
- **Isolation**: Each test should be independent; do not rely on previous test state.
- **External Dependencies**: Mock Firebase, Gemini, and file uploads; do not call live services.
- **Retries**: Configure retry policy in `playwright.config.js` for flaky tests; document retry reason in test.

## Auto-Test CI/CD Integration

### GitHub Actions Workflow
- Add or update `.github/workflows/test.yml` to run E2E tests on every PR and push to `master`.
- Workflow should:
  - Install dependencies (`yarn install`).
  - Build the app (`yarn build`).
  - Run E2E tests (`yarn test:e2e`).
  - Upload test results and screenshots/videos to artifacts on failure.
  - Fail the workflow if any test fails (required for PR merge).

### Test Results and Reporting
- Generate test report in `test-results/` after each run.
- Attach test report (HTML or JSON) to workflow artifacts for easy review.
- Include pass/fail summary in PR comment for visibility.

### Continuous Improvement
- Monitor flaky tests; prioritize stabilization over test count growth.
- Keep test suite run time under 5 minutes for fast feedback.
- Review and update test fixtures and mocks when domain rules change.

## Test Strategy and Coverage Quality
- Prefer behavior-focused tests over implementation-detail assertions.
- Cover user-critical flows first (listed above in priority order).
- For bug fixes, add or update a test that reproduces the bug and verifies the fix.
- Assert meaningful outcomes (UI state, persisted state, navigation, and messages).
- Include both happy path and key failure/edge conditions for changed behavior.
- Keep test files small and readable; extract helper utilities if repeated.

## Validation and PR Expectations
- Run relevant test scope locally before finishing:
  - `yarn test:e2e` for full E2E suite.
  - `yarn test:e2e [test-name]` to run a single test file.
- Document in PR:
  - Test scope run (e.g., "all E2E tests", "practice mode tests").
  - Pass/fail status (screenshots/videos if failures).
  - Any intentionally skipped coverage or known flaky tests.
  - Mitigation plan for flakiness if present.
- If a test is flaky, call it out with cause and mitigation plan in the PR before merge.
