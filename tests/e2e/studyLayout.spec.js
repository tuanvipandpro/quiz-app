import { test, expect } from '@playwright/test';
import { accountCases } from './viewports.js';
import { contrastRatio } from './uiContrast.js';
import { clickAfterUiMotion } from './uiMotion.js';

const pageErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
  await page.addInitScript(() =>
    localStorage.setItem(
      'quiz-e2e-auth',
      JSON.stringify({ uid: 'study-layout', displayName: 'Study tester', emailVerified: true })
    )
  );
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('late dock measurements are inert after leaving and replacing study controls', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const NativeResizeObserver = window.ResizeObserver;
    window.studyDockDeliveries = [];
    window.ResizeObserver = class {
      constructor(callback) {
        this.callback = callback;
        this.native = new NativeResizeObserver((entries) => callback(entries, this));
      }
      observe(element, options) {
        this.native.observe(element, options);
        if (element.classList.contains('study-navigation-bar')) {
          window.studyDockDeliveries.push({ element, deliver: () => this.callback([], this) });
        }
      }
      unobserve(element) {
        this.native.unobserve(element);
      }
      disconnect() {
        this.native.disconnect();
      }
    };
  });
  const height = () =>
    page.evaluate(() => document.documentElement.style.getPropertyValue('--study-dock-height'));
  const deliverOldMeasurement = () =>
    page.evaluate(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            try {
              window.studyDockDeliveries[0].deliver();
            } finally {
              requestAnimationFrame(resolve);
            }
          }, 0);
        })
    );
  await page.goto('./#/quiz/anthropic-ccar-p/practice');
  await expect(page.locator('.question-title')).toBeVisible();
  await expect.poll(height).not.toBe('');
  await page.goto('./#/quiz/anthropic-ccar-p/summary');
  await expect(page.locator('.quick-summary-body')).toBeVisible();
  await expect.poll(height).toBe('');
  expect(await page.evaluate(() => window.studyDockDeliveries[0].element.isConnected)).toBe(false);
  await deliverOldMeasurement();
  expect(await height()).toBe('');
  expect(pageErrors.get(page)).toEqual([]);

  await page.goto('./#/quiz/anthropic-ccar-p');
  await page.getByText('Mock exam', { exact: true }).click();
  await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect.poll(height).not.toBe('');
  const currentHeight = await height();
  await deliverOldMeasurement();
  expect(await height()).toBe(currentHeight);
  expect(pageErrors.get(page)).toEqual([]);
});

test('native dock measurements stay correct through resize and study-to-summary navigation', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await page.goto('./#/quiz/anthropic-ccar-p/practice');
  for (const state of accountCases(testInfo.project.name)) {
    await appearance(page, state);
    const dock = page.locator('.study-navigation-bar');
    await expect(dock).toBeVisible();
    await expect
      .poll(async () => {
        const bounds = await dock.boundingBox();
        const reserved = await page.evaluate(() =>
          parseFloat(document.documentElement.style.getPropertyValue('--study-dock-height'))
        );
        return bounds ? Math.abs(reserved - bounds.height) : Infinity;
      })
      .toBeLessThan(1);
    await page.goto('./#/quiz/anthropic-ccar-p/summary');
    await expect(page.locator('.quick-summary-body')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.style.getPropertyValue('--study-dock-height'))
      )
      .toBe('');
    await page.goto('./#/quiz/anthropic-ccar-p/practice');
    await expect(page.locator('.question-title')).toBeVisible();
  }
});

async function appearance(page, state) {
  await page.setViewportSize({ width: state.width, height: state.height });
  await page
    .getByRole('button', { name: state.language === 'vi' ? 'Tiếng Việt' : 'English', exact: true })
    .click();
  if ((await page.locator('html').getAttribute('data-theme')) !== state.theme)
    await page.locator('.theme-toggle').click();
}

