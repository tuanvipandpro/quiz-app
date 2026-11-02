import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { clickAfterUiMotion, waitForUiMotion } from './uiMotion.js';
import { contrastRatio } from './uiContrast.js';
import { accountCases, viewportCases } from './viewports.js';

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
  await clickAfterUiMotion(page.getByRole('button', { name: 'Continue with Google', exact: true }));
  await expect(page.getByRole('button', { name: 'Test account', exact: true })).toBeVisible();
}

async function requestSignOut(page) {
  await expect(page.locator('.ant-modal-mask:visible')).toHaveCount(0);
  await page.getByRole('button', { name: 'Test account', exact: true }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('separator')).toBeVisible();
  await clickAfterUiMotion(menu.getByRole('menuitem', { name: 'Sign out', exact: true }));
  const dialog = page.getByRole('dialog').filter({ hasText: 'Sign out?' });
  await expect(dialog).toBeVisible();
  await waitForUiMotion(dialog);
  return dialog;
}

for (const reducedMotion of ['no-preference', 'reduce']) {
  test(`account menu supports keyboard and touch activation without hover (${reducedMotion})`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    await page.emulateMedia({ reducedMotion });
    const evidence = [];
    const accountName = 'Certification learner with a deliberately long account display name '
      .repeat(3)
      .trim();
    await page.addInitScript((displayName) => {
      localStorage.setItem(
        'quiz-e2e-auth',
        JSON.stringify({
          uid: 'test-alice',
          displayName,
          email: 'alice@example.test',
          emailVerified: true,
        })
      );
    }, accountName);
    await page.goto('./');
    const profile = page.getByRole('button', { name: accountName, exact: true });
    await expect(profile).toBeVisible();

    for (const { width, height, language, theme } of accountCases(testInfo.project.name)) {
      await page.setViewportSize({ width, height });
      await page
        .getByRole('button', { name: language === 'en' ? 'English' : 'Tiếng Việt', exact: true })
        .click();
      if ((await page.locator('html').getAttribute('data-theme')) !== theme)
        await page.locator('.theme-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.mouse.move(1, height - 1);
      await profile.focus();
      await page.keyboard.press('Enter');
      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      await waitForUiMotion(menu);
      await expect(profile).toHaveAttribute('aria-haspopup', 'menu');
      await expect(profile).toHaveAttribute('aria-expanded', 'true');
      await expect(profile).toHaveAttribute('aria-controls', await menu.getAttribute('id'));
      const bounds = await menu.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
      const triggerBounds = await profile.boundingBox();
      expect(triggerBounds.width).toBeGreaterThanOrEqual(44);
      expect(triggerBounds.height).toBeGreaterThanOrEqual(44);
      expect(await contrastRatio(profile.locator('.ant-avatar'))).toBeGreaterThanOrEqual(3);
      const contrast = [];
      for (const item of await menu.getByRole('menuitem').all())
        contrast.push(await contrastRatio(item));
      for (const ratio of contrast) expect(ratio).toBeGreaterThanOrEqual(4.5);
      const signOut = menu.getByRole('menuitem', {
        name: language === 'en' ? 'Sign out' : 'Đăng xuất',
        exact: true,
      });
      const target = await signOut.boundingBox();
      expect(target.height).toBeGreaterThanOrEqual(44);
      await signOut.hover();
      expect(await contrastRatio(signOut)).toBeGreaterThanOrEqual(4.5);
      await signOut.focus();
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(profile).toBeFocused();
      await expect(profile).toHaveAttribute('aria-expanded', 'false');

      await page.keyboard.press('Enter');
      await expect(menu).toBeVisible();
      await waitForUiMotion(menu);
      await menu
        .getByRole('menuitem', {
          name: language === 'en' ? 'AI Settings' : 'Cài đặt AI',
          exact: true,
        })
        .focus();
      await page.keyboard.press('Enter');
      const settings = page.getByRole('dialog', {
        name: language === 'en' ? 'AI Settings' : 'Cài đặt AI',
        exact: true,
      });
      await expect(settings).toBeVisible();
      await expect(menu).toBeHidden();
      await waitForUiMotion(settings);
      await page.keyboard.press('Escape');
      await expect(settings).toBeHidden();
      await expect(profile).toBeFocused();

      if (testInfo.project.use.hasTouch) {
        await profile.tap();
        await expect(menu).toBeVisible();
        await waitForUiMotion(menu);
        await page.getByRole('button', { name: 'QuizMos', exact: true }).tap();
        await expect(menu).toBeHidden();
      }

      if (testInfo.project.use.hasTouch) await profile.tap();
      else {
        await profile.focus();
        await page.keyboard.press('Enter');
      }
      await expect(menu).toBeVisible();
      await waitForUiMotion(menu);
      if (testInfo.project.use.hasTouch) await signOut.tap();
      else {
        await signOut.focus();
        await page.keyboard.press('Enter');
      }
      const confirmation = page.getByRole('dialog').filter({
        hasText: language === 'en' ? 'Sign out?' : 'Đăng xuất?',
      });
      await expect(confirmation).toBeVisible();
      await expect(menu).toBeHidden();
      await waitForUiMotion(confirmation);
      const confirm = confirmation.getByRole('button', {
        name: language === 'en' ? 'Sign out' : 'Đăng xuất',
        exact: true,
      });
      const confirmContrast = await contrastRatio(confirm);
      expect(confirmContrast).toBeGreaterThanOrEqual(4.5);
      const confirmBounds = await confirm.boundingBox();
      expect(confirmBounds.height).toBeGreaterThanOrEqual(44);
      expect(confirmBounds.width).toBeGreaterThanOrEqual(44);
      const cancel = confirmation.getByRole('button', {
        name: language === 'en' ? 'Cancel' : 'Hủy',
        exact: true,
      });
      await expect(cancel).toBeFocused();
      if (testInfo.project.use.hasTouch) await cancel.tap();
      else await page.keyboard.press('Enter');
      await expect(confirmation).toBeHidden();
      await expect(profile).toBeFocused();
      expect(
        await page.evaluate(() => sessionStorage.getItem('quiz-e2e-signout-count'))
      ).toBeNull();
      evidence.push({
        width,
        height,
        language,
        theme,
        reducedMotion,
        touch: !!testInfo.project.use.hasTouch,
        triggerBounds,
        menuBounds: bounds,
        menuContrast: contrast,
        confirmContrast,
        confirmBounds,
      });
    }
    await testInfo.attach('account-menu-matrix', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    });
  });
}

