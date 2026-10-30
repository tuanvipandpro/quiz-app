import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const example = (format) =>
  fileURLToPath(new URL(`../../public/examples/quiz-${format}.json`, import.meta.url));
const modeLabel = (mode) => (mode === 'learning' ? 'Learning exam' : 'Standard exam');
const draftKey = (quiz = 'custom', user = 'guest') => `quiz-study-v1:${user}:${quiz}:exam`;
const readDraft = (page, quiz, user) =>
  page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), draftKey(quiz, user));

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
});

async function uploadExam(page, format, mode) {
  await page.goto('./#/my-quizzes');
  await page.locator('input[type=file]').setInputFiles(example(format));
  await page.getByRole('button', { name: 'Use this quiz', exact: true }).click();
  await page.getByText('Mock exam', { exact: true }).click();
  const choices = page.getByRole('radiogroup', { name: 'Exam mode', exact: true });
  await expect(choices.getByRole('radio', { name: 'Standard exam', exact: true })).toBeChecked();
  await choices.getByRole('radio', { name: modeLabel(mode), exact: true }).check();
  await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  await expect(page.locator('.question-title')).toBeVisible();
  await expect(page.locator('.exam-mode-label')).toHaveText(`Exam mode: ${modeLabel(mode)}`);
}

async function submitExam(page) {
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Review before submitting', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Submit and view results', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
}

