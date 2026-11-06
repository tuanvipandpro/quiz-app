import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { historyAttempt } from '../fixtures/historyAttempt.js';
import { clickAfterUiMotion } from './uiMotion.js';
import { accountCases } from './viewports.js';
import { contrastRatio } from './uiContrast.js';
import { createExamSession, finishExam } from '../../src/utils/studySession.js';
import { createHistoryAttempt, examHistorySource } from '../../src/utils/examHistory.js';
import { contentHash } from '../../src/utils/contentHash.js';
import {
  questionType,
  questionParts,
  partLabel,
  partOptions,
} from '../../src/utils/questionModel.js';

const uid = 'history-alice';
const errors = new WeakMap();
test.beforeEach(async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
  const found = [];
  errors.set(page, found);
  page.on('pageerror', (error) => found.push(error.message));
  context.on('page', (other) => other.on('pageerror', (error) => found.push(error.message)));
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));
async function init(
  context,
  {
    enabled = true,
    signedIn = true,
    strict = false,
    seed = null,
    language = 'en',
    theme = 'light',
  } = {}
) {
  await context.addInitScript(
    ({ enabled, signedIn, strict, seed, uid, language, theme }) => {
      if (!['127.0.0.1', 'localhost'].includes(location.hostname)) return;
      if (!sessionStorage.getItem('quiz-e2e-history-configured')) {
        if (enabled) sessionStorage.setItem('quiz-e2e-history-enabled', '1');
        if (strict) sessionStorage.setItem('quiz-e2e-history-strict', '1');
        sessionStorage.setItem('quiz-e2e-history-configured', '1');
      }
      if (signedIn && !localStorage.getItem('quiz-e2e-auth'))
        localStorage.setItem(
          'quiz-e2e-auth',
          JSON.stringify({
            uid,
            displayName: 'History learner',
            email: 'history@example.test',
            emailVerified: true,
          })
        );
      if (!localStorage.getItem('quiz-app-language'))
        localStorage.setItem('quiz-app-language', language);
      if (!localStorage.getItem('quiz-app-theme')) localStorage.setItem('quiz-app-theme', theme);
      if (seed && !localStorage.getItem('quiz-e2e-history:' + uid))
        localStorage.setItem('quiz-e2e-history:' + uid, JSON.stringify(seed));
    },
    { enabled, signedIn, strict, seed, uid, language, theme }
  );
}
async function seedAttempts(count, options = {}) {
  const attempts = await Promise.all(
    Array.from({ length: count }, (_, index) =>
      historyAttempt({ uid, now: Date.parse('2026-11-01T08:00:00Z') + index * 1000, ...options })
    )
  );
  return {
    attempts: Object.fromEntries(attempts.map((attempt) => [attempt.summary.attemptId, attempt])),
    receipts: Object.fromEntries(
      attempts.map((attempt) => [
        attempt.summary.attemptId,
        { state: 'saved', payloadHash: attempt.summary.payloadHash },
      ])
    ),
    revision: count,
  };
}
const records = (page) =>
  page.evaluate(
    (uid) =>
      JSON.parse(
        localStorage.getItem('quiz-e2e-history:' + uid) ||
          '{"attempts":{},"receipts":{},"revision":0}'
      ),
    uid
  );
const calls = (page) => page.evaluate(() => window.quizHistoryCalls || []);
const draft = (page) =>
  page.evaluate(
    (uid) => JSON.parse(sessionStorage.getItem(`quiz-study-v1:${uid}:aws-aip-c01:exam`)),
    uid
  );
async function submit(page) {
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
  await clickAfterUiMotion(
    page
      .getByRole('dialog', { name: 'Review before submitting', exact: true })
      .getByRole('button', { name: 'Submit and view results', exact: true })
  );
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
}
async function saved(page) {
  await expect(page.getByText('Exam saved to history.', { exact: true })).toBeVisible();
}
async function confirmDelete(page) {
  const modal = page.getByRole('dialog', { name: 'Delete this exam archive?', exact: true });
  await clickAfterUiMotion(modal.getByRole('button', { name: 'Delete archive', exact: true }));
  await expect(modal).toBeHidden();
}