async function dockGeometry(page, width, height) {
  const dock = page.locator('.study-navigation-bar');
  const bounds = await dock.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  if (width <= 900) {
    await expect(dock).toHaveCSS('position', 'fixed');
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
  }
  const buttons = await dock.locator('button').all();
  let previous;
  for (const button of buttons) {
    const box = await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(bounds.x);
    expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    if (previous) {
      expect(box.x - previous.x - previous.width).toBeGreaterThanOrEqual(7);
      expect(Math.abs(box.y - previous.y)).toBeLessThan(1);
    }
    if (await button.isEnabled()) expect(await contrastRatio(button)).toBeGreaterThanOrEqual(4.5);
    previous = box;
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('practice dock prioritizes navigation and explanation with Copy and Save above the question', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await page.goto('./#/quiz/anthropic-ccar-p/practice');
  await expect(page.locator('.question-title')).toBeVisible();
  const cases = accountCases(testInfo.project.name);
  if (testInfo.project.name === 'phone')
    cases.push({ width: 360, height: 800, language: 'en', theme: 'dark' });
  for (const state of cases) {
    await appearance(page, state);
    await page.evaluate(() => window.scrollTo(0, 0));
    const save = await page.locator('.study-question-tools').boundingBox();
    const question = await page.locator('.quiz-question-card').boundingBox();
    expect(save.y + save.height).toBeLessThanOrEqual(question.y);
    const tools = page.locator('.study-question-tools button');
    await expect(tools).toHaveCount(2);
    const copyBounds = await tools.first().boundingBox();
    const saveBounds = await tools.last().boundingBox();
    expect(copyBounds.height).toBeGreaterThanOrEqual(44);
    expect(saveBounds.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(copyBounds.y - saveBounds.y)).toBeLessThan(1);
    expect(saveBounds.x - copyBounds.x - copyBounds.width).toBeGreaterThanOrEqual(8);
    await page.locator('.study-question-tools').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(
        `question-tools-${state.width}-${state.language}-${state.theme}.png`
      ),
    });
    await expect(page.locator('.study-navigation-actions button')).toHaveCount(3);
    await page.locator('.draft-status').scrollIntoViewIfNeeded();
    await dockGeometry(page, state.width, state.height);
    await page.screenshot({
      path: testInfo.outputPath(`practice-${state.width}-${state.language}-${state.theme}.png`),
    });
    const next = page.getByRole('button', {
      name: state.language === 'vi' ? 'Câu tiếp' : 'Next question',
      exact: true,
    });
    // Accessible names retain their full meaning even when the visible labels are compact.
    await next.click();
    await expect(page.locator('.study-position')).toContainText(
      state.language === 'vi' ? 'Câu 2' : 'Question 2'
    );
    await page.locator('.study-navigation-actions button').first().click();
    await expect(page.locator('.study-position')).toContainText(
      state.language === 'vi' ? 'Câu 1' : 'Question 1'
    );
  }
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Save position', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Save position?', exact: true });
  await clickAfterUiMotion(dialog.getByRole('button', { name: 'Cancel', exact: true }));
  await expect(page.getByRole('button', { name: 'Save position', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Save position', exact: true }).click();
  await clickAfterUiMotion(dialog.getByRole('button', { name: 'Save', exact: true }));
  await expect(page.getByRole('button', { name: 'Position saved', exact: true })).toBeDisabled();
});

test('exam timer shares a non-overlapping sidebar or dock through scroll, resize and submission', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await page.goto('./#/quiz/anthropic-ccar-p');
  await page.getByText('Mock exam', { exact: true }).click();
  await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  await expect(page.locator('.question-title')).toBeVisible();
  for (const state of accountCases(testInfo.project.name)) {
    await appearance(page, state);
    await page.locator('.draft-status').scrollIntoViewIfNeeded();
    await expect(page.getByRole('timer')).toHaveCount(1);
    const timer = await page.getByRole('timer').boundingBox();
    if (state.width <= 900) {
      const dock = await page.locator('.study-navigation-bar').boundingBox();
      const actions = await page.locator('.study-navigation-actions').boundingBox();
      expect(timer.y).toBeGreaterThanOrEqual(dock.y);
      expect(timer.y + timer.height).toBeLessThanOrEqual(actions.y);
    } else {
      const navigator = await page.locator('.study-sidebar').boundingBox();
      const main = await page.locator('.study-main').boundingBox();
      expect(timer.y + timer.height).toBeLessThanOrEqual(navigator.y);
      expect(timer.x).toBeGreaterThanOrEqual(main.x + main.width);
    }
    await dockGeometry(page, state.width, state.height);
    await page.screenshot({
      path: testInfo.outputPath(`exam-${state.width}-${state.language}-${state.theme}.png`),
    });
    const summary = page.locator('.study-navigator summary');
    if ((await page.locator('.study-navigator').getAttribute('open')) === null)
      await summary.click();
    const jump = page.locator('#question-jump');
    await jump.focus();
    if (state.width <= 900) {
      await expect(page.locator('.study-navigation-bar')).toBeHidden();
      await expect(page.locator('.study-navigation-bar')).toHaveCSS('position', 'fixed');
    }
    await jump.fill('2');
    await jump.press('Enter');
    await expect(page.locator('.study-position')).toContainText(
      state.language === 'vi' ? 'Câu 2' : 'Question 2'
    );
    await jump.blur();
    await expect(page.locator('.study-navigation-bar')).toBeVisible();
  }
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Review before submitting', exact: true });
  await clickAfterUiMotion(dialog.getByRole('button', { name: 'Continue exam', exact: true }));
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
  await clickAfterUiMotion(
    dialog.getByRole('button', { name: 'Submit and view results', exact: true })
  );
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(
    page.locator('.study-navigation-bar').getByRole('button', { name: 'Explain', exact: true })
  ).toBeVisible();
});

test('explanation opened from the dock is visible and returns focus on close', async ({ page }) => {
  await page.goto('./#/quiz/anthropic-ccar-p/practice');
  const explain = page.getByRole('button', { name: 'Explain', exact: true });
  await explain.click();
  const panel = page.locator('.explanation-panel');
  await expect(panel).toBeFocused();
  await expect(panel.locator('.markdown-container[lang="vi"]')).not.toBeEmpty();
  const header = await page.locator('.app-header').boundingBox();
  expect((await panel.boundingBox()).y).toBeGreaterThanOrEqual(header.height);
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(explain).toBeFocused();
});
