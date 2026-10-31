import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const sample = fileURLToPath(new URL('../../public/examples/quiz-single.json', import.meta.url));
test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
});
async function start(page, { uid, language = 'en', theme = 'light' } = {}) {
  await page.addInitScript(
    ({ uid, language, theme }) => {
      localStorage.setItem('quiz-app-language', language);
      localStorage.setItem('quiz-app-theme', theme);
      if (uid)
        localStorage.setItem(
          'quiz-e2e-auth',
          JSON.stringify({ uid, displayName: 'AI tester', email: 'tester@example.test' })
        );
    },
    { uid, language, theme }
  );
  await page.goto('./#/my-quizzes');
  await page.locator('input[type=file]').setInputFiles(sample);
  await page
    .getByRole('button', {
      name: language === 'vi' ? 'Sử dụng quiz' : 'Use this quiz',
      exact: true,
    })
    .click();
  // User-uploaded local practice uses the same renderer as bank/cloud quizzes.
  await page
    .getByRole('button', {
      name: language === 'vi' ? 'Bắt đầu luyện tập' : 'Start practice',
      exact: true,
    })
    .click();
  await expect(page.locator('.question-title')).toBeVisible();
}
async function explain(page) {
  await page.getByRole('button', { name: 'Explain', exact: true }).click();
}

