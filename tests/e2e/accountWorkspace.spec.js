import { test, expect } from '@playwright/test';
import { accountCases } from './viewports.js';
import { clickAfterUiMotion, waitForUiMotion } from './uiMotion.js';
import { contrastRatio } from './uiContrast.js';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
});
async function currentAccount(
  page,
  user = {
    uid: 'workspace-alice',
    displayName: 'Profile learner',
    email: 'learner@example.test',
    emailVerified: true,
  }
) {
  await page.addInitScript(
    (user) => localStorage.setItem('quiz-e2e-auth', JSON.stringify(user)),
    user
  );
}
const profile = (page) => page.locator('.account-page');
const changeAccount = (page, user) =>
  page.evaluate(
    (user) => window.dispatchEvent(new CustomEvent('quiz-e2e-auth-change', { detail: user })),
    user
  );

test('Profile uses current readonly identity, device-local preferences and existing settings/manage entry points', async ({
  page,
}) => {
  await currentAccount(page);
  await page.goto('./#/profile');
  await expect(profile(page)).toContainText('learner@example.test');
  await expect(profile(page).locator('input:not([type=radio])')).toHaveCount(0);
  const before = await page.evaluate(() =>
    localStorage.getItem('quiz-e2e-profile:workspace-alice')
  );
  const theme = profile(page).getByRole('radiogroup', { name: 'Theme', exact: true });
  await theme.getByRole('radio', { name: 'Light', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(theme.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked();
  await profile(page).getByText('Tiếng Việt', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(profile(page)).toContainText('không đồng bộ giữa các thiết bị');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  expect(await page.evaluate(() => localStorage.getItem('quiz-e2e-profile:workspace-alice'))).toBe(
    before
  );
  const ai = profile(page).getByRole('button', { name: 'Cài đặt AI', exact: true });
  await ai.click();
  const settings = page.getByRole('dialog', { name: 'Cài đặt AI', exact: true });
  await clickAfterUiMotion(settings.getByRole('button', { name: 'Xong', exact: true }));
  await expect(ai).toBeFocused();
  await profile(page).getByRole('button', { name: 'Quản lý quiz', exact: true }).click();
  await expect(page).toHaveURL(/#\/my-quizzes$/);
});

test('missing Google fields and failed preference storage keep Profile usable', async ({
  page,
}) => {
  await currentAccount(page, { uid: 'workspace-missing' });
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (['quiz-app-language', 'quiz-app-theme'].includes(key))
        throw new DOMException('Blocked', 'SecurityError');
      return set.call(this, key, value);
    };
  });
  await page.goto('./#/profile');
  await expect(profile(page).getByText('Not provided', { exact: true })).toHaveCount(2);
  await profile(page).getByText('Dark', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await profile(page).getByText('Tiếng Việt', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hồ sơ', exact: true })).toBeVisible();
});

test('auth loading, guest sign-in failure and account changes never retain old Profile identity', async ({
  page,
}) => {
  await currentAccount(page);
  await page.addInitScript(() => sessionStorage.setItem('quiz-e2e-defer-auth', '1'));
  await page.goto('./#/profile');
  await expect(profile(page).getByRole('status')).toContainText('Loading account');
  await expect(profile(page)).not.toContainText('learner@example.test');
  await page.evaluate(() => window.dispatchEvent(new Event('quiz-e2e-auth-ready')));
  await expect(profile(page)).toContainText('learner@example.test');
  await changeAccount(page, {
    uid: 'workspace-bob',
    displayName: 'Second learner',
    email: 'bob@example.test',
  });
  await expect(profile(page)).toContainText('bob@example.test');
  await expect(profile(page)).not.toContainText('learner@example.test');
  await changeAccount(page, null);
  await expect(profile(page)).not.toContainText('bob@example.test');
  await profile(page).getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-fail-signin', '1'));
  const signIn = page.getByRole('dialog', { name: 'Sign in', exact: true });
  await clickAfterUiMotion(
    signIn.getByRole('button', { name: 'Continue with Google', exact: true })
  );
  await expect(signIn.getByRole('alert')).toContainText('Could not sign in');
  await page.evaluate(() => sessionStorage.removeItem('quiz-e2e-fail-signin'));
  await clickAfterUiMotion(
    signIn.getByRole('button', { name: 'Continue with Google', exact: true })
  );
  await expect(profile(page)).toContainText('alice@example.test');
  await page.getByRole('button', { name: 'Test account', exact: true }).click();
  await clickAfterUiMotion(page.getByRole('menuitem', { name: 'Sign out', exact: true }));
  await clickAfterUiMotion(
    page
      .getByRole('dialog')
      .filter({ hasText: 'Sign out?' })
      .getByRole('button', { name: 'Sign out', exact: true })
  );
  await expect(page).toHaveURL(/#\/library$/);
});

for (const destination of ['Profile', 'Manage quizzes'])
  test(`${destination} menu navigation preserves active exam Cancel, Leave and Resume`, async ({
    page,
  }) => {
    await currentAccount(page);
    await page.goto('./#/quiz/aws-aip-c01/exam?feedback=learning');
    await page.locator('.question-options input').first().check();
    const readDraft = () =>
      page.evaluate(() =>
        JSON.parse(sessionStorage.getItem('quiz-study-v1:workspace-alice:aws-aip-c01:exam'))
      );
    const before = await readDraft();
    const trigger = page.getByRole('button', { name: 'Profile learner', exact: true });
    async function enter() {
      await trigger.focus();
      await trigger.press('Enter');
      const item = page.getByRole('menuitem', { name: destination, exact: true });
      await item.focus();
      await item.press('Enter');
    }
    await enter();
    const guard = page.getByRole('dialog').filter({ hasText: 'Leave this exam?' });
    await clickAfterUiMotion(guard.getByRole('button', { name: 'Continue exam', exact: true }));
    await expect(trigger).toBeFocused();
    expect(await readDraft()).toEqual(before);
    await enter();
    await clickAfterUiMotion(guard.getByRole('button', { name: 'Leave exam', exact: true }));
    await expect(page).toHaveURL(destination === 'Profile' ? /#\/profile$/ : /#\/my-quizzes$/);
    await page.getByRole('button', { name: 'Quiz Bank', exact: true }).click();
    await page.goto('./#/quiz/aws-aip-c01?mode=exam');
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    expect(await readDraft()).toEqual(before);
  });

test('public update discovery preserves bank identity, provenance, reload and Back', async ({
  page,
}) => {
  await page.goto('./#/library');
  await page
    .locator('.quiz-library')
    .getByRole('button', { name: 'Quiz updates', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Quiz updates', exact: true })).toBeVisible();
  const entry = page.locator('.quiz-update');
  await expect(entry).toContainText('Added 36 questions');
  await expect(entry.locator('time')).toHaveAttribute('datetime', '2026-11-01');
  await expect(entry.getByRole('link', { name: '241c5b1', exact: true })).toHaveAttribute(
    'href',
    'https://github.com/tuanvipandpro/quiz-app/commit/241c5b16dc23b04eb9ce0a5c7a63e4833b492a46'
  );
  await page.reload();
  await entry.getByRole('button', { name: 'Open quiz', exact: true }).click();
  await expect(page).toHaveURL(/#\/quiz\/istqb-ctfl-v4-0$/);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Quiz updates', exact: true })).toBeVisible();
  await page
    .locator('.app-footer')
    .getByRole('button', { name: 'Quiz updates', exact: true })
    .click();
});

test('a direct updates link uses the existing native exam guard without changing the draft', async ({
  page,
}) => {
  await currentAccount(page);
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await expect(page.locator('.question-title')).toBeVisible();
  const before = await page.evaluate(() =>
    sessionStorage.getItem('quiz-study-v1:workspace-alice:aws-aip-c01:exam')
  );
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.evaluate(() => {
    location.hash = '#/updates';
  });
  await expect(page).toHaveURL(/#\/quiz\/aws-aip-c01\/exam$/);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem('quiz-study-v1:workspace-alice:aws-aip-c01:exam')
    )
  ).toBe(before);
  page.once('dialog', (dialog) => dialog.accept());
  await page.evaluate(() => {
    location.hash = '#/updates';
  });
  await expect(page.getByRole('heading', { name: 'Quiz updates', exact: true })).toBeVisible();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem('quiz-study-v1:workspace-alice:aws-aip-c01:exam')
    )
  ).toBe(before);
});

test('empty reviewed updates retain a public route back to the library', async ({ page }) => {
  await page.route('**/src/data/quizUpdates.js*', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: 'export const quizUpdates = [];' })
  );
  await page.goto('./#/updates');
  await expect(profile(page)).toContainText('No reviewed quiz updates yet.');
  await profile(page).getByRole('button', { name: 'Back to library', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
});

test('Profile, dropdown and update pages fit languages, themes and phone-to-landscape layouts', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await currentAccount(page, {
    uid: 'workspace-long',
    displayName: 'A deliberately long Google profile display name '.repeat(4),
    email: 'long-profile-address-for-a-certification-learner@example.test',
  });
  await page.goto('./#/profile');
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
    for (const control of await profile(page).locator('button, .ant-radio-button-wrapper').all())
      expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect(
      await contrastRatio(profile(page).locator('.profile-preferences .ant-typography-secondary'))
    ).toBeGreaterThanOrEqual(4.5);
    await page.locator('.profile-button').click();
    const menu = page.getByRole('menu');
    await waitForUiMotion(menu);
    for (const name of [
      state.language === 'vi' ? 'Hồ sơ' : 'Profile',
      state.language === 'vi' ? 'Quản lý quiz' : 'Manage quizzes',
    ]) {
      const item = menu.getByRole('menuitem', { name, exact: true });
      expect((await item.boundingBox()).height).toBeGreaterThanOrEqual(44);
      expect(await contrastRatio(item)).toBeGreaterThanOrEqual(4.5);
    }
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({
      path: info.outputPath(`profile-${state.width}-${state.language}-${state.theme}.png`),
    });
    await page
      .locator('.app-footer')
      .getByRole('button', {
        name: state.language === 'vi' ? 'Cập nhật quiz' : 'Quiz updates',
        exact: true,
      })
      .click();
    await expect(page.locator('.quiz-update')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({
      path: info.outputPath(`updates-${state.width}-${state.language}-${state.theme}.png`),
    });
    await page.goBack();
    await expect(profile(page).locator('.profile-identity')).toBeVisible();
  }
});
