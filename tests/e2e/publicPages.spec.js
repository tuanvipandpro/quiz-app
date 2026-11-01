import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { accountCases } from './viewports.js';
import { contrastRatio } from './uiContrast.js';
import { clickAfterUiMotion } from './uiMotion.js';
import { donation } from '../../src/data/donation.js';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
});

// Override only the public configuration boundary; the actual page and QR asset are exercised.
async function donationEnabled(page, enabled = true, invalid = false) {
  await page.route('**/src/data/donation.js', async (route) => {
    const response = await route.fetch();
    let body = (await response.text()).replace(/enabled:\s*(true|false)/, `enabled: ${enabled}`);
    if (invalid) body = body.replace(/bankBin:\s*(['"])[^'"]+\1/, 'bankBin: "invalid"');
    await route.fulfill({ response, body });
  });
}

test(
  'home is the public entry and study links remain direct',
  { tag: '@smoke' },
  async ({ page }) => {
    const questions = [];
    page.on('request', (request) => {
      if (/\/quiz\/.*\.json/.test(request.url())) questions.push(request.url());
    });
    await page.goto('./');
    await expect(page.locator('.landing-hero h1')).toHaveText('Small quizzes.Big confidence.');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.app-nav [aria-current]')).toHaveCount(0);
    expect(questions).toEqual([]);
    await page.getByRole('button', { name: 'Take a look around', exact: true }).click();
    await expect(page.locator('#landing-features')).toBeFocused();
    await expect(page).toHaveURL(/#\/$/);
    await page.getByRole('button', { name: 'Start practicing', exact: true }).click();
    await expect(page).toHaveURL(/#\/library$/);
    await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.locator('.landing-hero h1')).toBeVisible();
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'QuizMos', exact: true }).click();
    await page.getByRole('button', { name: 'Explore AIP-C01', exact: true }).click();
    await expect(page).toHaveURL(/#\/quiz\/aws-aip-c01$/);
    await page.goto('./#/quiz/aws-ace/practice?question=1');
    await expect(page).toHaveURL(/#\/quiz\/gcp-ace\/practice\?question=1$/);
    await expect(page.locator('.question-title')).toBeVisible();
  }
);

test('saved appearance wins and direct library entry keeps the system default', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('quiz-app-theme', 'light'));
  await page.goto('./#/donate');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.back-home').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Start practicing', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('fresh direct library uses light system appearance', async ({ page }) => {
  await page.goto('./#/library');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('public content stays usable during auth loading, sign-in failure and account changes', async ({
  page,
}) => {
  await page.addInitScript(() => sessionStorage.setItem('quiz-e2e-defer-auth', '1'));
  await page.goto('./');
  await expect(page.locator('.landing-hero h1')).toBeVisible();
  await expect(page.locator('.header-actions > .ant-spin')).toBeVisible();
  await page.getByRole('button', { name: 'Start practicing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'QuizMos', exact: true }).click();
  await page.evaluate(() => {
    window.dispatchEvent(new Event('quiz-e2e-auth-ready'));
    sessionStorage.setItem('quiz-e2e-fail-signin', '1');
  });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await clickAfterUiMotion(page.getByRole('button', { name: 'Continue with Google', exact: true }));
  await expect(page.getByRole('alert')).toContainText('Could not sign in. Please retry.');
  await page.keyboard.press('Escape');
  await expect(page.locator('.landing-hero h1')).toBeVisible();
  for (const name of ['Alice', 'Bob']) {
    await page.evaluate(
      (name) =>
        window.dispatchEvent(
          new CustomEvent('quiz-e2e-auth-change', {
            detail: { uid: `test-${name}`, displayName: name, emailVerified: true },
          })
        ),
      name
    );
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    await expect(page.locator('.landing-hero h1')).toBeVisible();
    await expect(page.locator('.cloud-quiz-card, .question-title')).toHaveCount(0);
  }
});

test('public layouts support language, themes, widths and keyboard focus', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await donationEnabled(page);
  await page.goto('./');
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
    for (const route of ['home', 'donate']) {
      await page.evaluate(
        (hash) => {
          window.location.hash = hash;
        },
        route === 'home' ? '#/' : '#/donate'
      );
      await expect(
        page.locator(route === 'home' ? '.landing-hero h1' : '.donate-heading h1')
      ).toBeVisible();
      if (route === 'donate')
        await expect(page.locator('.donate-heading h1')).toHaveText(
          state.language === 'vi' ? 'Giữ mãi tinh thần khám phá.' : 'Keep the curiosity going.'
        );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
        )
      ).toBe(true);
      for (const selector of route === 'home'
        ? ['.hero-description', '.feature-card p', '.preview-note p', '.preview-option.is-selected']
        : ['.donate-status-note', '.donate-phone-tip', '.donate-details dt'])
        if (await page.locator(selector).first().isVisible())
          expect(await contrastRatio(page.locator(selector).first())).toBeGreaterThanOrEqual(4.5);
      const button = page
        .locator(
          route === 'home' ? '.public-actions .ant-btn-primary' : '.donate-copy-row .ant-btn'
        )
        .first();
      await button.focus();
      await expect(button).toBeFocused();
      const bounds = await button.boundingBox();
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      await page.screenshot({
        path: testInfo.outputPath(`${route}-${state.width}-${state.language}-${state.theme}.png`),
        fullPage: true,
      });
    }
  }
});

test('donation copy and downloaded QR match the displayed receiving details', async ({ page }) => {
  await donationEnabled(page);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (value) => {
          window.copiedValue = value;
        },
      },
      configurable: true,
    })
  );
  await page.goto('./#/donate');
  await expect(page).toHaveTitle('Support QuizMos · QuizMos');
  await expect(page.locator('.donate-account')).toHaveText(donation.accountNumber);
  await page.getByRole('button', { name: 'Copy account number', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Copied to clipboard.');
  expect(await page.evaluate(() => window.copiedValue)).toBe(donation.accountNumber);
  await page.getByRole('button', { name: 'Copy transfer note', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.copiedValue)).toBe(donation.transferNote);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download QR', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('QuizMos-VietQR.png');
  expect(await fs.readFile(await download.path())).toEqual(
    await fs.readFile(new URL(`../../public/${donation.qrAsset}`, import.meta.url))
  );
  await expect(page.locator('.donate-status-note')).toContainText(
    'does not automatically track transfers'
  );
  await page.reload();
  await expect(page.locator('.donate-account')).toBeVisible();
});

test('owner-verified production config exposes the actual donation page', async ({ page }) => {
  await page.goto('./#/donate');
  await expect(page.locator('.donate-account')).toHaveText(donation.accountNumber);
  await expect(page.getByRole('button', { name: 'Download QR', exact: true })).toBeVisible();
  await expect
    .poll(() => page.locator('.donate-qr-frame img').evaluate((image) => image.naturalWidth))
    .toBe(540);
});

test('donation clipboard, image and download errors keep manual details usable', async ({
  page,
}) => {
  await donationEnabled(page);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('denied');
        },
      },
      configurable: true,
    })
  );
  await page.goto('./#/donate');
  await page.getByRole('button', { name: 'Copy account number', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Select the text and copy it manually');
  await page.route('**/donate/*.png', (route) => route.abort());
  await page.getByRole('button', { name: 'Download QR', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Could not download the QR' })
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('alert').filter({ hasText: 'QR image could not be loaded' })
  ).toBeVisible();
  await expect(page.locator('.donate-account')).toHaveText(donation.accountNumber);
  await expect(page.getByRole('button', { name: 'Download QR', exact: true })).toHaveCount(0);
});

test('disabled or invalid donation configuration never exposes payment actions', async ({
  page,
}) => {
  await donationEnabled(page, false);
  await page.goto('./#/donate');
  await expect(page.getByText('Donations are not available yet.', { exact: true })).toBeVisible();
  await expect(page.locator('.donate-account')).toHaveCount(0);
  await expect(page.locator('.donate-qr-frame')).toHaveCount(0);
  await page.unroute('**/src/data/donation.js');
  await donationEnabled(page, true, true);
  await page.reload();
  await expect(page.getByText('Donations are not available yet.', { exact: true })).toBeVisible();
  await page
    .locator('.donate-thanks')
    .getByRole('button', { name: 'Back to home', exact: true })
    .click();
  await expect(page.locator('.landing-hero h1')).toBeVisible();
});

test('late clipboard results do not overwrite a newer action or follow the user home', async ({
  page,
}) => {
  await donationEnabled(page);
  await page.addInitScript(() => {
    window.pendingCopies = [];
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: () =>
          new Promise((resolve, reject) => window.pendingCopies.push({ resolve, reject })),
      },
      configurable: true,
    });
  });
  await page.goto('./#/donate');
  await page.getByRole('button', { name: 'Copy account number', exact: true }).click();
  await page.getByRole('button', { name: 'Copy transfer note', exact: true }).click();
  await page.evaluate(() => window.pendingCopies[1].resolve());
  await expect(page.getByRole('status')).toHaveText('Copied to clipboard.');
  await page.evaluate(() => window.pendingCopies[0].reject(new Error('late failure')));
  await expect(page.getByRole('status')).toHaveText('Copied to clipboard.');
  await page.getByRole('button', { name: 'Copy account number', exact: true }).click();
  await page.locator('.back-home').click();
  await expect(page.locator('.landing-hero h1')).toBeVisible();
  await page.evaluate(() => window.pendingCopies[2].resolve());
  await expect(page.locator('.copy-status')).toHaveCount(0);
  await expect(page.getByText('Copied to clipboard.', { exact: true })).toHaveCount(0);
});