test('logout while a result is in flight discards the private explanation', async ({ page }) => {
  await start(page, { uid: `logout-${randomUUID()}` });
  let release, received;
  const ready = new Promise((resolve) => {
    received = resolve;
  });
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/v1/explanations', async (route) => {
    const response = await route.fetch();
    received();
    await hold;
    try {
      await route.fulfill({ response });
    } catch {
      /* Logout aborted the browser request. */
    }
  });
  await explain(page);
  await ready;
  await page.getByRole('button', { name: 'AI tester', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Sign out?' });
  await dialog.getByRole('button', { name: 'Sign out', exact: true }).click();
  release();
  await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
  await expect(
    page.getByText('The correct answer follows from the stated conditions.')
  ).toHaveCount(0);
});
test('guest BYOK never calls App AI; key setup and sign-in option are visible', async ({
  page,
}) => {
  let workerCalls = 0;
  page.on('request', (req) => {
    if (req.url().includes(':5176/v1/')) workerCalls++;
  });
  await start(page);
  await explain(page);
  const settings = page.getByRole('dialog', { name: 'AI Settings', exact: true });
  await expect(
    settings.getByText('Guests use their own API key. Sign in to access App AI.')
  ).toBeVisible();
  await expect(settings.getByLabel('Google Gemini API key', { exact: true })).toBeVisible();
  await expect(settings.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  expect(workerCalls).toBe(0);
  await fs.mkdir('artifacts/app-ai', { recursive: true });
  await page.screenshot({ path: `artifacts/app-ai/guest-setup-${test.info().project.name}.png` });
  await page.route('https://generativelanguage.googleapis.com/**', (route) =>
    route.fulfill({
      json: { candidates: [{ content: { parts: [{ text: 'BYOK fixture explanation' }] } }] },
    })
  );
  const card = settings.locator('.ai-provider-card').filter({ hasText: 'Google Gemini' });
  await card.getByLabel('Google Gemini API key', { exact: true }).fill('fixture-key');
  await card.getByRole('button', { name: 'Save key', exact: true }).click();
  await expect(settings.getByText('API key saved in this browser.')).toBeVisible();
  await settings.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Explain', exact: true })).toBeFocused();
  await explain(page);
  await expect(page.getByText('BYOK fixture explanation')).toBeVisible();
  expect(workerCalls).toBe(0);
});

for (const language of ['en', 'vi'])
  for (const theme of ['light', 'dark']) {
    test(`App AI settings matrix ${language}/${theme}`, async ({ page }, testInfo) => {
      await start(page, { uid: `matrix-${randomUUID()}`, language, theme });
      await page
        .getByRole('button', { name: language === 'vi' ? 'Giải thích' : 'Explain', exact: true })
        .click();
      await expect(
        page.getByText(
          language === 'vi'
            ? 'Đáp án phù hợp với điều kiện trong câu hỏi.'
            : 'The correct answer follows from the stated conditions.'
        )
      ).toBeVisible();
      await page
        .getByRole('button', {
          name: language === 'vi' ? 'Cài đặt AI' : 'AI Settings',
          exact: true,
        })
        .click();
      const dialog = page.getByRole('dialog', {
        name: language === 'vi' ? 'Cài đặt AI' : 'AI Settings',
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      for (const width of [320, 390, 412, 768, 1280, 844]) {
        await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
          .toBe(true);
        for (const control of await dialog
          .locator('.ai-source-options .ant-radio-button-wrapper')
          .all()) {
          await expect
            .poll(async () => (await control.boundingBox()).height)
            .toBeGreaterThanOrEqual(44);
          const box = await control.boundingBox();
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
        }
      }
      await page.setViewportSize({
        width: testInfo.project.name === 'phone' ? 320 : 1280,
        height: 900,
      });
      await fs.mkdir('artifacts/app-ai', { recursive: true });
      await page.screenshot({
        path: `artifacts/app-ai/settings-${language}-${theme}-${testInfo.project.name}.png`,
      });
      await dialog
        .locator('.ant-radio-button-wrapper')
        .filter({ hasText: language === 'vi' ? 'API key của bạn' : 'Your API key' })
        .click();
      await expect(
        dialog.getByLabel(language === 'vi' ? 'API key Google Gemini' : 'Google Gemini API key', {
          exact: true,
        })
      ).toBeVisible();
    });
  }
test('authenticated App AI round trip, cached viewing and explicit BYOK with no key fallback', async ({
  page,
}) => {
  await start(page, { uid: `browser-${randomUUID()}` });
  await explain(page);
  await expect(
    page.getByText('The correct answer follows from the stated conditions.')
  ).toBeVisible();
  await expect(page.getByText('4/5 App AI attempts left today')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await explain(page);
  await expect(page.getByText(/Saved explanation/)).toBeVisible();
  await expect(page.getByText('4/5 App AI attempts left today')).toBeVisible();
  await page.getByRole('button', { name: 'AI Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'AI Settings', exact: true });
  await settings.locator('.ant-radio-button-wrapper').filter({ hasText: 'Your API key' }).click();
  await settings.getByRole('button', { name: 'Done', exact: true }).click();
  await explain(page);
  await expect(page.getByRole('dialog', { name: 'AI Settings', exact: true })).toBeVisible();
});
test('model failure retry reuses operation; regenerate is explicit and quota is truthful', async ({
  page,
  request,
}) => {
  const uid = `failure-${randomUUID()}`;
  await request.get(`http://127.0.0.1:5176/__test/behavior?uid=${uid}&mode=failure`);
  await start(page, { uid });
  await explain(page);
  await expect(
    page.getByText('App AI is unavailable. You can choose your own API key.').last()
  ).toBeVisible();
  await expect(page.getByText('4/5 App AI attempts left today')).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
  await expect(page.getByText('4/5 App AI attempts left today')).toBeVisible();
  await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
  await expect(page.getByText('3/5 App AI attempts left today')).toBeVisible();
});
test('quota states, themes and source controls fit phone/desktop/landscape', async ({
  page,
}, testInfo) => {
  const uid = `layout-${randomUUID()}`;
  await start(page, { uid });
  await explain(page);
  await expect(
    page.getByText('The correct answer follows from the stated conditions.')
  ).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
    await expect(page.getByText(`${3 - i}/5 App AI attempts left today`)).toBeVisible();
  }
  await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
  await expect(page.getByText('You have used your App AI allowance for today.')).toBeVisible();
  for (const width of [320, 390, 412, 768, 1280, 844]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    for (const item of await page
      .locator('.ai-source-options .ant-radio-button-wrapper:visible')
      .all()) {
      await expect.poll(async () => (await item.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await fs.mkdir('artifacts/app-ai', { recursive: true });
  await page.screenshot({ path: `artifacts/app-ai/quota-${testInfo.project.name}.png` });
});