test('fixture sign-in preserves the guest state on failure and allows a single retry', async ({
  page,
}) => {
  await page.goto('./#/library');
  await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
  const guestUrl = page.url();
  await page.evaluate(() => {
    sessionStorage.setItem('quiz-e2e-defer-signin', '1');
    sessionStorage.setItem('quiz-e2e-fail-signin', '1');
  });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Sign in', exact: true });
  const google = dialog.getByRole('button', { name: /Continue with Google/ });
  await clickAfterUiMotion(google);
  await expect(google).toBeDisabled();
  await google.dispatchEvent('click');
  expect(await page.evaluate(() => sessionStorage.getItem('quiz-e2e-signin-count'))).toBe('1');
  await page.evaluate(() => window.dispatchEvent(new Event('quiz-e2e-complete-signin')));
  await expect(dialog.getByRole('alert')).toContainText('Could not sign in. Please retry.');
  await expect(google).toBeEnabled();
  await expect(page).toHaveURL(guestUrl);
  await expect(page.getByRole('button', { name: 'Test account', exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    sessionStorage.removeItem('quiz-e2e-defer-signin');
    sessionStorage.removeItem('quiz-e2e-fail-signin');
  });
  await clickAfterUiMotion(google);
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Test account', exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('quiz-e2e-signin-count'))).toBe('2');
});

test('account menu names remain meaningful when profile metadata is missing', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'quiz-e2e-auth',
      JSON.stringify({ uid: 'test-no-name', emailVerified: true })
    );
  });
  await page.goto('./');
  const profile = page.getByRole('button', { name: 'Account', exact: true });
  await expect(profile).toBeVisible();
  await profile.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu', { name: 'Account', exact: true });
  await expect(menu).toBeVisible();
  await waitForUiMotion(menu);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  const fallback = page.getByRole('button', { name: 'Tài khoản', exact: true });
  await expect(fallback).toBeVisible();
  await fallback.focus();
  await page.keyboard.press('Enter');
  const translatedMenu = page.getByRole('menu', { name: 'Tài khoản', exact: true });
  await expect(translatedMenu).toBeVisible();
  await waitForUiMotion(translatedMenu);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('quiz-e2e-auth-change', {
        detail: {
          uid: 'test-bob',
          displayName: 'Bob',
          email: 'bob@example.test',
          emailVerified: true,
        },
      })
    )
  );
  const nextProfile = page.getByRole('button', { name: 'Bob', exact: true });
  await expect(nextProfile).toBeVisible();
  await expect(nextProfile).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('menu')).toBeHidden();
  await nextProfile.focus();
  await page.keyboard.press('Enter');
  const nextMenu = page.getByRole('menu');
  await expect(nextMenu).toBeVisible();
  await expect(nextMenu.getByRole('menuitem', { name: 'Bob', exact: true })).toBeVisible();
  await expect(nextMenu.getByRole('menuitem', { name: 'Tài khoản', exact: true })).toHaveCount(0);
});

