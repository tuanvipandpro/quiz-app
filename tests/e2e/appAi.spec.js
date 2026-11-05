import { test, expect } from '@playwright/test';
import { clickAfterUiMotion, waitForUiMotion } from './uiMotion.js';
import { viewportCases } from './viewports.js';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const sample = fileURLToPath(new URL('../fixtures/ai-rationale-question.json', import.meta.url));
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
  const generate = page.getByRole('button', { name: 'Generate AI explanation', exact: true });
  if (await generate.count()) await generate.click();
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
  await clickAfterUiMotion(page.getByRole('menuitem', { name: 'Sign out', exact: true }));
  const dialog = page.getByRole('dialog').filter({ hasText: 'Sign out?' });
  await clickAfterUiMotion(dialog.getByRole('button', { name: 'Sign out', exact: true }));
  release();
  await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
  await expect(page.getByText('Đáp án phù hợp với điều kiện trong câu hỏi.')).toHaveCount(0);
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
  await expect(settings).toBeVisible();
  await waitForUiMotion(settings);
  await expect(settings.getByText('App AI, no API key needed.')).toBeVisible();
  await expect(settings.getByLabel('Google Gemini API key', { exact: true })).toBeVisible();
  await expect(settings.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  expect(workerCalls).toBe(0);
  await fs.mkdir('artifacts/app-ai', { recursive: true });
  await page.screenshot({ path: `artifacts/app-ai/guest-setup-${test.info().project.name}.png` });
  const prompts = [];
  const byokAnswer = 'Lời giải kiểm thử: giữ nguyên IAM, API, CloudTrail và Pub/Sub.';
  await page.route('https://generativelanguage.googleapis.com/**', (route) => {
    prompts.push(route.request().postDataJSON().contents[0].parts[0].text);
    return route.fulfill({
      json: { candidates: [{ content: { parts: [{ text: byokAnswer }] } }] },
    });
  });
  const card = settings.locator('.ai-provider-form');
  await card.getByLabel('Google Gemini API key', { exact: true }).fill('fixture-key');
  await card.getByRole('button', { name: 'Save key', exact: true }).click();
  await expect(settings.getByText('API key saved in this browser.')).toBeVisible();
  await clickAfterUiMotion(settings.getByRole('button', { name: 'Done', exact: true }));
  await expect(
    page.getByRole('button', { name: 'Generate AI explanation', exact: true })
  ).toBeFocused();
  await explain(page);
  const answer = page.locator('.explanation-panel .markdown-container[lang="vi"]');
  await expect(answer).toContainText(byokAnswer);
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await expect(answer).toContainText(byokAnswer);
  await page.getByRole('button', { name: 'Đóng', exact: true }).last().click();
  await page.getByRole('button', { name: 'Giải thích', exact: true }).click();
  await expect(page.getByText(/Lời giải đã lưu/)).toBeVisible();
  await expect(answer).toContainText(byokAnswer);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByText(/Saved explanation/)).toBeVisible();
  await expect(answer).toContainText(byokAnswer);
  expect(prompts).toHaveLength(1);
  expect(prompts[0]).toContain('bằng tiếng Việt');
  expect(prompts[0]).toContain('Giữ nguyên thuật ngữ kỹ thuật tiếng Anh');
  expect(workerCalls).toBe(0);
});

