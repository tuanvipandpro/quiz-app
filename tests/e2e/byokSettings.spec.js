import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { clickAfterUiMotion, waitForUiMotion } from './uiMotion.js';
import { viewportCases } from './viewports.js';
import { contrastRatio } from './uiContrast.js';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
});
async function openSettings(page, { language = 'en', theme = 'light', signedIn = false } = {}) {
  await page.addInitScript(
    ({ language, theme, signedIn }) => {
      localStorage.setItem('quiz-app-language', language);
      localStorage.setItem('quiz-app-theme', theme);
      if (signedIn) {
        localStorage.setItem(
          'quiz-e2e-auth',
          JSON.stringify({ uid: 'byok-tester', displayName: 'BYOK tester' })
        );
        localStorage.setItem('quiz-ai-source:byok-tester', 'byok');
      }
    },
    { language, theme, signedIn }
  );
  await page.goto('./#/quiz/aws-aip-c01/practice');
  await expect(page.locator('.question-title')).toBeVisible();
  if (signedIn) {
    await page.getByRole('button', { name: 'BYOK tester', exact: true }).click();
    await clickAfterUiMotion(
      page.getByRole('menuitem', {
        name: language === 'vi' ? 'Cài đặt AI' : 'AI Settings',
        exact: true,
      })
    );
  } else {
    await page
      .getByRole('button', { name: language === 'vi' ? 'Giải thích' : 'Explain', exact: true })
      .click();
    await page
      .getByRole('button', {
        name: language === 'vi' ? 'Tạo giải thích AI' : 'Generate AI explanation',
        exact: true,
      })
      .click();
  }
  const dialog = page.getByRole('dialog', {
    name: language === 'vi' ? 'Cài đặt AI' : 'AI Settings',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await waitForUiMotion(dialog);
  await expect(dialog.locator('input[type=password]')).toBeEnabled();
  return dialog;
}
async function selectProvider(settings, name) {
  await settings
    .locator('.ai-provider-options .ant-radio-button-wrapper')
    .filter({ hasText: name })
    .click();
}
async function screenshot(page, name) {
  await page.mouse.move(0, 0);
  await waitForUiMotion(page.locator('body'));
  await fs.mkdir('artifacts/byok-settings', { recursive: true });
  await page.screenshot({
    path: `artifacts/byok-settings/${name}-${test.info().project.name}.png`,
  });
}
async function checkGeometry(page, dialog) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  for (const control of await dialog
    .locator(
      'button:visible, a:visible, .ant-radio-button-wrapper:visible, .ant-input-affix-wrapper:visible'
    )
    .all()) {
    await expect.poll(async () => (await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expect.poll(async () => (await control.boundingBox())?.width).toBeGreaterThanOrEqual(44);
    const box = await control.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  }
}

for (const language of ['en', 'vi'])
  for (const theme of ['light', 'dark']) {
    test(`unconfigured App AI keeps guest and signed-in BYOK usable ${language}/${theme}`, async ({
      page,
    }, info) => {
      let workerCalls = 0;
      page.on('request', (request) => {
        if (new URL(request.url()).port === '5176') workerCalls++;
      });
      await page.addInitScript(() => sessionStorage.setItem('quiz-e2e-app-ai-disabled', '1'));
      await page.setViewportSize({
        width: info.project.name === 'phone' ? 320 : 1280,
        height: 900,
      });
      const settings = await openSettings(page, { language, theme });
      const unavailable =
        language === 'vi'
          ? 'AI ứng dụng đang được thiết lập. Bạn có thể dùng API key riêng.'
          : 'App AI is being set up. You can use your own API key.';
      await expect(settings.getByText(unavailable, { exact: true })).toBeVisible();
      const input = settings.locator('input[type=password]');
      await expect(input).toBeEnabled();
      await input.fill('unconfigured-fixture-draft');
      await checkGeometry(page, settings);
      await screenshot(page, `unconfigured-${language}-${theme}`);
      await clickAfterUiMotion(
        settings.getByRole('button', {
          name: language === 'vi' ? 'Đăng nhập' : 'Sign in',
          exact: true,
        })
      );
      const login = page.getByRole('dialog', {
        name: language === 'vi' ? 'Đăng nhập' : 'Sign in',
        exact: true,
      });
      await clickAfterUiMotion(
        login.getByRole('button', {
          name: language === 'vi' ? 'Tiếp tục với Google' : 'Continue with Google',
          exact: true,
        })
      );
      await expect(login).toBeHidden();
      // Changing study owner closes guest dialogs. Reopen account settings through
      // the persistent header to verify the new owner's source and credentials.
      await expect(settings).toBeHidden();
      await page.getByRole('button', { name: 'Test account', exact: true }).click();
      await clickAfterUiMotion(
        page.getByRole('menuitem', {
          name: language === 'vi' ? 'Cài đặt AI' : 'AI Settings',
          exact: true,
        })
      );
      await expect(settings).toBeVisible();
      await expect(
        settings.getByRole('radio', {
          name: language === 'vi' ? 'AI ứng dụng' : 'App AI',
          exact: true,
        })
      ).toBeDisabled();
      await expect(
        settings.getByRole('radio', {
          name: language === 'vi' ? 'API key của bạn' : 'Your API key',
          exact: true,
        })
      ).toBeChecked();
      await expect(settings.getByText(unavailable, { exact: true })).toBeVisible();
      await expect(input).toBeEnabled();
      await expect(input).toHaveValue(''); // Guest credentials never transfer to the account.
      expect(workerCalls).toBe(0);
    });
  }

for (const language of ['en', 'vi'])
  for (const theme of ['light', 'dark']) {
    test(`compact BYOK and help matrix ${language}/${theme}`, async ({ page }, info) => {
      const settings = await openSettings(page, { language, theme });
      const input = settings.locator('input[type=password]');
      await expect(input).toHaveCount(1);
      await expect(settings.locator('ol, .ant-collapse')).toHaveCount(0);
      await expect(
        settings.getByRole('button', {
          name: language === 'vi' ? 'Lưu key' : 'Save key',
          exact: true,
        })
      ).toBeDisabled();
      for (const { width, height } of viewportCases(info.project.name)) {
        await page.setViewportSize({ width, height });
        await checkGeometry(page, settings);
      }
      await page.setViewportSize({
        width: info.project.name === 'phone' ? 320 : 1280,
        height: 900,
      });
      await input.fill('unsaved-fixture-key');
      await screenshot(page, `compact-${language}-${theme}`);
      const contrast = [];
      for (const element of await settings
        .locator(
          'label[for], .ai-settings-row .ant-btn, .ai-key-actions .ant-btn:not(.ant-btn-dangerous), .ai-sign-in-prompt .ant-typography, .ai-provider-options .ant-radio-button-wrapper, .ai-key-label a'
        )
        .all()) {
        const ratio = await contrastRatio(element);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        contrast.push({ text: await element.textContent(), ratio });
      }
      expect(
        await contrastRatio(
          settings.getByRole('button', {
            name: language === 'vi' ? 'Xóa key' : 'Clear key',
            exact: true,
          })
        )
      ).toBeGreaterThanOrEqual(3);
      await fs.writeFile(
        info.outputPath(`byok-contrast-${language}-${theme}.json`),
        JSON.stringify(contrast)
      );
      await selectProvider(settings, 'Groq');
      await input.fill('second-fixture-key');
      await selectProvider(settings, 'Gemini');
      await expect(input).toHaveValue('unsaved-fixture-key');
      const helpButton = settings.getByRole('button', {
        name: language === 'vi' ? 'Hướng dẫn API key' : 'API key help',
        exact: true,
      });
      await helpButton.click();
      const help = page.getByRole('dialog', {
        name:
          language === 'vi'
            ? 'Cách lấy API key Google Gemini'
            : 'How to get a Google Gemini API key',
        exact: true,
      });
      await expect(help).toBeVisible();
      await waitForUiMotion(help);
      await expect(
        help.getByRole('link', {
          name: language === 'vi' ? 'Hướng dẫn chính thức' : 'Official setup guide',
        })
      ).toHaveAttribute('href', 'https://ai.google.dev/gemini-api/docs/api-key');
      await expect(help).toContainText(
        language === 'vi' ? 'hạn mức nhà cung cấp' : 'uses provider quota'
      );
      for (const { width, height } of viewportCases(info.project.name)) {
        await page.setViewportSize({ width, height });
        await checkGeometry(page, help);
      }
      await page.setViewportSize({
        width: info.project.name === 'phone' ? 320 : 1280,
        height: 900,
      });
      await screenshot(page, `help-${language}-${theme}`);
      expect(await contrastRatio(help.locator('li').first())).toBeGreaterThanOrEqual(4.5);
      expect(await contrastRatio(help.getByRole('link'))).toBeGreaterThanOrEqual(4.5);
      await help
        .getByRole('button', { name: language === 'vi' ? 'Xong' : 'Done', exact: true })
        .focus();
      await page.keyboard.press('Escape');
      await expect(help).toBeHidden();
      await expect(helpButton).toBeFocused();
      await expect(input).toHaveValue('unsaved-fixture-key');
      await selectProvider(settings, 'Groq');
      await expect(input).toHaveValue('second-fixture-key');
      const clearButton = settings.getByRole('button', {
        name: language === 'vi' ? 'Xóa key' : 'Clear key',
        exact: true,
      });
      await clearButton.click();
      const clearDialog = page.getByRole('dialog', {
        name: language === 'vi' ? 'Xóa API key này?' : 'Remove this API key?',
        exact: true,
      });
      await expect(clearDialog).toBeVisible();
      await waitForUiMotion(clearDialog);
      for (const { width, height } of viewportCases(info.project.name)) {
        await page.setViewportSize({ width, height });
        await checkGeometry(page, clearDialog);
      }
      await page.setViewportSize({
        width: info.project.name === 'phone' ? 320 : 1280,
        height: 900,
      });
      await screenshot(page, `clear-${language}-${theme}`);
      expect(
        await contrastRatio(
          clearDialog.getByRole('button', {
            name: language === 'vi' ? 'Xóa key' : 'Clear key',
            exact: true,
          })
        )
      ).toBeGreaterThanOrEqual(4.5);
      await clickAfterUiMotion(
        clearDialog.getByRole('button', { name: language === 'vi' ? 'Hủy' : 'Cancel', exact: true })
      );
      await expect(clearDialog).toBeHidden();
      await expect(clearButton).toBeFocused();
      await expect(input).toHaveValue('second-fixture-key');
      const signIn = settings.getByRole('button', {
        name: language === 'vi' ? 'Đăng nhập' : 'Sign in',
        exact: true,
      });
      await signIn.click();
      const login = page.getByRole('dialog', {
        name: language === 'vi' ? 'Đăng nhập' : 'Sign in',
        exact: true,
      });
      await expect(login).toBeVisible();
      await waitForUiMotion(login);
      for (const { width, height } of viewportCases(info.project.name)) {
        await page.setViewportSize({ width, height });
        await checkGeometry(page, login);
      }
      await page.setViewportSize({
        width: info.project.name === 'phone' ? 320 : 1280,
        height: 900,
      });
      await screenshot(page, `login-${language}-${theme}`);
      await clickAfterUiMotion(
        login.getByRole('button', {
          name: language === 'vi' ? 'Tiếp tục không đăng nhập' : 'Continue as guest',
          exact: true,
        })
      );
      await expect(login).toBeHidden();
      await expect(signIn).toBeFocused();
      await expect(input).toHaveValue('second-fixture-key');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(input).toHaveValue('second-fixture-key');
      await helpButton.click();
      const reducedHelp = page.getByRole('dialog', {
        name: language === 'vi' ? 'Cách lấy API key Groq' : 'How to get a Groq API key',
        exact: true,
      });
      await expect(reducedHelp).toBeVisible();
      await clickAfterUiMotion(
        reducedHelp.getByRole('button', { name: language === 'vi' ? 'Xong' : 'Done', exact: true })
      );
      await expect(reducedHelp).toBeHidden();
      await expect(helpButton).toBeFocused();
    });
  }

test('reduced motion at startup and live preference changes preserve the key editor and close dialogs', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const settings = await openSettings(page);
  const input = settings.getByLabel('Google Gemini API key', { exact: true });
  await input.fill('motion-fixture-draft');
  const helpButton = settings.getByRole('button', { name: 'API key help', exact: true });
  const help = page.getByRole('dialog', {
    name: 'How to get a Google Gemini API key',
    exact: true,
  });
  for (const preference of ['no-preference', 'reduce']) {
    await helpButton.click();
    await expect(help).toBeVisible();
    await page.emulateMedia({ reducedMotion: preference });
    await expect(help).toBeVisible();
    await clickAfterUiMotion(help.getByRole('button', { name: 'Done', exact: true }));
    await expect(help).toBeHidden();
    await expect(helpButton).toBeFocused();
    await expect(input).toHaveValue('motion-fixture-draft');
  }
  const signInButton = settings.getByRole('button', { name: 'Sign in', exact: true });
  await signInButton.click();
  const signIn = page.getByRole('dialog', { name: 'Sign in', exact: true });
  await clickAfterUiMotion(signIn.getByRole('button', { name: 'Continue as guest', exact: true }));
  await expect(signIn).toBeHidden();
  await expect(signInButton).toBeFocused();
  await expect(input).toHaveValue('motion-fixture-draft');
  await clickAfterUiMotion(settings.getByRole('button', { name: 'Done', exact: true }));
  await expect(settings).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Generate AI explanation', exact: true })
  ).toBeFocused();
});

test('settings sign-in uses the shared provider dialog; cancel and failure preserve typed key', async ({
  page,
}) => {
  const settings = await openSettings(page);
  const input = settings.getByLabel('Google Gemini API key', { exact: true });
  await input.fill('unsaved-fixture-key');
  const signIn = settings.getByRole('button', { name: 'Sign in', exact: true });
  await signIn.click();
  const login = page.getByRole('dialog', { name: 'Sign in', exact: true });
  await expect(login).toBeVisible();
  await waitForUiMotion(login);
  await expect(login.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await expect(login.locator('.provider-sign-in img')).toHaveCount(2);
  await expect(login.locator('.provider-sign-in')).toHaveCount(3);
  await expect(login.locator('.provider-sign-in:disabled')).toHaveCount(2);
  expect(await page.evaluate(() => sessionStorage.getItem('quiz-e2e-signin-count'))).toBeNull();
  await screenshot(page, 'shared-sign-in');
  await clickAfterUiMotion(login.getByRole('button', { name: 'Continue as guest', exact: true }));
  await expect(login).toBeHidden();
  await expect(signIn).toBeFocused();
  await expect(input).toHaveValue('unsaved-fixture-key');
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-fail-signin', '1'));
  await signIn.click();
  await clickAfterUiMotion(
    login.getByRole('button', { name: 'Continue with Google', exact: true })
  );
  await expect(login.getByRole('alert')).toContainText('Could not sign in. Please retry.');
  await page.evaluate(() => sessionStorage.removeItem('quiz-e2e-fail-signin'));
  await clickAfterUiMotion(
    login.getByRole('button', { name: 'Continue with Google', exact: true })
  );
  await expect(page.getByRole('button', { name: 'Test account', exact: true })).toBeVisible();
  await expect(login).toBeHidden();
  expect(await page.evaluate(() => Number(sessionStorage.getItem('quiz-e2e-signin-count')))).toBe(
    2
  );
  expect(await page.evaluate(() => localStorage.getItem('quiz_llm_guest_keys'))).toBeNull();
});

test('BYOK save failure keeps input, connection test has a busy state, and clear requires confirmation', async ({
  page,
}) => {
  const settings = await openSettings(page, { signedIn: true });
  const input = settings.getByLabel('Google Gemini API key', { exact: true });
  const save = settings.getByRole('button', { name: 'Save key', exact: true });
  await input.fill('fixture-key');
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-fail-key-save', '1'));
  await save.click();
  await expect(settings.getByRole('alert')).toContainText(
    'Could not save the AI key to your profile. Please retry.'
  );
  await expect(input).toHaveValue('fixture-key');
  await screenshot(page, 'save-error');
  await page.evaluate(() => sessionStorage.removeItem('quiz-e2e-fail-key-save'));
  await save.click();
  await expect(settings.getByText('API key saved to your profile.')).toBeVisible();
  let release, received;
  const started = new Promise((resolve) => {
    received = resolve;
  });
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
    received();
    await hold;
    await route.fulfill({ json: { candidates: [{ content: { parts: [{ text: 'OK' }] } }] } });
  });
  await settings.getByRole('button', { name: 'Test connection', exact: true }).click();
  await started;
  await expect(input).toBeDisabled();
  await expect(save).toBeDisabled();
  await expect(settings.getByRole('radio', { name: 'Groq', exact: true })).toBeDisabled();
  await screenshot(page, 'testing');
  release();
  await expect(settings.getByText(/Connected:/)).toBeVisible();
  await settings.getByRole('button', { name: 'Clear key', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Remove this API key?', exact: true });
  await clickAfterUiMotion(confirm.getByRole('button', { name: 'Cancel', exact: true }));
  await expect(confirm).toBeHidden();
  await expect(input).toHaveValue('fixture-key');
  await settings.getByRole('button', { name: 'Clear key', exact: true }).click();
  await clickAfterUiMotion(confirm.getByRole('button', { name: 'Clear key', exact: true }));
  await expect(settings.getByText('API key removed.')).toBeVisible();
  await expect(input).toHaveValue('');
});
