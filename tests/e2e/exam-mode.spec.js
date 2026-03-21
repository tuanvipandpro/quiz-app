import { expect, test } from '@playwright/test';

test.describe('Exam Mode', () => {
  async function setupExam(page, examTime = 60) {
    await page.goto('/');
    
    // Open quiz selection
    await page.getByTestId('demo-quiz-card').click();
    
    // Select Test Quiz
    await page.getByTestId('quiz-select').click();
    await page.locator('text="Test Quiz (E2E)"').click();
    
    // Load quiz
    await page.getByTestId('load-selected-quiz').click();
    
    // Wait for quiz loaded
    await expect(page.getByTestId('loaded-quiz-summary')).toBeVisible();
    
    // Select exam time
    if (examTime === 120) {
      await page.getByTestId('exam-time-120').click();
    } else {
      await page.getByTestId('exam-time-60').click();
    }
    
    // Start exam mode
    await page.getByTestId('start-exam-mode').click();
    
    // Wait for exam to start
    await expect(page.getByTestId('exam-mode-screen')).toBeVisible();
  }

  test('should render exam mode with timer', async ({ page }) => {
    await setupExam(page);
    
    // Should show timer
    await expect(page.getByTestId('exam-timer-card')).toBeVisible();
    
    // Should show current question
    await expect(page.locator('text=/Question \\d+ of \\d+/')).toBeVisible();
  });

  test('should answer exam questions', async ({ page }) => {
    await setupExam(page);
    
    // Answer current question
    await page.getByTestId('answer-control-A').click();
    
    // Move to next question
    await page.getByTestId('exam-next-question').click();
    
    // Answer next question
    await page.getByTestId('answer-control-A').click();
  });

  test('should flag and unflag questions', async ({ page }) => {
    await setupExam(page);
    
    // Flag current question
    await page.getByTestId('exam-toggle-flag').click();
    
    // Button should show "Unflag"
    await expect(page.getByTestId('exam-toggle-flag')).toContainText('Unflag');
    
    // Move to next question
    await page.getByTestId('exam-next-question').click();
    
    // Go back
    await page.getByTestId('exam-previous-question').click();
    
    // Should still be flagged
    await expect(page.getByTestId('exam-toggle-flag')).toContainText('Unflag');
    
    // Unflag it
    await page.getByTestId('exam-toggle-flag').click();
    
    // Button should show "Flag"
    await expect(page.getByTestId('exam-toggle-flag')).toContainText('Flag');
  });

  test('should open review modal', async ({ page }) => {
    await setupExam(page);
    
    // Answer a few questions
    await page.getByTestId('answer-control-A').click();
    await page.getByTestId('exam-next-question').click();
    await page.getByTestId('answer-control-A').click();
    
    // Open review
    await page.getByTestId('exam-open-review').click();
    
    // Should show question grid items - check for first item in review
    await expect(page.getByTestId('exam-review-question-1')).toBeVisible({ timeout: 15000 });
    
    // Should be able to see multiple questions in grid
    await expect(page.getByTestId('exam-review-question-2')).toBeVisible();
  });

  test('should jump to question from review modal', async ({ page }) => {
    await setupExam(page);
    
    // Answer current question
    await page.getByTestId('answer-control-A').click();
    
    // Open review
    await page.getByTestId('exam-open-review').click();
    
    // Click on question 5 from review
    await page.getByTestId('exam-review-question-5').click({ timeout: 15000 });
    
    // We should be able to select answer at Q5
    await page.getByTestId('answer-control-A').click();
  });

  test('should submit exam', async ({ page }) => {
    await setupExam(page);
    
    // Answer some questions
    await page.getByTestId('answer-control-A').click();
    await page.getByTestId('exam-next-question').click();
    await page.getByTestId('answer-control-A').click();
    
    // Submit exam
    await page.getByTestId('exam-finish').click();
    
    // Click yes in confirmation - use broader selector
    await page.locator('button').filter({ hasText: /yes|submit/i }).first().click();
    
    // Wait for result screen button to appear - this indicates form rendered
    // Just wait a reasonable time for the Result component to render
    await page.waitForTimeout(5000);
    
    // Verify we can navigate - return button should be visible
    const returnBtn = page.getByTestId('exam-return-to-menu');
    await expect(returnBtn).toBeVisible({ timeout: 10000 });
  });

  test('should return to menu from exam result', async ({ page }) => {
    await setupExam(page);
    
    // Answer questions quickly
    await page.getByTestId('answer-control-A').click();
    await page.getByTestId('exam-next-question').click();
    await page.getByTestId('answer-control-A').click();
    
    // Submit
    await page.getByTestId('exam-finish').click();
    
    // Confirm submission
    await page.locator('button').filter({ hasText: /yes|submit/i }).first().click();
    
    // Wait for result render
    await page.waitForTimeout(5000);
    
    // Click return to menu
    const returnBtn = page.getByTestId('exam-return-to-menu');
    await expect(returnBtn).toBeVisible({ timeout: 10000 });
    await returnBtn.click();
    
    // Should return to mode selection
    await expect(page.getByTestId('quiz-mode-selection')).toBeVisible({ timeout: 10000 });
  });
});