test('HTTP LAN crypto capabilities keep new exam identity and archive fingerprints compatible', async ({
  page,
  context,
}) => {
  await init(context);
  await context.addInitScript(() => {
    if (['127.0.0.1', 'localhost'].includes(location.hostname)) {
      Object.defineProperty(crypto, 'randomUUID', { value: undefined });
      Object.defineProperty(crypto, 'subtle', { value: undefined });
    }
  });
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await expect(page.locator('.question-title')).toBeVisible();
  const before = await draft(page);
  expect(before.attemptId).toMatch(/^[0-9a-f-]{36}$/);
  await submit(page);
  await saved(page);
  await page.reload();
  await saved(page);
  expect(Object.keys((await records(page)).attempts)).toEqual([before.attemptId]);
});

async function answerExample(page, question) {
  if (questionType(question) === 'multiple_choice') {
    for (const key of question.answer)
      await page
        .getByRole(question.answer.length > 1 ? 'checkbox' : 'radio', {
          name: question.options[key],
          exact: true,
        })
        .check();
  } else if (questionType(question) === 'yes_no') {
    for (const part of questionParts(question))
      await page
        .getByRole('group', { name: part.text, exact: true })
        .getByText(partOptions(question, part.id)[question.answer[part.id]], { exact: true })
        .click();
  } else {
    for (const [index, part] of questionParts(question).entries()) {
      const select = page.getByRole('combobox', {
        name: 'Answer for ' + partLabel(part, index),
        exact: true,
      });
      await select.click();
      const list = page.locator(`[id="${await select.getAttribute('aria-controls')}"]`);
      await list
        .getByRole('option', {
          name: partOptions(question, part.id)[question.answer[part.id]],
          exact: true,
        })
        .click();
    }
  }
}

test('a late answer before the timer renders expiry is rejected and archived at the existing deadline', async ({
  page,
  context,
}) => {
  await init(context);
  await page.clock.install({ time: new Date('2026-11-06T02:00:00Z') });
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await expect(page.locator('.question-title')).toBeVisible();
  const before = await draft(page);
  await page.clock.pauseAt(new Date(before.startedAt + 60000));
  await page.clock.setSystemTime(new Date(before.deadline + 5000));
  await page.locator('.question-options input').first().click();
  await saved(page);
  const after = await draft(page);
  expect(after.answers).toEqual(before.answers);
  expect(after.endedAt).toBe(before.deadline);
  expect(after.endReason).toBe('expired');
  expect(Object.values((await records(page)).attempts)[0].summary.endedAt).toBe(before.deadline);
});

test('an active legacy draft receives additive identity and unknown duration without changing its deadline', async ({
  page,
  context,
}) => {
  await init(context);
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await expect(page.locator('.question-title')).toBeVisible();
  const before = await draft(page);
  await page.evaluate((uid) => {
    const key = `quiz-study-v1:${uid}:aws-aip-c01:exam`,
      value = JSON.parse(sessionStorage.getItem(key));
    for (const field of [
      'attemptId',
      'startedAt',
      'gradingVersion',
      'historyOwner',
      'historySource',
      'captureHistory',
    ])
      delete value[field];
    sessionStorage.setItem(key, JSON.stringify(value));
  }, uid);
  await page.reload();
  await expect(page.locator('.question-title')).toBeVisible();
  const migrated = await draft(page);
  expect(migrated.deadline).toBe(before.deadline);
  expect(migrated.questions).toEqual(before.questions);
  expect(migrated.answers).toEqual(before.answers);
  expect(migrated.startedAt).toBeNull();
  await submit(page);
  await saved(page);
  await page.getByRole('button', { name: 'View saved result', exact: true }).click();
  await expect(page.locator('.history-score')).toContainText('Duration unavailable');
});

