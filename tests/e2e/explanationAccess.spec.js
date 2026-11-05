import { test, expect } from '@playwright/test';
import { accountCases } from './viewports.js';
import { clickAfterUiMotion } from './uiMotion.js';
import { contrastRatio } from './uiContrast.js';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
  await page.addInitScript(() => {
    window.explanationIO = { keys: 0, profile: 0 };
  });
  await page.route('**/src/services/llm/credentials.js*', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const signature = /async getKeys\s*\(\s*uid\s*=\s*null\s*\)\s*\{/;
    expect(body).toMatch(signature);
    await route.fulfill({
      response,
      body: body.replace(signature, '$&\n globalThis.explanationIO.keys++;'),
    });
  });
  await page.route('**/tests/fixtures/userService.js*', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const signature = /async getUserProfile\s*\(\s*uid\s*\)\s*\{/;
    expect(body).toMatch(signature);
    await route.fulfill({
      response,
      body: body.replace(signature, '$&\n globalThis.explanationIO.profile++;'),
    });
  });
});

for (const signedIn of [false, true]) {
  test(`included reading does not resolve keys, profile or AI (${signedIn ? 'signed-in' : 'guest'})`, async ({
    page,
  }) => {
    if (signedIn)
      await page.addInitScript(() =>
        localStorage.setItem(
          'quiz-e2e-auth',
          JSON.stringify({
            uid: 'reference-reader',
            displayName: 'Reference reader',
            emailVerified: true,
          })
        )
      );
    const requests = [];
    page.on('request', (request) => {
      if (request.url().includes(':5176/')) requests.push(request.url());
    });
    await page.goto('./#/quiz/anthropic-ccar-p/practice');
    await expect(page.locator('.question-title')).toBeVisible();
    if (signedIn)
      await expect(
        page.getByRole('button', { name: 'Reference reader', exact: true })
      ).toBeVisible();
    const before = await page.evaluate(() => ({ ...window.explanationIO }));
    const beforeRequests = requests.length;
    const explain = page.getByRole('button', { name: 'Explain', exact: true });
    await explain.click();
    await expect(page.locator('.explanation-panel')).toBeFocused();
    await expect(
      page.getByText('Provided with this quiz. Compare it with the question and marked answer.', {
        exact: true,
      })
    ).toBeVisible();
    await expect(page.locator('.included-explanation .markdown-container')).not.toBeEmpty();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => window.explanationIO)).toEqual(before);
    expect(requests.length).toBe(beforeRequests);
    await expect(
      page.getByRole('button', { name: 'Generate AI explanation', exact: true })
    ).toBeVisible();
    await page
      .locator('.explanation-panel')
      .getByRole('button', { name: 'Close', exact: true })
      .click();
    await expect(explain).toBeFocused();
  });
}

test('missing reference stays readable and AI setup requires an explicit request', async ({
  page,
}) => {
  await page.goto('./#/quiz/gcp-ace/practice');
  await page.getByRole('button', { name: 'Explain', exact: true }).click();
  await expect(
    page.getByText('No explanation is included with this question.', { exact: true })
  ).toBeVisible();
  expect(await page.evaluate(() => window.explanationIO)).toEqual({ keys: 0, profile: 0 });
  const generate = page.getByRole('button', { name: 'Generate AI explanation', exact: true });
  await generate.click();
  const settings = page.getByRole('dialog', { name: 'AI Settings', exact: true });
  await expect(settings).toBeVisible();
  await clickAfterUiMotion(settings.getByRole('button', { name: 'Done', exact: true }));
  await expect(generate).toBeFocused();
  await expect(page.locator('.explanation-panel')).toBeVisible();
});

