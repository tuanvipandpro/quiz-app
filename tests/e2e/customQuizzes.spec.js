import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CUSTOM_QUIZ_MESSAGES } from '../../src/utils/customQuizModel.js';

const sample = (type = 'single') =>
  fileURLToPath(new URL(`../../public/examples/quiz-${type}.json`, import.meta.url));
const card = (page, name) =>
  page
    .locator('.cloud-quiz-card')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
const values = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('quiz-e2e-custom:test-alice') || '{}'));

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
});
async function login(page) {
  await page.goto('./');
  await page.getByRole('banner').getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Test account', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'My quizzes', exact: true }).click();
  await expect(page.getByText('0/3 saved quizzes', { exact: true })).toBeVisible();
}
async function preview(page, name, type = 'single') {
  await page.locator('input[type=file]').setInputFiles(sample(type));
  await page.getByRole('textbox', { name: 'Quiz name', exact: true }).fill(name);
}
async function save(page, name, type = 'single') {
  await preview(page, name, type);
  await page.getByRole('button', { name: 'Save to my quizzes', exact: true }).click();
  await expect(card(page, name)).toBeVisible();
}
async function confirm(page, name, action) {
  const dialog =
    name === 'Sign out?'
      ? page.getByRole('dialog').filter({ hasText: name })
      : page.getByRole('dialog', { name, exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: action, exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function contrastRatio(locator) {
  const { foreground, background } = await locator.evaluate((element) => {
    let current = element,
      background;
    while (current) {
      background = getComputedStyle(current).backgroundColor;
      if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') break;
      current = current.parentElement;
    }
    return { foreground: getComputedStyle(element).color, background };
  });
  const luminance = (color) => {
    const rgb = color
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number)
      .map((v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('explicit cloud save survives reload and is available from a second client page', async ({
  page,
  context,
}, testInfo) => {
  await login(page);
  await preview(page, 'Private example');
  expect(Object.keys(await values(page))).toHaveLength(0);
  await page.getByRole('button', { name: 'Save to my quizzes', exact: true }).click();
  await expect(
    page.getByText('Quiz saved. Available on your signed-in devices.', { exact: true })
  ).toBeVisible();
  await expect(page.getByText('1/3 saved quizzes', { exact: true })).toBeVisible();
  await page.reload();
  await expect(card(page, 'Private example')).toBeVisible();
  await page.getByRole('heading', { name: 'Saved quizzes', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath(`saved-normal-${testInfo.project.name}.png`),
    animations: 'disabled',
  });
  const second = await context.newPage();
  await second.goto('./#/my-quizzes');
  await expect(card(second, 'Private example')).toBeVisible();
  await card(second, 'Private example')
    .getByRole('button', { name: 'Mock exam', exact: true })
    .click();
  await expect(second.getByText('No guide published yet', { exact: true })).toBeVisible();
  await expect(second.getByText('Quick Summary', { exact: true })).toHaveCount(0);
  await second.close();
});

test('quota, replacement confirmation and deletion preserve the candidate and release capacity', async ({
  page,
}) => {
  await login(page);
  for (const name of ['One', 'Two', 'Three']) await save(page, name);
  await expect(page.getByText('3/3 saved quizzes', { exact: true })).toBeVisible();
  await preview(page, 'Four', 'multiple');
  await page.getByRole('button', { name: 'Save to my quizzes', exact: true }).click();
  await expect(page.locator('.upload-preview').getByRole('alert')).toContainText(
    CUSTOM_QUIZ_MESSAGES.CUSTOM_QUOTA
  );
  await expect(page.getByRole('textbox', { name: 'Quiz name', exact: true })).toHaveValue('Four');
  await card(page, 'Two').getByRole('button', { name: 'Replace JSON', exact: true }).click();
  await page.getByRole('button', { name: 'Replace quiz', exact: true }).click();
  await confirm(page, 'Replace this quiz?', 'Cancel');
  await expect(card(page, 'Two')).toBeVisible();
  await page.getByRole('button', { name: 'Replace quiz', exact: true }).click();
  await confirm(page, 'Replace this quiz?', 'Replace quiz');
  await expect(card(page, 'Four')).toBeVisible();
  await expect(page.getByText('3/3 saved quizzes', { exact: true })).toBeVisible();
  await card(page, 'One').getByRole('button', { name: 'Delete', exact: true }).click();
  await confirm(page, 'Delete this quiz?', 'Cancel');
  await expect(
    card(page, 'One').getByRole('button', { name: 'Delete', exact: true })
  ).toBeFocused();
  await card(page, 'One').getByRole('button', { name: 'Delete', exact: true }).click();
  await confirm(page, 'Delete this quiz?', 'Delete');
  await expect(page.getByText('2/3 saved quizzes', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saved quizzes', exact: true })).toBeFocused();
  await expect(
    page.getByText('Quiz saved. Available on your signed-in devices.', { exact: true })
  ).toHaveCount(0);
  await save(page, 'After deletion');
  await expect(page.getByText('3/3 saved quizzes', { exact: true })).toBeVisible();
});

test('rename preserves checkpoint and draft; replacement invalidates only that instance', async ({
  page,
}) => {
  await login(page);
  await save(page, 'Original');
  await page.evaluate(() =>
    sessionStorage.setItem('quiz-study-v1:test-alice:aws-saa:practice', 'bank-sentinel')
  );
  await card(page, 'Original').getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByRole('radio', { name: /Paris/ }).check();
  await page.getByRole('button', { name: 'Save position', exact: true }).click();
  await confirm(page, 'Save position?', 'Save');
  await expect(page.getByRole('button', { name: 'Position saved', exact: true })).toBeVisible();
  const originalUrl = page.url();
  await page.getByRole('button', { name: 'My quizzes', exact: true }).click();
  await card(page, 'Original').getByRole('button', { name: 'Rename', exact: true }).click();
  const rename = page.getByRole('dialog', { name: 'Rename quiz', exact: true });
  await rename.getByRole('textbox', { name: 'Quiz name', exact: true }).fill('Renamed');
  await confirm(page, 'Rename quiz', 'Save name');
  await expect(card(page, 'Renamed')).toContainText('Saved at question 1');
  await card(page, 'Renamed').getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByRole('radio', { name: /Paris/ })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Position saved', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'My quizzes', exact: true }).click();
  await card(page, 'Renamed').getByRole('button', { name: 'Replace JSON', exact: true }).click();
  await preview(page, 'Replaced', 'multiple');
  await page.getByRole('button', { name: 'Replace quiz', exact: true }).click();
  await confirm(page, 'Replace this quiz?', 'Replace quiz');
  await expect(card(page, 'Replaced')).not.toContainText('Saved at question');
  const drafts = await page.evaluate(() => Object.keys(sessionStorage));
  expect(drafts.filter((key) => key.startsWith('quiz-study-v1:test-alice:cloud:'))).toEqual([]);
  expect(
    await page.evaluate(() => sessionStorage.getItem('quiz-study-v1:test-alice:aws-saa:practice'))
  ).toBe('bank-sentinel');
  await page.goto(originalUrl);
  await expect(
    page.getByText(
      'This quiz’s content has changed. Open My quizzes to start with the latest version.',
      { exact: true }
    )
  ).toBeVisible();
  await expect(page.locator('.question-title')).toHaveCount(0);
});

test('an external replacement ends stale study content and a reused slot never opens as the old quiz', async ({
  page,
  context,
}) => {
  await login(page);
  await save(page, 'Original');
  await card(page, 'Original').getByRole('button', { name: 'Practice', exact: true }).click();
  const oldUrl = page.url().split('?')[0];
  await page.goto(oldUrl);
  await expect(page).toHaveURL(/\?version=1$/);
  const other = await context.newPage();
  await other.goto('./#/my-quizzes');
  await card(other, 'Original').getByRole('button', { name: 'Replace JSON', exact: true }).click();
  await preview(other, 'Replacement', 'multiple');
  await other.getByRole('button', { name: 'Replace quiz', exact: true }).click();
  await confirm(other, 'Replace this quiz?', 'Replace quiz');
  await expect(
    page.getByText(
      'This quiz’s content has changed. Open My quizzes to start with the latest version.',
      { exact: true }
    )
  ).toBeVisible();
  await expect(page.locator('.question-title')).toHaveCount(0);
  await card(other, 'Replacement').getByRole('button', { name: 'Delete', exact: true }).click();
  await confirm(other, 'Delete this quiz?', 'Delete');
  await save(other, 'New occupant');
  await page.goto(oldUrl);
  await expect(
    page.getByText('This saved quiz is no longer available. Open My quizzes to reload your list.', {
      exact: true,
    })
  ).toBeVisible();
  await expect(page.locator('.question-title')).toHaveCount(0);
  await other.close();
});

test('saved custom exam reload preserves shuffled questions, flags, answers, mode and deadline', async ({
  page,
}) => {
  await login(page);
  await save(page, 'Cloud exam', 'single');
  await card(page, 'Cloud exam').getByRole('button', { name: 'Mock exam', exact: true }).click();
  await page.getByRole('radio', { name: 'Learning exam', exact: true }).check();
  await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  await page.getByRole('radio', { name: 'Paris', exact: true }).check();
  await page.getByRole('button', { name: 'Flag', exact: true }).click();
  const read = () =>
    page.evaluate(() => {
      const key = Object.keys(sessionStorage).find(
        (key) => key.startsWith('quiz-study-v1:test-alice:cloud:') && key.endsWith(':exam')
      );
      return JSON.parse(sessionStorage.getItem(key));
    });
  const before = await read();
  await page.reload();
  await expect(page.getByText('Correct answer!', { exact: true })).toBeVisible();
  expect(await read()).toEqual(before);
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
  await confirm(page, 'Review before submitting', 'Submit and view results');
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: /^Paris/ })).toBeDisabled();
});

for (const type of ['multiple', 'yes-no', 'dropdown-rows', 'dropdown-inline']) {
  test(`saved ${type} content renders in both Practice and Exam`, async ({ page }) => {
    await login(page);
    await save(page, 'Formats', type);
    await card(page, 'Formats').getByRole('button', { name: 'Practice', exact: true }).click();
    await expect(page.locator('.question-title')).toBeVisible();
    if (type === 'multiple') await expect(page.getByRole('checkbox').first()).toBeVisible();
    else if (type === 'yes-no')
      await expect(page.getByText('Yes', { exact: true }).first()).toBeVisible();
    else await expect(page.getByRole('combobox').first()).toBeVisible();
    await page.getByRole('button', { name: 'Back to quiz overview', exact: true }).click();
    await expect(page.getByText('No guide published yet', { exact: true })).toBeVisible();
    await page.getByText('Mock exam', { exact: true }).click();
    await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
    await expect(page.locator('.question-title')).toBeVisible();
  });
}

for (const code of ['NETWORK', 'PERMISSION', 'SIZE', 'CONFLICT', 'REJECTED']) {
  test(`a ${code} save failure keeps the candidate and allows retry`, async ({ page }) => {
    await login(page);
    await preview(page, 'Retry me');
    await page.evaluate(
      (code) => sessionStorage.setItem('quiz-e2e-custom-fail-create', code),
      code
    );
    await page.getByRole('button', { name: 'Save to my quizzes', exact: true }).click();
    await expect(page.locator('.upload-preview').getByRole('alert')).toContainText(
      CUSTOM_QUIZ_MESSAGES[`CUSTOM_${code}`]
    );
    await expect(page.getByRole('textbox', { name: 'Quiz name', exact: true })).toHaveValue(
      'Retry me'
    );
    expect(Object.keys(await values(page))).toHaveLength(0);
    await page.getByRole('button', { name: 'Save to my quizzes', exact: true }).click();
    await expect(card(page, 'Retry me')).toBeVisible();
  });
}

test('retry after a committed save loses its response does not consume another slot', async ({
  page,
}) => {
  await login(page);
  await preview(page, 'Idempotent');
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-custom-lose-response', '1'));
  await page.getByRole('button', { name: 'Save to my quizzes', exact: true }).click();
  await expect(page.locator('.upload-preview').getByRole('alert')).toContainText(
    CUSTOM_QUIZ_MESSAGES.CUSTOM_NETWORK
  );
  await page.getByRole('button', { name: 'Save to my quizzes', exact: true }).click();
  await expect(page.getByText('1/3 saved quizzes', { exact: true })).toBeVisible();
  expect(Object.keys(await values(page))).toHaveLength(1);
});

test('byte-budget rejection preserves preview and never reports a cloud save', async ({ page }) => {
  await login(page);
  const question = JSON.parse(fs.readFileSync(sample(), 'utf8'))[0];
  await page.locator('input[type=file]').setInputFiles({
    name: 'big.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([{ ...question, explanation: 'x'.repeat(800 * 1024) }])),
  });
  await page.getByRole('button', { name: 'Save to my quizzes', exact: true }).click();
  await expect(page.locator('.upload-preview').getByRole('alert')).toContainText(
    CUSTOM_QUIZ_MESSAGES.CUSTOM_SIZE
  );
  await expect(page.getByRole('textbox', { name: 'Quiz name', exact: true })).toHaveValue('big');
  await expect(page.getByText('0/3 saved quizzes', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Quiz saved. Available on your signed-in devices.', { exact: true })
  ).toHaveCount(0);
});

test('private loading errors are recoverable and do not block bank navigation', async ({
  page,
}) => {
  await page.addInitScript(() => sessionStorage.setItem('quiz-e2e-custom-fail-list', 'PERMISSION'));
  await page.goto('./');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'My quizzes', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: CUSTOM_QUIZ_MESSAGES.CUSTOM_PERMISSION })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('0/3 saved quizzes', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quiz Bank', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
});

test('guest uploads remain local and login does not migrate a guest draft into saved quizzes', async ({
  page,
}) => {
  await page.goto('./#/my-quizzes');
  await preview(page, 'Guest only');
  await page.getByRole('button', { name: 'Use this quiz', exact: true }).click();
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.getByRole('radio', { name: /Paris/ }).check();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'My quizzes', exact: true }).click();
  await expect(page.getByText('0/3 saved quizzes', { exact: true })).toBeVisible();
  await expect(page.getByText('Guest only', { exact: true })).toHaveCount(0);
});

test('logout and another account cannot display a private quiz through its old deep link', async ({
  page,
}) => {
  await login(page);
  await save(page, 'Alice private');
  await card(page, 'Alice private').getByRole('button', { name: 'Practice', exact: true }).click();
  const url = page.url();
  await page.getByRole('button', { name: 'Test account', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await confirm(page, 'Sign out?', 'Sign out');
  await page.goto(url);
  await expect(page.getByText('Sign in to open your saved quiz.', { exact: true })).toBeVisible();
  await expect(page.locator('.question-title')).toHaveCount(0);
  await page.evaluate(() =>
    localStorage.setItem(
      'quiz-e2e-auth',
      JSON.stringify({ uid: 'test-bob', displayName: 'Bob', email: 'bob@example.test' })
    )
  );
  await page.reload();
  await expect(
    page.getByText('This saved quiz is no longer available. Open My quizzes to reload your list.', {
      exact: true,
    })
  ).toBeVisible();
  await expect(page.getByText('Alice private', { exact: true })).toHaveCount(0);
});

test('cloud management and rename dialog fit phones, desktop and landscape in both languages and themes', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await login(page);
  const longName = 'CertificationQuizWithAnIntentionallyLongName'.repeat(3);
  const captures = new Set([
    'vi-dark-320',
    'en-light-390',
    'en-dark-412',
    'vi-light-768',
    'en-light-1280',
    'vi-dark-844',
  ]);
  const contrastEvidence = [];
  await save(page, longName);
  for (const language of ['en', 'vi']) {
    await page
      .getByRole('button', { name: language === 'en' ? 'English' : 'Tiếng Việt', exact: true })
      .click();
    for (const theme of ['light', 'dark']) {
      if ((await page.locator('html').getAttribute('data-theme')) !== theme)
        await page.locator('.theme-toggle').click();
      for (const [width, height] of [
        [320, 844],
        [390, 844],
        [412, 915],
        [768, 1024],
        [1280, 900],
        [844, 390],
      ]) {
        await page.setViewportSize({ width, height });
        const reload = await page
          .getByRole('button', {
            name: language === 'en' ? 'Reload saved quizzes' : 'Tải lại quiz đã lưu',
            exact: true,
          })
          .boundingBox();
        expect(reload.width).toBeGreaterThanOrEqual(44);
        expect(reload.height).toBeGreaterThanOrEqual(44);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
          )
        ).toBe(true);
        for (const button of await card(page, longName).getByRole('button').all()) {
          const box = await button.boundingBox();
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
        }
        const deleteAction = card(page, longName).getByRole('button', {
          name: language === 'en' ? 'Delete' : 'Xóa',
          exact: true,
        });
        const cardContrast = await contrastRatio(deleteAction);
        expect(cardContrast).toBeGreaterThanOrEqual(4.5);
        contrastEvidence.push({ language, theme, width, cardContrast });
        const capture =
          testInfo.project.name === 'desktop' && captures.has(`${language}-${theme}-${width}`);
        if (capture) {
          await page
            .getByRole('heading', {
              name: language === 'en' ? 'Saved quizzes' : 'Quiz đã lưu',
              exact: true,
            })
            .scrollIntoViewIfNeeded();
          await page.screenshot({
            path: testInfo.outputPath(`saved-${width}-${language}-${theme}.png`),
            animations: 'disabled',
          });
        }
        await card(page, longName)
          .getByRole('button', { name: language === 'en' ? 'Rename' : 'Đổi tên', exact: true })
          .click();
        const dialog = page.getByRole('dialog', {
          name: language === 'en' ? 'Rename quiz' : 'Đổi tên quiz',
          exact: true,
        });
        await expect(dialog).toBeVisible();
        const input = dialog.getByRole('textbox');
        await expect(input).toHaveValue(longName);
        await expect(input).toHaveCSS('min-height', '44px');
        await expect
          .poll(async () => Math.round((await input.boundingBox()).height))
          .toBeGreaterThanOrEqual(44);
        if (capture)
          await page.screenshot({
            path: testInfo.outputPath(`rename-${width}-${language}-${theme}.png`),
            animations: 'disabled',
          });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
          )
        ).toBe(true);
        await dialog
          .getByRole('button', { name: language === 'en' ? 'Cancel' : 'Hủy', exact: true })
          .click();
        await expect(dialog).toBeHidden();
        await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
        if (width === 320 || (width === 844 && language === 'vi' && theme === 'dark')) {
          await deleteAction.click();
          const deletion = page.getByRole('dialog', {
            name: language === 'en' ? 'Delete this quiz?' : 'Xóa quiz này?',
            exact: true,
          });
          await expect(deletion.getByText(longName, { exact: true })).toBeVisible();
          const confirmationContrast = await contrastRatio(
            deletion.getByRole('button', {
              name: language === 'en' ? 'Delete' : 'Xóa',
              exact: true,
            })
          );
          expect(confirmationContrast).toBeGreaterThanOrEqual(4.5);
          contrastEvidence.push({ language, theme, width, confirmationContrast });
          if (capture)
            await page.screenshot({
              path: testInfo.outputPath(`delete-${width}-${language}-${theme}.png`),
              animations: 'disabled',
            });
          await deletion
            .getByRole('button', { name: language === 'en' ? 'Cancel' : 'Hủy', exact: true })
            .click();
          await expect(deletion).toBeHidden();
          await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
        }
      }
    }
  }
  fs.writeFileSync(testInfo.outputPath('contrast.json'), JSON.stringify(contrastEvidence, null, 2));
});