test('all formats in both exam modes archive independently from deleted and reused saved-quiz slots', async ({
  page,
  context,
}) => {
  test.setTimeout(240000);
  await init(context);
  let ai = 0;
  page.on('request', (request) => {
    if (request.url().includes(':5176/')) ai++;
  });
  let total = 0;
  for (const mode of ['standard', 'learning'])
    for (const format of ['single', 'multiple', 'yes-no', 'dropdown-rows', 'dropdown-inline']) {
      const title = `History ${format} ${mode}`,
        file = fileURLToPath(new URL(`../../public/examples/quiz-${format}.json`, import.meta.url));
      const question = JSON.parse(fs.readFileSync(file))[0];
      await page.goto('./#/my-quizzes');
      await page.locator('input[type=file]').setInputFiles(file);
      await page.getByRole('textbox', { name: 'Quiz name', exact: true }).fill(title);
      await page.getByRole('button', { name: 'Save to my quizzes', exact: true }).click();
      let card = page
        .locator('.cloud-quiz-card')
        .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
      await expect(card).toBeVisible();
      await card.getByRole('button', { name: 'Mock exam', exact: true }).click();
      if (mode === 'learning')
        await page.getByRole('radio', { name: 'Learning exam', exact: true }).check();
      await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
      await expect(page.locator('.question-title')).toBeVisible();
      await answerExample(page, question);
      await submit(page);
      await saved(page);
      total++;
      const data = await records(page);
      expect(Object.keys(data.attempts)).toHaveLength(total);
      const attempt = Object.values(data.attempts).find(
        (attempt) => attempt.summary.source.title === title
      );
      expect(attempt.summary.correct).toBe(1);
      expect(attempt.summary.feedbackMode).toBe(mode);
      await page.getByRole('button', { name: 'View saved result', exact: true }).click();
      await expect(page.locator('.history-score')).toContainText('100.0%');
      for (const input of await page.locator('.quiz-question-card input').all())
        await expect(input).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Explain', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'My quizzes', exact: true }).click();
      card = page
        .locator('.cloud-quiz-card')
        .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
      await card.getByRole('button', { name: 'Delete', exact: true }).click();
      const modal = page.getByRole('dialog', { name: 'Delete this quiz?', exact: true });
      await expect(modal).toContainText('Archived exam results are kept separately.');
      await clickAfterUiMotion(modal.getByRole('button', { name: 'Delete', exact: true }));
      await expect(modal).toBeHidden();
    }
  await page.goto('./#/history');
  await expect(page.getByText('10/50 saved exams', { exact: true })).toBeVisible();
  await expect(page.locator('.history-statistics .ant-card')).toHaveCount(10);
  const oldest = Object.values((await records(page)).attempts).find(
    (attempt) => attempt.summary.source.title === 'History single standard'
  );
  await page.goto('./#/history/' + oldest.summary.attemptId);
  await expect(page.locator('.history-source-status')).toContainText(
    'The original quiz is no longer available.'
  );
  await page.goto('./#/my-quizzes');
  await page
    .locator('input[type=file]')
    .setInputFiles(
      fileURLToPath(new URL('../../public/examples/quiz-single.json', import.meta.url))
    );
  await page.getByRole('textbox', { name: 'Quiz name', exact: true }).fill('New slot occupant');
  await page.getByRole('button', { name: 'Save to my quizzes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New slot occupant', exact: true })).toBeVisible();
  await page.goto('./#/history/' + oldest.summary.attemptId);
  await expect(page.locator('.history-source-status')).toContainText(
    'The saved quiz slot has been reused.'
  );
  await expect(page.getByRole('button', { name: 'Open current quiz', exact: true })).toHaveCount(0);
  await expect(page.locator('.history-review-heading')).toContainText('History single standard');
  await expect(page.locator('.history-score')).toContainText('Saved quiz version');
  await expect(page.locator('.history-score')).toContainText('100.0%');
  expect(ai).toBe(0);
});

test('the production-default flag exposes no capture/menu/private IO and completed disabled drafts do not backfill', async ({
  page,
  context,
}) => {
  await init(context, { enabled: false });
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await submit(page);
  await expect(page.locator('.exam-archive-status')).toHaveCount(0);
  expect(await calls(page)).toHaveLength(0);
  await page.getByRole('button', { name: 'History learner', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Exam history', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-history-enabled', '1'));
  await page.reload();
  await expect(
    page.getByText('This completed exam stays in this tab. New exams can be archived.', {
      exact: true,
    })
  ).toBeVisible();
  expect(await calls(page)).toHaveLength(0);
  await page.goto('./#/history');
  await expect(page.getByText('No saved exam results yet.', { exact: false })).toBeVisible();
});