for (const language of ['en', 'vi'])
  for (const theme of ['light', 'dark']) {
    test(`App AI settings matrix ${language}/${theme}`, async ({ page }, testInfo) => {
      await start(page, { uid: `matrix-${randomUUID()}`, language, theme });
      await page
        .getByRole('button', { name: language === 'vi' ? 'Giải thích' : 'Explain', exact: true })
        .click();
      await page
        .getByRole('button', {
          name: language === 'vi' ? 'Tạo giải thích AI' : 'Generate AI explanation',
          exact: true,
        })
        .click();
      await expect(page.getByText('Đáp án phù hợp với điều kiện trong câu hỏi.')).toBeVisible();
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
      await waitForUiMotion(dialog);
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      for (const { width, height } of viewportCases(testInfo.project.name)) {
        await page.setViewportSize({ width, height });
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
  await expect(page.getByText('Đáp án phù hợp với điều kiện trong câu hỏi.')).toBeVisible();
  await expect(page.getByText('19/20 App AI attempts left today')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await explain(page);
  await expect(page.getByText(/Saved explanation/)).toBeVisible();
  await expect(page.getByText('19/20 App AI attempts left today')).toBeVisible();
  await page.getByRole('button', { name: 'AI Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'AI Settings', exact: true });
  await expect(settings).toBeVisible();
  await waitForUiMotion(settings);
  await settings.locator('.ant-radio-button-wrapper').filter({ hasText: 'Your API key' }).click();
  await clickAfterUiMotion(settings.getByRole('button', { name: 'Done', exact: true }));
  await explain(page);
  await expect(page.getByRole('dialog', { name: 'AI Settings', exact: true })).toBeVisible();
});

test('UI language changes preserve an in-flight Vietnamese attempt and its cached result', async ({
  page,
}, testInfo) => {
  await start(page, { uid: `language-${randomUUID()}` });
  let release, received;
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  const ready = new Promise((resolve) => {
    received = resolve;
  });
  const bodies = [];
  await page.route('**/v1/explanations', async (route) => {
    bodies.push(route.request().postDataJSON());
    const response = await route.fetch();
    received();
    await hold;
    await route.fulfill({ response });
  });
  await explain(page);
  await ready;
  // Practice explanations are inline, so the regular language toggle is reachable.
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  release();
  const result = page.locator('.explanation-panel .markdown-container[lang="vi"]');
  await expect(result).toContainText('Đáp án phù hợp với điều kiện trong câu hỏi.');
  await expect(result).toContainText('IAM, API, CloudTrail, Pub/Sub');
  for (const heading of [
    '1. Hiểu câu hỏi',
    '2. Đáp án',
    '3. Vì sao đáp án đúng',
    '4. Vì sao các đáp án khác sai',
  ])
    await expect(result.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  await expect(result).toContainText('B. AWS Glue Data Catalog');
  await expect(result).toContainText('C. Google Cloud Pub/Sub');
  await expect(result).toContainText('D. IAM permission');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(result).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await explain(page);
  await expect(page.getByText(/Saved explanation/)).toBeVisible();
  await expect(page.getByText('19/20 App AI attempts left today')).toBeVisible();
  expect(bodies).toHaveLength(1);
  expect(bodies[0].language).toBe('vi');
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await expect(page.getByText(/Lời giải đã lưu/)).toBeVisible();
  await expect(result).toContainText('IAM, API, CloudTrail, Pub/Sub');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByText(/Saved explanation/)).toBeVisible();
  expect(bodies).toHaveLength(1);
  for (const theme of ['light', 'dark']) {
    if ((await page.locator('html').getAttribute('data-theme')) !== theme)
      await page.locator('.theme-toggle').click();
    for (const { width, height } of viewportCases(testInfo.project.name)) {
      await page.setViewportSize({ width, height });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
    }
    await page.setViewportSize({
      width: testInfo.project.name === 'phone' ? 320 : 1280,
      height: 900,
    });
    await result.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`vietnamese-explanation-en-ui-${theme}.png`),
    });
  }
});
test('model failure retry reuses operation; regenerate is explicit and quota is truthful', async ({
  page,
  request,
}) => {
  const uid = `failure-${randomUUID()}`;
  await request.get(`http://127.0.0.1:5176/__test/behavior?uid=${uid}&mode=failure`);
  await start(page, { uid });
  await explain(page);
  await expect(page.locator('.included-explanation')).toContainText('Included audit reference');
  await expect(
    page.getByText('App AI is unavailable. You can choose your own API key.').last()
  ).toBeVisible();
  await expect(page.getByText('19/20 App AI attempts left today')).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
  await expect(page.getByText('19/20 App AI attempts left today')).toBeVisible();
  await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
  await expect(page.getByText('18/20 App AI attempts left today')).toBeVisible();
});
test('quota states, themes and source controls fit phone/desktop/landscape', async ({
  page,
  request,
}, testInfo) => {
  const uid = `layout-${randomUUID()}`;
  const seeded = await request.get(`http://127.0.0.1:5176/__test/last-attempt?uid=${uid}`);
  expect(seeded.ok()).toBe(true);
  await start(page, { uid });
  await explain(page);
  await expect(page.getByText('Đáp án phù hợp với điều kiện trong câu hỏi.')).toBeVisible();
  await expect(page.getByText('0/20 App AI attempts left today')).toBeVisible();
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
