import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { accountCases } from './viewports.js';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
});
const cases = [
  ['anthropic-cca-f', 'CCA_F', '182'],
  ['anthropic-ccar-p', 'CCAR_P', 'ccar-p-24-import-1'],
  ['anthropic-ccar-p', 'CCAR_P', 'ccar-p-65'],
  ['anthropic-ccao-f', 'CCAO_F', 'ccao-f-142'],
  ['anthropic-ccdv-f', 'CCDV_F', 'ccdv-f-56'],
];
for (const [id, file, questionId] of cases)
  test(`reviewed guide opens the intended stable question: ${id}/${questionId}`, async ({
    page,
  }, info) => {
    const questions = JSON.parse(fs.readFileSync(`public/quiz/Anthropic/${file}.json`));
    const meta = JSON.parse(fs.readFileSync(`public/summaries/${id}/meta.json`));
    const topic = meta.topics.find((topic) => topic.questionIds.includes(questionId));
    const index = questions.findIndex((question) => String(question.id) === questionId);
    await page.setViewportSize({ width: info.project.name === 'phone' ? 320 : 1280, height: 900 });
    await page.goto(`./#/quiz/${id}/summary`);
    await expect(page.locator('.quick-summary-topic')).toHaveCount(8);
    await expect(page.locator('.quick-summary-stale')).toHaveCount(0);
    await expect(page.locator('.quick-summary-header')).toContainText('v2 · 2026-11-06');
    const section = page.locator('#summary-' + topic.id);
    await section.locator('.quick-summary-practice summary').focus();
    await page.keyboard.press('Enter');
    const link = section.getByRole('button', { name: `Question ${index + 1}`, exact: true });
    await link.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({ path: info.outputPath(`review-${id}-${questionId}.png`) });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`question=${encodeURIComponent(questionId)}`));
    // The title omits the dropdown's generic trailing "Select" instruction.
    // Check the distinctive stored stem and exact stable-ID route together.
    await expect(page.locator('.question-title')).toContainText(
      questions[index].question.split('\n')[0]
    );
    if (questions[index].type === 'dropdown')
      await expect(page.locator('.structured-question').getByRole('combobox')).toHaveCount(
        questions[index].slots.length
      );
    await page.getByRole('button', { name: 'Back to summary', exact: true }).click();
    await expect(page.locator('#summary-' + topic.id)).toBeVisible();
  });

test('reviewed long content and source links remain readable across the guide matrix', async ({
  page,
}, info) => {
  await page.goto('./#/quiz/anthropic-ccar-p/summary');
  await expect(page.locator('.quick-summary-topic')).toHaveCount(8);
  for (const state of accountCases(info.project.name)) {
    await page.setViewportSize({ width: state.width, height: state.height });
    await page
      .getByRole('button', {
        name: state.language === 'vi' ? 'Tiếng Việt' : 'English',
        exact: true,
      })
      .click();
    if ((await page.locator('html').getAttribute('data-theme')) !== state.theme)
      await page.locator('.theme-toggle').click();
    await page.locator('#summary-governance').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({
      path: info.outputPath(`guide-${state.width}-${state.language}-${state.theme}.png`),
    });
    const sources = page.locator('.quick-summary-sources');
    if (!(await sources.evaluate((el) => el.open))) await sources.locator('summary').click();
    await expect(
      sources.getByRole('link', {
        name: 'Anthropic Privacy · BAA service and feature coverage',
        exact: true,
      })
    ).toHaveAttribute(
      'href',
      'https://privacy.claude.com/en/articles/8114513-business-associate-agreements-baa-for-commercial-customers'
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  }
});

test('a later source mismatch still warns without hiding the reviewed guide', async ({ page }) => {
  await page.route('**/summaries/anthropic-ccar-p/meta.json', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.sourceQuizHash = 'a'.repeat(64);
    await route.fulfill({ response, json });
  });
  await page.goto('./#/quiz/anthropic-ccar-p/summary');
  await expect(page.locator('.quick-summary-topic')).toHaveCount(8);
  await expect(page.locator('.quick-summary-stale')).toBeVisible();
});
