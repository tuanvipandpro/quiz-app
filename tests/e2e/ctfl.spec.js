import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
});

async function resumeCheckpoint(page, questionId) {
  await page.addInitScript((id) => {
    localStorage.setItem(
      'quiz-e2e-auth',
      JSON.stringify({ uid: 'test-alice', displayName: 'Test account', emailVerified: true })
    );
    localStorage.setItem(
      'quiz-e2e-profile:test-alice',
      JSON.stringify({
        llmProviders: {},
        quizProgress: {
          'istqb-ctfl-v4-0': { questionId: id, questionIndex: 0, savedAt: 1 },
        },
      })
    );
  }, questionId);
  await page.goto('./#/quiz/istqb-ctfl-v4-0/practice?resume=1');
}

test('CTFL cloud checkpoint resumes the restored question by its original ID', async ({ page }) => {
  await resumeCheckpoint(page, '230');
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

for (const { id, task, answerName } of [
  {
    id: '121',
    task: 'Which option BEST characterizes acceptance testing?',
    answerName: /^D\.\s*Statements I and IV/,
  },
  {
    id: '134',
    task: 'Which group lists the activities that are the MAIN focus of the test management role?',
    answerName: /^B\.\s*Activities II and V/,
  },
  {
    id: '139',
    task: 'Which option BEST describes static testing?',
    answerName: /^A\.\s*Statements I, III, and IV/,
  },
]) {
  test(`CTFL ${id} shows the recovered I–V list and scores its original answer after reload`, async ({
    page,
  }) => {
    await resumeCheckpoint(page, id);
    const title = page.locator('.question-title');
    await expect(title).toContainText(task);
    const content = await title.textContent();
    expect([...content.matchAll(/^(I|II|III|IV|V)\.\s+.+$/gm)].map((match) => match[1])).toEqual([
      'I',
      'II',
      'III',
      'IV',
      'V',
    ]);
    const correctAnswer = page.getByRole('radio', { name: answerName });
    await correctAnswer.check();
    await expect(page.getByText('Correct answer!', { exact: true })).toBeVisible();
    await page.reload();
    await expect(title).toContainText(task);
    await expect(correctAnswer).toBeChecked();
  });
}
