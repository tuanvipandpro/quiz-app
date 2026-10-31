import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
});

test('CTFL cloud checkpoint resumes the restored question by its original ID', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'quiz-e2e-auth',
      JSON.stringify({ uid: 'test-alice', displayName: 'Test account', emailVerified: true })
    );
    localStorage.setItem(
      'quiz-e2e-profile:test-alice',
      JSON.stringify({
        llmProviders: {},
        quizProgress: {
          'istqb-ctfl-v4-0': { questionId: '230', questionIndex: 0, savedAt: 1 },
        },
      })
    );
  });
  await page.goto('./#/quiz/istqb-ctfl-v4-0/practice?resume=1');
  await expect(page.locator('.study-position')).toContainText('Question 228 of 276');
  await expect(page.locator('.question-title')).toContainText('annual bonus');
  await expect(page.locator('.question-options input[type=radio]')).toHaveCount(4);
  const correctAnswer = page.getByRole('radio', { name: /^B\.\s*6\./ });
  await correctAnswer.check();
  await expect(page.getByText('Correct answer!', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.study-position')).toContainText('Question 228 of 276');
  await expect(correctAnswer).toBeChecked();
});