test('long supplied Markdown keeps its language, sanitization and readable geometry', async ({
  page,
}) => {
  const reference = `# Original English reference\n\n${'A supplied explanation with **technical terms**. '.repeat(100)}\n\n${'ReferenceToken'.repeat(80)}\n\n<script>window.referenceUnsafe = true</script><img src="invalid" onerror="window.referenceUnsafe = true"><a href="javascript:alert(1)">Unsafe link</a>`;
  await page.goto('./#/my-quizzes');
  await page.locator('input[type=file]').setInputFiles({
    name: 'reference.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify([
        {
          id: 'reference',
          question: 'Reference fixture?',
          options: { A: 'Answer', B: 'Other' },
          answer: ['A'],
          explanation: reference,
        },
      ])
    ),
  });
  await page.getByRole('button', { name: 'Use this quiz', exact: true }).click();
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.getByRole('button', { name: 'Explain', exact: true }).click();
  const content = page.locator('.included-explanation .markdown-container');
  await expect(content.getByRole('heading', { name: 'Original English reference' })).toBeVisible();
  await expect(content.locator('script, [onerror], a[href^="javascript:"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.referenceUnsafe)).toBeUndefined();
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await expect(content).toContainText('A supplied explanation');
  expect(await content.getAttribute('lang')).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => window.explanationIO)).toEqual({ keys: 0, profile: 0 });
});

test('question navigation aborts generation and an old response cannot replace the next reference', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'quiz-e2e-auth',
      JSON.stringify({
        uid: 'reference-cancel',
        displayName: 'Reference reader',
        emailVerified: true,
      })
    )
  );
  let release;
  let received;
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  const ready = new Promise((resolve) => {
    received = resolve;
  });
  let delivered;
  const finished = new Promise((resolve) => {
    delivered = resolve;
  });
  await page.route('**/quiz/Anthropic/CCAR_P.json', async (route) => {
    const response = await route.fetch();
    const questions = await response.json();
    questions[0].explanation = 'First question reference';
    questions[1].explanation = 'Second question reference';
    await route.fulfill({ response, json: questions });
  });
  await page.route('**/v1/explanations', async (route) => {
    const response = await route.fetch();
    received();
    await hold;
    try {
      await route.fulfill({ response });
    } catch {
      /* Navigation cancelled the request. */
    } finally {
      delivered();
    }
  });
  await page.goto('./#/quiz/anthropic-ccar-p/practice');
  await page.getByRole('button', { name: 'Explain', exact: true }).click();
  const firstReference = await page
    .locator('.included-explanation .markdown-container')
    .textContent();
  await page.getByRole('button', { name: 'Generate AI explanation', exact: true }).click();
  await ready;
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await expect(page.locator('.explanation-panel')).toHaveCount(0);
  release();
  await finished;
  await page.getByRole('button', { name: 'Explain', exact: true }).click();
  await expect(page.locator('.included-explanation .markdown-container')).not.toHaveText(
    firstReference
  );
  await expect(page.locator('.ai-generated-explanation')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Generate AI explanation', exact: true })
  ).toBeVisible();
  await expect(page.getByText('Đáp án phù hợp với điều kiện trong câu hỏi.')).toHaveCount(0);
});

test('included reference and the explicit action fit the study viewport matrix', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await page.goto('./#/quiz/anthropic-ccar-p/practice');
  await page.getByRole('button', { name: 'Explain', exact: true }).click();
  for (const state of accountCases(testInfo.project.name)) {
    await page.setViewportSize({ width: state.width, height: state.height });
    await page
      .getByRole('button', {
        name: state.language === 'vi' ? 'Tiếng Việt' : 'English',
        exact: true,
      })
      .click();
    if ((await page.locator('html').getAttribute('data-theme')) !== state.theme)
      await page.locator('.theme-toggle').click();
    await page
      .getByRole('button', {
        name: state.language === 'vi' ? 'Giải thích' : 'Explain',
        exact: true,
      })
      .click();
    await expect(page.locator('.explanation-panel')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    const generate = page.getByRole('button', {
      name: state.language === 'vi' ? 'Tạo giải thích AI' : 'Generate AI explanation',
      exact: true,
    });
    const box = await generate.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(await contrastRatio(generate)).toBeGreaterThanOrEqual(4.5);
    expect(
      await contrastRatio(page.locator('.included-explanation .ant-typography'))
    ).toBeGreaterThanOrEqual(4.5);
    await generate.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`reference-${state.width}-${state.language}-${state.theme}.png`),
    });
  }
  expect(await page.evaluate(() => window.explanationIO)).toEqual({ keys: 0, profile: 0 });
});