test('home navigation honors exam cancel, leave and resume', async ({ page }) => {
  await page.goto('./#/quiz/aws-aip-c01?mode=exam');
  await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  await expect(page.locator('.question-title')).toBeVisible();
  const examUrl = page.url();
  const prompt = page.waitForEvent('dialog');
  const back = page.goBack();
  await (await prompt).dismiss();
  await back;
  await expect(page).toHaveURL(examUrl);
  await expect(page.locator('.question-title')).toBeVisible();
  await page.getByRole('button', { name: 'QuizMos', exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Leave this exam?' });
  await expect(dialog).toBeVisible();
  await clickAfterUiMotion(dialog.getByRole('button', { name: 'Continue exam', exact: true }));
  await expect(page.locator('.question-title')).toBeVisible();
  await page.getByRole('button', { name: 'QuizMos', exact: true }).evaluate((button) => {
    button.click();
    button.click();
    button.click();
  });
  await expect(page.getByRole('dialog').filter({ hasText: 'Leave this exam?' })).toHaveCount(1);
  await clickAfterUiMotion(dialog.getByRole('button', { name: 'Leave exam', exact: true }));
  await expect(page.locator('.landing-hero h1')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.question-title')).toBeVisible();
});

test('viewport sections snap with wheel, keyboard and navigation, and Donate is immediately visible', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./');
  const panels = page.locator('.landing-panel');
  await expect(panels).toHaveCount(4);
  await expect(page.locator('.landing-page')).toHaveAttribute('data-motion', 'normal');
  expect(await page.locator('html').evaluate((el) => getComputedStyle(el).scrollSnapType)).toBe(
    'y mandatory'
  );
  const geometry = await panels.evaluateAll((elements) =>
    elements.map((el) => ({
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
      viewport: window.innerHeight,
      header: document.querySelector('.app-header').getBoundingClientRect().height,
      screenWidth: document.documentElement.clientWidth,
    }))
  );
  for (const item of geometry) {
    expect(item.width).toBe(item.screenWidth);
    expect(item.height).toBeGreaterThanOrEqual(item.viewport - item.header - 1);
  }
  const donate = page
    .getByRole('navigation', { name: 'Main navigation', exact: true })
    .getByRole('button', { name: 'Donate', exact: true });
  await expect(donate).toBeInViewport();
  await expect(page.locator('.hero-donate')).toBeInViewport();
  const aligned = async (index) => {
    await expect
      .poll(() =>
        panels.nth(index).evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const header = document.querySelector('.app-header').getBoundingClientRect().height;
          // Oversized snap areas can rest anywhere that fully covers the snapport.
          const extra = Math.max(0, rect.height - (innerHeight - header));
          return Math.max(rect.top - header, header - rect.top - extra, 0);
        })
      )
      .toBeLessThan(4);
    await expect(page.locator('.landing-page')).toHaveAttribute('data-active', String(index));
  };
  await page.mouse.wheel(0, testInfo.project.use.viewport.height);
  await aligned(1);
  await page.keyboard.press('PageDown');
  await aligned(2);
  const navigation = page.getByRole('navigation', { name: 'Landing sections', exact: true });
  const final =
    testInfo.project.name === 'phone'
      ? page.getByRole('button', { name: 'Next: Get started', exact: true })
      : navigation.getByRole('button', { name: 'Go to Get started', exact: true });
  if (testInfo.project.name === 'phone') await final.tap();
  else await final.click();
  await aligned(3);
  await expect(page.locator('.landing-page')).toHaveAttribute('data-active', '3');
  await expect(page).toHaveURL(/#\/$/);
  expect(await panels.nth(3).evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
    await panels.nth(1).evaluate((el) => getComputedStyle(el).backgroundColor)
  );
  expect(await contrastRatio(page.locator('.final-primary-action'))).toBeGreaterThanOrEqual(4.5);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.landing-page')).toHaveAttribute('data-motion', 'reduce');
  expect(
    await page.locator('.orbit-one').evaluate((el) => getComputedStyle(el).animationName)
  ).toBe('none');
  await donate.click();
  await expect(page.locator('.donate-heading h1')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/landing-scroll/);
  expect(await page.locator('html').evaluate((el) => getComputedStyle(el).scrollSnapType)).toBe(
    'none'
  );
  await page
    .locator('.donate-thanks')
    .getByRole('button', { name: 'Back to home', exact: true })
    .click();
  await expect(page.locator('.landing-hero h1')).toBeInViewport();
  await page.locator('.hero-donate').click();
  await page.locator('.back-home').click();
  await expect(page.locator('.landing-hero h1')).toBeInViewport();
});

test('landing remains readable and navigable without IntersectionObserver', async ({ page }) => {
  await page.addInitScript(() => {
    window.IntersectionObserver = undefined;
  });
  await page.goto('./');
  await expect(page.locator('.landing-hero h1')).toBeVisible();
  expect(
    await page
      .locator('.landing-features .panel-reveal')
      .evaluate((el) => getComputedStyle(el).opacity)
  ).toBe('1');
  await page.getByRole('button', { name: 'Take a look around', exact: true }).click();
  await expect(page.locator('#landing-features')).toBeFocused();
  await expect(page.locator('.landing-page')).toHaveAttribute('data-active', '1');
});