async function leaveToSetup(page) {
  await page.getByRole('button', { name: 'Back to quiz overview', exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Leave this exam?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Leave exam', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('radiogroup', { name: 'Exam mode', exact: true })).toBeVisible();
}

async function chooseDropdown(page, label, answer) {
  const select = page.getByRole('combobox', { name: label, exact: true });
  await select.click();
  const listbox = page.locator(`[id="${await select.getAttribute('aria-controls')}"]`);
  await listbox.getByRole('option', { name: answer, exact: true }).click();
  await expect(select).toHaveAttribute('aria-expanded', 'false');
}

for (const mode of ['standard', 'learning']) {
  for (const format of ['single', 'multiple', 'yes-no', 'dropdown-rows', 'dropdown-inline']) {
    test(`${mode} exam feedback follows completeness for ${format} and locks on submit`, async ({
      page,
    }) => {
      await uploadExam(page, format, mode);
      const feedback = page.locator('.question-feedback');
      await expect(feedback).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Explain', exact: true })).toHaveCount(0);
      if (format === 'single') {
        await page.getByRole('radio', { name: 'Paris', exact: true }).check();
      } else if (format === 'multiple') {
        await page.getByRole('checkbox', { name: '2', exact: true }).check();
        await expect(feedback).toHaveCount(0);
        await expect(page.locator('.option-correct')).toHaveCount(0);
        await page.getByRole('checkbox', { name: '4', exact: true }).check();
      } else if (format === 'yes-no') {
        await page
          .getByRole('group', { name: 'Two is an even number.', exact: true })
          .getByText('Yes', { exact: true })
          .click();
        await expect(feedback).toHaveCount(0);
        await expect(page.locator('.structured-part-feedback')).toHaveCount(0);
        await page
          .getByRole('group', { name: 'Three is an even number.', exact: true })
          .getByText('No', { exact: true })
          .click();
      } else {
        const labels =
          format === 'dropdown-rows'
            ? ['Answer for Keyboard', 'Answer for Monitor']
            : ['Answer for Input device', 'Answer for Output device'];
        const answers = format === 'dropdown-rows' ? ['Input', 'Output'] : ['Keyboard', 'Monitor'];
        await chooseDropdown(page, labels[0], answers[0]);
        await expect(feedback).toHaveCount(0);
        await expect(page.locator('.structured-part-feedback')).toHaveCount(0);
        await chooseDropdown(page, labels[1], answers[1]);
      }
      if (mode === 'learning') {
        await expect(feedback).toContainText('Correct answer!');
      } else {
        await expect(feedback).toHaveCount(0);
        await expect(page.locator('.option-correct, .structured-part-feedback')).toHaveCount(0);
        await expect(
          page.locator(
            '.question-number[aria-label*="Correct"], .question-number[aria-label*="Incorrect"]'
          )
        ).toHaveCount(0);
      }
      if (format === 'multiple') {
        // Removing one part hides feedback again; users can still edit a Learning answer.
        await page.getByRole('checkbox', { name: /^2/ }).uncheck();
        await expect(feedback).toHaveCount(0);
        await page.getByRole('checkbox', { name: '2', exact: true }).check();
      }
      if (format === 'single') {
        await page.getByRole('radio', { name: 'London', exact: true }).check();
        if (mode === 'learning') await expect(feedback).toContainText('Review the correct answer');
        else await expect(feedback).toHaveCount(0);
      }
      await submitExam(page);
      await expect(feedback).toBeVisible();
      await expect(page.locator('.exam-mode-label')).toHaveText(`Exam mode: ${modeLabel(mode)}`);
      await expect(page.locator('.score-number')).toHaveText(
        format === 'single' ? '0 / 1' : '1 / 1'
      );
      for (const input of await page.locator('.quiz-question-card input').all()) {
        await expect(input).toBeDisabled();
      }
      if (mode === 'learning') {
        await expect(
          page.getByText('Learning exam score uses your final answers.', { exact: true })
        ).toBeVisible();
      }
    });
  }

  test(`${mode} bank exam keeps its mode, shuffle, answers and deadline across reload and Resume`, async ({
    page,
  }) => {
    const other = mode === 'standard' ? 'learning' : 'standard';
    await page.goto('./#/quiz/aws-aip-c01?mode=exam');
    await page.getByRole('radio', { name: modeLabel(mode), exact: true }).check();
    await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
    await expect(page.locator('.question-title')).toBeVisible();
    const originalUrl = page.url();
    await page.locator('.question-options input').first().check();
    await page.getByRole('button', { name: 'Flag', exact: true }).click();
    await page.getByRole('button', { name: 'Next question', exact: true }).click();
    const draft = await readDraft(page, 'aws-aip-c01');
    await page.reload();
    await expect(page.locator('.exam-mode-label')).toContainText(modeLabel(mode));
    expect(await readDraft(page, 'aws-aip-c01')).toEqual(draft);
    await leaveToSetup(page);
    await expect(page.getByRole('alert')).toContainText(`Saved exam: ${modeLabel(mode)}`);
    await page.getByRole('radio', { name: modeLabel(other), exact: true }).check();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.locator('.exam-mode-label')).toContainText(modeLabel(mode));
    expect(await readDraft(page, 'aws-aip-c01')).toEqual(draft);
    await leaveToSetup(page);
    await page.getByRole('radio', { name: modeLabel(other), exact: true }).check();
    await page.getByRole('button', { name: 'Start a new exam', exact: true }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Start a new exam?' });
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Start a new exam', exact: true })).toBeFocused();
    expect(await readDraft(page, 'aws-aip-c01')).toEqual(draft);
    await page.getByRole('button', { name: 'Start a new exam', exact: true }).click();
    await dialog.getByRole('button', { name: 'Start mock exam', exact: true }).click();
    await expect(page.locator('.exam-mode-label')).toContainText(modeLabel(other));
    const fresh = await readDraft(page, 'aws-aip-c01');
    expect(fresh.feedbackMode).toBe(other);
    expect(fresh.flags).toEqual([]);
    expect(fresh.index).toBe(0);
    expect(fresh.deadline).toBeGreaterThan(draft.deadline);
    page.once('dialog', (prompt) => prompt.accept());
    await page.goBack();
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await page.goto(originalUrl);
    await expect(page.locator('.exam-mode-label')).toContainText(modeLabel(other));
    expect(await readDraft(page, 'aws-aip-c01')).toEqual(fresh);
  });

  test(`${mode} exam expires without extending its deadline and rejects later answers`, async ({
    page,
  }) => {
    await page.clock.install();
    await uploadExam(page, 'single', mode);
    const before = await readDraft(page);
    await page.clock.fastForward(60 * 60 * 1000 + 1000);
    await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
    await expect(page.getByText('Time is up', { exact: true })).toBeVisible();
    await expect(page.locator('.exam-mode-label')).toContainText(modeLabel(mode));
    await expect(page.locator('.question-options input').first()).toBeDisabled();
    const after = await readDraft(page);
    expect(after.deadline).toBe(before.deadline);
    expect(after.answers).toEqual(before.answers);
    expect(after.submitted).toBe(true);
    expect(after.timeExpired).toBe(true);
  });
}

test('legacy and invalid mode links restore Standard without losing the draft', async ({
  page,
}) => {
  await page.goto('./#/quiz/aws-aip-c01/exam?feedback=not-a-mode');
  await expect(page.locator('.exam-mode-label')).toContainText('Standard exam');
  await page.getByRole('button', { name: 'Flag', exact: true }).click();
  const before = await readDraft(page, 'aws-aip-c01');
  for (const invalid of [null, 'not-a-mode']) {
    await page.evaluate(
      ({ key, invalid }) => {
        const value = JSON.parse(sessionStorage.getItem(key));
        if (invalid === null) delete value.feedbackMode;
        else value.feedbackMode = invalid;
        sessionStorage.setItem(key, JSON.stringify(value));
      },
      { key: draftKey('aws-aip-c01'), invalid }
    );
    await page.reload();
    await expect(page.locator('.exam-mode-label')).toContainText('Standard exam');
    expect(await readDraft(page, 'aws-aip-c01')).toEqual(before);
  }
});

test('sign-out clears Learning drafts and the next guest exam starts as Standard', async ({
  page,
}) => {
  await page.goto('./#/quiz/aws-aip-c01?mode=exam');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Test account', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Learning exam', exact: true }).check();
  await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  await expect(page.locator('.exam-mode-label')).toContainText('Learning exam');
  await page.getByRole('button', { name: 'Flag', exact: true }).click();
  await page.getByRole('button', { name: 'Test account', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Sign out?' });
  await expect(dialog).toContainText('end this exam');
  await dialog.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#\/library$/);
  expect(await readDraft(page, 'aws-aip-c01', 'test-alice')).toBeNull();
  await page.goto('./#/quiz/aws-aip-c01?mode=exam');
  await expect(page.getByRole('radio', { name: 'Standard exam', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  await expect(page.locator('.exam-mode-label')).toContainText('Standard exam');
  expect((await readDraft(page, 'aws-aip-c01')).flags).toEqual([]);
});

test('Learning exam remains usable and reports unavailable draft storage', async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('quiz-study-v1:'))
        throw new DOMException('Test quota', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
  });
  await page.goto('./#/quiz/aws-aip-c01/exam?feedback=learning');
  await expect(page.locator('.exam-mode-label')).toContainText('Learning exam');
  await expect(
    page.getByText('Draft storage is unavailable in this browser.', { exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await expect(page.getByText('Question 2 of 50', { exact: true })).toBeVisible();
  expect(await readDraft(page, 'aws-aip-c01')).toBeNull();
});

test('sign-in during a guest exam returns to setup without creating an account draft', async ({
  page,
}) => {
  await page.goto('./#/quiz/aws-aip-c01/exam?feedback=learning');
  await expect(page.locator('.exam-mode-label')).toContainText('Learning exam');
  await page.getByRole('button', { name: 'Flag', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Test account', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Standard exam', exact: true })).toBeChecked();
  expect(await readDraft(page, 'aws-aip-c01')).toBeNull();
  expect(await readDraft(page, 'aws-aip-c01', 'test-alice')).toBeNull();
  await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  await expect(page.locator('.exam-mode-label')).toContainText('Standard exam');
  await page.getByRole('button', { name: 'Flag', exact: true }).click();
  const draft = await readDraft(page, 'aws-aip-c01', 'test-alice');
  await page.reload();
  await expect(page.locator('.exam-mode-label')).toContainText('Standard exam');
  expect(await readDraft(page, 'aws-aip-c01', 'test-alice')).toEqual(draft);
});

test('exam mode options support keyboard, languages, themes and phone to landscape layouts', async ({
  page,
}) => {
  await page.goto('./#/quiz/aws-aip-c01?mode=exam');
  const choices = page.getByRole('radiogroup', { name: 'Exam mode', exact: true });
  const standard = choices.getByRole('radio', { name: 'Standard exam', exact: true });
  const learning = choices.getByRole('radio', { name: 'Learning exam', exact: true });
  await standard.focus();
  await standard.press('ArrowRight');
  await expect(learning).toBeChecked();
  await expect(learning).toBeFocused();
  for (const language of ['en', 'vi']) {
    await page
      .getByRole('button', { name: language === 'en' ? 'English' : 'Tiếng Việt', exact: true })
      .click();
    for (const theme of ['light', 'dark']) {
      if ((await page.locator('html').getAttribute('data-theme')) !== theme) {
        await page.locator('.theme-toggle').click();
      }
      for (const [width, height] of [
        [320, 844],
        [390, 844],
        [412, 915],
        [768, 1024],
        [1280, 900],
        [844, 390],
      ]) {
        await page.setViewportSize({ width, height });
        await expect(
          page.getByRole('radiogroup', {
            name: language === 'en' ? 'Exam mode' : 'Chế độ thi',
            exact: true,
          })
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
          )
        ).toBe(true);
        for (const option of await page.locator('.exam-feedback-option').all()) {
          const box = await option.boundingBox();
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
        }
      }
    }
  }
});