test(
  'QuizMos branding loads under the configured base and keeps navigation accessible',
  { tag: '@smoke' },
  async ({ page }, testInfo) => {
    await page.goto('./');
    await expect(page).toHaveTitle('Small quizzes. Big confidence. · QuizMos');
    const brand = page.getByRole('button', { name: 'QuizMos', exact: true });
    const logo = brand.locator('img');
    await expect(logo).toHaveAttribute('alt', '');
    await expect.poll(() => logo.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon).toHaveAttribute('href', '/quiz-app/quizmos.svg');
    const iconResponse = await page.request.get(await favicon.getAttribute('href'));
    expect(iconResponse.ok()).toBe(true);
    expect(iconResponse.headers()['content-type']).toContain('image/svg+xml');
    await expect(page.locator('.app-footer')).toContainText('QuizMos ·');

    for (const { width, height } of viewportCases(testInfo.project.name)) {
      await page.setViewportSize({ width, height });
      await expect(brand).toHaveAccessibleName('QuizMos');
      const bounds = await brand.boundingBox();
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
    await page.setViewportSize(testInfo.project.use.viewport);

    const signIn = page.getByRole('button', { name: 'Sign in', exact: true });
    await signIn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('.sign-in-brand strong')).toHaveText('QuizMos');
    await expect
      .poll(() => dialog.locator('.sign-in-brand-mark').evaluate((image) => image.naturalWidth))
      .toBeGreaterThan(0);
    await waitForUiMotion(dialog);
    await dialog.getByRole('button', { name: 'Continue with Google', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(signIn).toBeFocused();

    await page.getByRole('button', { name: 'My quizzes', exact: true }).click();
    await expect(page).toHaveTitle('My quizzes · QuizMos');
    await brand.click();
    await expect(page).toHaveTitle('Small quizzes. Big confidence. · QuizMos');
    await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
    await expect(page).toHaveTitle('Quiz nhỏ. Tự tin lớn. · QuizMos');
    await page.goto('./#/quiz/aws-aip-c01/practice');
    await expect(page.locator('.question-title')).toBeVisible();
    await expect(page).toHaveTitle(/ · QuizMos$/);
  }
);

test(
  'bank, provider identities, language and theme work without overflow',
  { tag: '@smoke' },
  async ({ page }, testInfo) => {
    await page.goto('./#/library');
    await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
    await expect(page.getByText('20 quiz sets', { exact: true })).toBeVisible();
    await expect(page.locator('.header-settings')).toHaveCount(0);
    await expect(page.locator('.provider-jumps button')).toHaveCount(5);
    await expect
      .poll(() =>
        page.locator('.provider-identity').evaluateAll(
          (identities) =>
            identities.length > 0 &&
            identities.every((identity) => {
              const icon = identity.querySelector('img');
              return icon?.complete && icon.naturalWidth > 0;
            })
        )
      )
      .toBe(true);
    await page.getByRole('textbox', { name: 'Find a certification' }).fill('CLF-C02');
    await expect(page.getByText('No matching quizzes', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: /Find a certification/ }).fill('CCA-F');
    await expect(page.locator('.exam-code')).toHaveText('CCAR-F');
    await page.getByRole('textbox', { name: /Find a certification/ }).fill('');
    await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    for (const { width, height } of viewportCases(testInfo.project.name)) {
      await page.setViewportSize({ width, height });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
        )
      ).toBe(true);
      const brand = await page.locator('.app-brand').boundingBox();
      const nav = await page.locator('.app-nav').boundingBox();
      if (width <= 700) expect(Math.abs(brand.x - nav.x)).toBeLessThan(2);
    }
  }
);

test(
  'legacy links and cloud checkpoints resolve to Google ACE',
  { tag: '@smoke' },
  async ({ page }) => {
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
  }
);

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
  await clickAfterUiMotion(leaveDialog.getByRole('button', { name: 'Continue exam', exact: true }));
  await expect(leaveDialog).toBeHidden();
  const dialog = await requestSignOut(page);
  await expect(dialog).toContainText('end this exam');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
  await clickAfterUiMotion(
    page.getByRole('button', { name: 'Submit and view results', exact: true })
  );
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
  await expect(page.locator('.question-options input').first()).toBeDisabled();
});