test('Standard submit, refresh, read-only review and deletion receipt preserve one stable attempt', async ({
  page,
  context,
}) => {
  await init(context);
  let ai = 0;
  page.on('request', (request) => {
    if (request.url().includes(':5176/')) ai++;
  });
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await page.locator('.question-options input').first().check();
  const before = await draft(page);
  await submit(page);
  await saved(page);
  const first = await records(page);
  expect(Object.keys(first.attempts)).toHaveLength(1);
  expect(Object.keys(first.attempts)[0]).toBe(before.attemptId);
  const url = page.url();
  await page.reload();
  await saved(page);
  expect(Object.keys((await records(page)).attempts)).toHaveLength(1);
  expect((await draft(page)).deadline).toBe(before.deadline);
  await page.getByRole('button', { name: 'View saved result', exact: true }).click();
  await expect(page.locator('.history-score')).toBeVisible();
  for (const control of await page.locator('.quiz-question-card input').all())
    await expect(control).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Explain', exact: true })).toHaveCount(0);
  await expect(page.getByText('Correct answer in this snapshot', { exact: true })).toBeVisible();
  expect(ai).toBe(0);
  await page.getByRole('button', { name: 'Delete archive', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('minimal deletion receipt');
  await confirmDelete(page);
  await expect(page.getByText('Archive deleted.', { exact: true })).toBeVisible();
  const deleted = await records(page);
  expect(Object.keys(deleted.attempts)).toHaveLength(0);
  expect(deleted.receipts[before.attemptId]).toEqual({ state: 'deleted' });
  await page.goto(url);
  await expect(
    page.getByText('This archive was deleted. This tab result will not recreate it.', {
      exact: true,
    })
  ).toBeVisible();
  expect(Object.keys((await records(page)).attempts)).toHaveLength(0);
});

test('Learning expiry uses the absolute deadline and an actual StrictMode root cannot duplicate the archive', async ({
  page,
  context,
}) => {
  await init(context, { strict: true });
  await page.clock.install();
  await page.goto('./#/quiz/aws-aip-c01/exam?feedback=learning');
  await expect(page.locator('html')).toHaveAttribute('data-e2e-history-strict', 'true');
  await expect(page.locator('.question-title')).toBeVisible();
  const before = await draft(page);
  await page.clock.fastForward(60 * 60 * 1000 + 5000);
  await saved(page);
  const data = await records(page),
    attempt = Object.values(data.attempts)[0];
  expect(Object.keys(data.attempts)).toHaveLength(1);
  expect(attempt.summary.attemptId).toBe(before.attemptId);
  expect(attempt.summary.endedAt).toBe(before.deadline);
  expect(attempt.summary.endReason).toBe('expired');
  expect(attempt.summary.feedbackMode).toBe('learning');
  await page.reload();
  await saved(page);
  expect(Object.keys((await records(page)).attempts)).toHaveLength(1);
});

test('response loss retries the same ID without another slot and permanent size failures keep the local result', async ({
  page,
  context,
}) => {
  await init(context);
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-history-drop-response', '1'));
  await submit(page);
  await expect(page.locator('.exam-archive-status[role=alert]')).toContainText(
    'Could not reach exam history'
  );
  const first = Object.keys((await records(page)).attempts)[0];
  await page
    .locator('.exam-archive-status')
    .getByRole('button', { name: 'Retry', exact: true })
    .click();
  await saved(page);
  expect(Object.keys((await records(page)).attempts)).toEqual([first]);
  await page.goto('./#/quiz/aws-aip-c01/exam?fresh=' + Date.now());
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-history-error:save', 'SIZE'));
  await submit(page);
  await expect(page.locator('.exam-archive-status[role=alert]')).toContainText('too large');
  await expect(
    page.locator('.exam-archive-status').getByRole('button', { name: 'Retry', exact: true })
  ).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
});

test('a full archive requests explicit deletion and a same-tab Retry succeeds without silent eviction', async ({
  page,
  context,
}) => {
  const seed = await seedAttempts(50);
  await init(context, { seed });
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await submit(page);
  await expect(page.locator('.exam-archive-status[role=alert]')).toContainText('history is full');
  const result = await draft(page);
  const second = await context.newPage();
  await second.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
  await second.goto('./#/history');
  await expect(second.getByText('50/50 saved exams', { exact: true })).toBeVisible();
  await second
    .locator('.history-attempt')
    .first()
    .getByRole('button', { name: 'Delete archive', exact: true })
    .click();
  await confirmDelete(second);
  await second.close();
  await page
    .locator('.exam-archive-status')
    .getByRole('button', { name: 'Retry', exact: true })
    .click();
  await saved(page);
  const data = await records(page);
  expect(Object.keys(data.attempts)).toHaveLength(50);
  expect(data.attempts[result.attemptId]).toBeTruthy();
  expect(
    Object.values(data.receipts).filter((receipt) => receipt.state === 'deleted')
  ).toHaveLength(1);
});

test('metadata pagination uses retained totals and delete Cancel/failure/focus remain predictable', async ({
  page,
  context,
}) => {
  await init(context, { seed: await seedAttempts(25) });
  await page.goto('./#/history');
  await expect(page.locator('.history-attempt')).toHaveCount(20);
  await expect(page.locator('.history-statistics')).toContainText('Attempts: 25');
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.locator('.history-attempt')).toHaveCount(5);
  await page.reload();
  await expect(page.locator('.history-attempt')).toHaveCount(5);
  await expect(page.locator('.history-statistics')).toContainText('Attempts: 25');
  const trigger = page
    .locator('.history-attempt')
    .first()
    .getByRole('button', { name: 'Delete archive', exact: true });
  await trigger.click();
  let modal = page.getByRole('dialog', { name: 'Delete this exam archive?', exact: true });
  await clickAfterUiMotion(modal.getByRole('button', { name: 'Cancel', exact: true }));
  await expect(trigger).toBeFocused();
  expect(Object.keys((await records(page)).attempts)).toHaveLength(25);
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-history-error:remove', 'PERMISSION'));
  await trigger.click();
  modal = page.getByRole('dialog', { name: 'Delete this exam archive?', exact: true });
  await clickAfterUiMotion(modal.getByRole('button', { name: 'Delete archive', exact: true }));
  await expect(modal.getByRole('alert')).toContainText('access was denied');
  expect(Object.keys((await records(page)).attempts)).toHaveLength(25);
  await page.evaluate(() => sessionStorage.removeItem('quiz-e2e-history-error:remove'));
  await confirmDelete(page);
  await expect(
    page.getByRole('heading', { name: 'Exam history', level: 1, exact: true })
  ).toBeFocused();
  expect(Object.keys((await records(page)).attempts)).toHaveLength(24);
});

test('guest, Practice and signed-in unsaved uploads never write history; sign-in does not migrate the guest result', async ({
  page,
  context,
}) => {
  await init(context, { signedIn: false });
  await page.goto('./#/quiz/aws-aip-c01/practice');
  await expect(page.locator('.question-title')).toBeVisible();
  expect(await calls(page)).toHaveLength(0);
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await submit(page);
  await expect(
    page.getByText('Sign in to archive future exams. This result stays in this tab.', {
      exact: true,
    })
  ).toBeVisible();
  expect(await calls(page)).toHaveLength(0);
  await page.getByRole('banner').getByRole('button', { name: 'Sign in', exact: true }).click();
  await clickAfterUiMotion(
    page
      .getByRole('dialog', { name: 'Sign in', exact: true })
      .getByRole('button', { name: 'Continue with Google', exact: true })
  );
  await expect(page.getByRole('button', { name: 'Start mock exam', exact: true })).toBeVisible();
  expect((await calls(page)).filter((call) => call.method === 'save')).toHaveLength(0);
  await page.goto('./#/my-quizzes');
  await page
    .locator('input[type=file]')
    .setInputFiles(
      fileURLToPath(new URL('../../public/examples/quiz-single.json', import.meta.url))
    );
  await page.getByRole('button', { name: 'Use this quiz', exact: true }).click();
  await page.getByText('Mock exam', { exact: true }).click();
  await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  await submit(page);
  await expect(
    page.getByText('Unsaved quiz results stay in this tab.', { exact: false })
  ).toBeVisible();
  expect((await calls(page)).filter((call) => call.method === 'save')).toHaveLength(0);
});

test('History menu respects active exam Cancel/Leave/Resume without changing identity or deadline', async ({
  page,
  context,
}) => {
  await init(context);
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await page.locator('.question-options input').first().check();
  const before = await draft(page),
    trigger = page.getByRole('button', { name: 'History learner', exact: true });
  async function enter() {
    await trigger.focus();
    await trigger.press('Enter');
    const item = page.getByRole('menuitem', { name: 'Exam history', exact: true });
    await item.focus();
    await item.press('Enter');
  }
  await enter();
  const guard = page.getByRole('dialog').filter({ hasText: 'Leave this exam?' });
  await clickAfterUiMotion(guard.getByRole('button', { name: 'Continue exam', exact: true }));
  await expect(trigger).toBeFocused();
  expect(await draft(page)).toEqual(before);
  await enter();
  await clickAfterUiMotion(guard.getByRole('button', { name: 'Leave exam', exact: true }));
  await expect(
    page.getByRole('heading', { name: 'Exam history', level: 1, exact: true })
  ).toBeVisible();
  expect(Object.keys((await records(page)).attempts)).toHaveLength(0);
  await page.goto('./#/quiz/aws-aip-c01?mode=exam');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  expect(await draft(page)).toEqual(before);
  await submit(page);
  await saved(page);
  expect(Object.keys((await records(page)).attempts)).toEqual([before.attemptId]);
});

test('archived answers/grade stay frozen when the source changes or its illustration disappears', async ({
  page,
  context,
}) => {
  const sourceQuestions = JSON.parse(fs.readFileSync('public/quiz/Anthropic/CCAR_P.json'));
  const source = examHistorySource({ kind: 'bank', id: 'anthropic-ccar-p' }, uid);
  const session = createExamSession(sourceQuestions, 2, 60, {
    now: 1000,
    random: () => 0.25,
    historyOwner: uid,
    historySource: source,
    captureHistory: true,
  });
  const attempt = await createHistoryAttempt(finishExam(session, 2000, true), uid, sourceQuestions);
  const payload = JSON.parse(attempt.snapshot.payload);
  payload.questions[0].imageUrl = 'archive-missing-fixture.png';
  payload.gradingVersion = 'quizmos-score-v2';
  payload.passed = true;
  attempt.summary.gradingVersion = payload.gradingVersion;
  attempt.summary.passed = true;
  attempt.snapshot.payload = JSON.stringify(payload);
  attempt.summary.payloadHash = await contentHash(attempt.snapshot.payload);
  attempt.snapshot.payloadHash = attempt.summary.payloadHash;
  const seed = {
    attempts: { [attempt.summary.attemptId]: attempt },
    receipts: {
      [attempt.summary.attemptId]: { state: 'saved', payloadHash: attempt.summary.payloadHash },
    },
    revision: 1,
  };
  await init(context, { seed });
  await page.route('**/quiz/Anthropic/CCAR_P.json', async (route) => {
    const response = await route.fetch(),
      json = await response.json();
    json[0].question = 'Changed source question';
    await route.fulfill({ response, json });
  });
  await page.route('**/archive-missing-fixture.png', (route) =>
    route.fulfill({ status: 404, body: 'missing' })
  );
  await page.goto('./#/history/' + attempt.summary.attemptId);
  await expect(page.locator('.history-source-status')).toContainText('source quiz changed');
  await expect(page.locator('.history-score')).toContainText('quizmos-score-v2');
  await expect(page.locator('.history-score .ant-tag')).toHaveText('Pass');
  await expect(page.locator('.question-title')).toContainText(
    payload.questions[0].question.split('\n')[0]
  );
  await expect(
    page.getByText('The original illustration is unavailable.', { exact: false })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explain', exact: true })).toHaveCount(0);
});

test('delayed saves/reads and sign-out/account changes cannot leak archived content to the next account', async ({
  page,
  context,
}) => {
  await init(context);
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-history-defer:save', '1'));
  await submit(page);
  await expect(page.getByText('Saving exam to history…', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'History learner', exact: true }).click();
  await clickAfterUiMotion(page.getByRole('menuitem', { name: 'Sign out', exact: true }));
  await clickAfterUiMotion(
    page
      .getByRole('dialog')
      .filter({ hasText: 'Sign out?' })
      .getByRole('button', { name: 'Sign out', exact: true })
  );
  await page.evaluate(() => {
    window.dispatchEvent(new Event('quiz-e2e-history-release:save'));
    window.dispatchEvent(
      new CustomEvent('quiz-e2e-auth-change', {
        detail: { uid: 'history-bob', displayName: 'Bob', emailVerified: true },
      })
    );
  });
  await page.goto('./#/history');
  await expect(page.locator('.history-attempt')).toHaveCount(0);
  await expect(page.getByText('No saved exam results yet.', { exact: false })).toBeVisible();
  await expect(page.locator('.exam-history-page')).not.toContainText('History learner');
});

test('history errors/empty state preserve library access and retry, with no private IO during auth loading', async ({
  page,
  context,
}) => {
  await init(context);
  await context.addInitScript(() => sessionStorage.setItem('quiz-e2e-defer-auth', '1'));
  await page.goto('./#/history');
  await expect(page.getByText('Loading exam history…', { exact: true })).toBeVisible();
  expect(await calls(page)).toHaveLength(0);
  await page.evaluate(() => {
    sessionStorage.setItem('quiz-e2e-history-error:state', 'PERMISSION');
    window.dispatchEvent(new Event('quiz-e2e-auth-ready'));
  });
  await expect(page.getByRole('alert')).toContainText('access was denied');
  await page.evaluate(() => sessionStorage.removeItem('quiz-e2e-history-error:state'));
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('No saved exam results yet.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Back to library', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
});

test('history list/review/delete fit both languages/themes and phone-to-landscape layouts', async ({
  page,
  context,
}, info) => {
  test.setTimeout(120000);
  const seed = await seedAttempts(1);
  await init(context, { seed });
  await page.goto('./#/history');
  const states = accountCases(info.project.name);
  if (info.project.name === 'phone')
    states.push({ width: 360, height: 800, language: 'en', theme: 'light' });
  for (const state of states) {
    await page.emulateMedia({
      reducedMotion: [390, 1280].includes(state.width) ? 'no-preference' : 'reduce',
    });
    await page.setViewportSize({ width: state.width, height: state.height });
    await page
      .getByRole('button', {
        name: state.language === 'vi' ? 'Tiếng Việt' : 'English',
        exact: true,
      })
      .click();
    if ((await page.locator('html').getAttribute('data-theme')) !== state.theme)
      await page.locator('.theme-toggle').click();
    const row = page.locator('.history-attempt');
    await expect(row).toBeVisible();
    for (const button of await page.locator('.exam-history-page button:visible').all())
      expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    const remove = row.getByRole('button', {
      name: state.language === 'vi' ? 'Xóa bản lưu' : 'Delete archive',
      exact: true,
    });
    expect(await contrastRatio(remove)).toBeGreaterThanOrEqual(4.5);
    expect(await contrastRatio(row.locator('.ant-tag'))).toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({
      path: info.outputPath(`history-list-${state.width}-${state.language}-${state.theme}.png`),
    });
    await remove.click();
    const dialog = page.getByRole('dialog', {
      name: state.language === 'vi' ? 'Xóa bản lưu bài thi này?' : 'Delete this exam archive?',
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`history-delete-${state.width}-${state.language}-${state.theme}.png`),
    });
    await clickAfterUiMotion(
      dialog.getByRole('button', { name: state.language === 'vi' ? 'Hủy' : 'Cancel', exact: true })
    );
    await expect(remove).toBeFocused();
    await row
      .getByRole('button', {
        name: state.language === 'vi' ? 'Xem lại kết quả' : 'Review saved result',
        exact: true,
      })
      .click();
    await expect(page.locator('.history-score')).toBeVisible();
    expect(
      (await page.locator('.archive-question-picker .ant-select').boundingBox()).height
    ).toBeGreaterThanOrEqual(44);
    if (state.width >= 768) {
      const score = await page.locator('.history-score .ant-card-body > div').boundingBox();
      const details = await page.locator('.history-score dl').boundingBox();
      expect(Math.abs(score.y - details.y)).toBeLessThan(2);
    }
    await page.locator('.history-score').screenshot({
      path: info.outputPath(`history-score-${state.width}-${state.language}-${state.theme}.png`),
    });
    await page.locator('.archive-answer-context').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({
      path: info.outputPath(`history-review-${state.width}-${state.language}-${state.theme}.png`),
    });
    await page
      .getByRole('button', {
        name: state.language === 'vi' ? 'Về lịch sử thi' : 'Back to history',
        exact: true,
      })
      .click();
  }
});
