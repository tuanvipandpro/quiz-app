import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const example = (name) =>
  fileURLToPath(new URL(`../../public/examples/quiz-${name}.json`, import.meta.url));

test.beforeEach(async ({ page }) => {
  // Fixtures replace auth/profile services; fail closed if an external request escapes.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
});

async function signIn(page) {
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Test account', exact: true })).toBeVisible();
}

async function requestSignOut(page) {
  await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
  await page.getByRole('button', { name: 'Test account', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('separator')).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Sign out?' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('bank, provider identities, language and theme work without overflow', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
  await expect(page.getByText('20 quiz sets', { exact: true })).toBeVisible();
  await expect(page.locator('.header-settings')).toHaveCount(0);
  await expect(page.locator('.provider-jumps button')).toHaveCount(5);
  await page.getByRole('textbox', { name: 'Find a certification' }).fill('CLF-C02');
  await expect(page.getByText('No matching quizzes', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: /Find a certification/ }).fill('CCA-F');
  await expect(page.locator('.exam-code')).toHaveText('CCAR-F');
  await page.getByRole('textbox', { name: /Find a certification/ }).fill('');
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  for (const width of [320, 390, 412, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
    ).toBe(true);
    const brand = await page.locator('.app-brand').boundingBox();
    const nav = await page.locator('.app-nav').boundingBox();
    if (width <= 700) expect(Math.abs(brand.x - nav.x)).toBeLessThan(2);
  }
});

test('legacy links and cloud checkpoints resolve to Google ACE', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'quiz-e2e-profile:test-alice',
      JSON.stringify({
        llmProviders: {},
        quizProgress: { 'aws-ace': { questionIndex: 9, savedAt: 10 } },
      })
    );
  });
  await page.goto('./#/quiz/aws-ace/practice?resume=1&entry=regression');
  await expect(page).toHaveURL(/#\/quiz\/gcp-ace\/practice\?resume=1&entry=regression$/);
  await expect(page.locator('.question-title')).toBeVisible();
  await signIn(page);
  await expect(page.getByText('Question 10 of 302', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await expect(page.getByText('Question 11 of 302', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Question 11 of 302', { exact: true })).toBeVisible();
});

test('upload rejects 101 questions and malformed JSON, previews and restores a valid quiz', async ({
  page,
}) => {
  await page.goto('./#/my-quizzes');
  const input = page.locator('input[type=file]');
  const single = JSON.parse(fs.readFileSync(example('single'), 'utf8'))[0];
  await input.setInputFiles({
    name: 'too-many.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify(Array.from({ length: 101 }, (_, i) => ({ ...single, id: i })))
    ),
  });
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid quiz file' })).toContainText(
    '1–100'
  );
  await input.setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  });
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid quiz file' })).toBeVisible();
  await input.setInputFiles(example('single'));
  await expect(page.getByRole('textbox', { name: 'Quiz name', exact: true })).toHaveValue(
    'quiz-single'
  );
  await page.getByRole('button', { name: 'Use this quiz', exact: true }).click();
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.getByRole('radio', { name: /Paris/ }).check();
  await page.reload();
  await expect(page.getByRole('radio', { name: /Paris/ })).toBeChecked();
});

for (const format of ['multiple', 'yes-no', 'dropdown-rows', 'dropdown-inline']) {
  test(`uploaded ${format} quiz renders supported controls`, async ({ page }) => {
    await page.goto('./#/my-quizzes');
    await page.locator('input[type=file]').setInputFiles(example(format));
    await page.getByRole('button', { name: 'Use this quiz', exact: true }).click();
    await page.getByRole('button', { name: 'Start practice', exact: true }).click();
    await expect(page.locator('.question-title')).toBeVisible();
    if (format === 'multiple') await expect(page.getByRole('checkbox').first()).toBeVisible();
    else if (format === 'yes-no') {
      await page.getByText('Yes', { exact: true }).first().click();
      await page.getByText('No', { exact: true }).last().click();
      await expect(page.getByText('Correct answer!', { exact: true })).toBeVisible();
    } else await expect(page.getByRole('combobox').first()).toBeVisible();
  });
}

test('account menu confirms sign-out and handles cancel, failure and success', async ({ page }) => {
  await page.goto('./');
  await signIn(page);
  let dialog = await requestSignOut(page);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => sessionStorage.getItem('quiz-e2e-signout-count'))).toBeNull();
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-fail-signout', '1'));
  dialog = await requestSignOut(page);
  await dialog.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByText('Could not sign out. Please retry.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Test account', exact: true })).toBeVisible();
  await page.evaluate(() => sessionStorage.removeItem('quiz-e2e-fail-signout'));
  await dialog.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#\/library$/);
});

test('exam preserves deadline on refresh and requires confirmation before leaving or signing out', async ({
  page,
}) => {
  await page.goto('./#/quiz/aws-aip-c01?mode=exam');
  await signIn(page);
  await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  await expect(page.locator('.question-title')).toBeVisible();
  const deadline = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('quiz-study-v1:test-alice:aws-aip-c01:exam')).deadline
  );
  await page.reload();
  await expect(page.locator('.question-title')).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem('quiz-study-v1:test-alice:aws-aip-c01:exam')).deadline
    )
  ).toBe(deadline);
  await page.getByRole('button', { name: 'Quiz Bank', exact: true }).click();
  const leaveDialog = page.getByRole('dialog').filter({ hasText: 'Leave this exam?' });
  await expect(leaveDialog).toBeVisible();
  await leaveDialog.getByRole('button', { name: 'Continue exam', exact: true }).click();
  await expect(leaveDialog).toBeHidden();
  const dialog = await requestSignOut(page);
  await expect(dialog).toContainText('end this exam');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
  await page.getByRole('button', { name: 'Submit and view results', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
  await expect(page.locator('.question-options input').first()).toBeDisabled();
});
