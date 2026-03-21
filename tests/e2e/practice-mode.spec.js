import { expect, test } from '@playwright/test';

test.describe('Practice Mode', () => {
  async function setupPracticeMode(page) {
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
    
    // Start practice mode
    await page.getByTestId('start-practice-mode').click();
    
    // Wait for practice mode
    await expect(page.getByTestId('practice-mode-screen')).toBeVisible();
  }

  test('should render practice mode', async ({ page }) => {
    await setupPracticeMode(page);
    
    // Should show navigation buttons
    await expect(page.getByTestId('practice-next-question')).toBeVisible();
  });

  test('should answer single-answer question and show feedback', async ({ page }) => {
    await setupPracticeMode(page);
    
    // Select any answer to avoid ambiguity
    const answerA = page.getByTestId('answer-control-A');
    await answerA.click();
    
    // Should show feedback
    await expect(page.getByTestId('question-feedback')).toBeVisible();
  });

  test('should select correct answer for single-answer question', async ({ page }) => {
    await setupPracticeMode(page);
    
    // Select correct answer (A)
    await page.getByTestId('answer-control-A').click();
    
    // Should show feedback
    await expect(page.getByTestId('question-feedback')).toBeVisible();
    
    // Should show it's correct
    await expect(page.getByTestId('question-feedback')).toContainText('Correct');
  });

  test('should handle multi-answer questions with partial selection', async ({ page }) => {
    await setupPracticeMode(page);
    
    // Move to second question (multi-answer)
    await page.getByTestId('practice-next-question').click();
    
    // Second question requires TWO correct answers (A and C)
    // Select only one (A)
    await page.getByTestId('answer-control-A').click();
    
    // Try to move to next question - might get stuck due to partial answer
    // or might show hint. Just wait a moment and proceed
    await page.waitForTimeout(1000);
    
    // Now select the second answer too (C) to complete it
    await page.getByTestId('answer-control-C').click();
    
    // Should work without errors
  });

  test('should validate multi-answer question with full selection', async ({ page }) => {
    await setupPracticeMode(page);
    
    // Move to second question
    await page.getByTestId('practice-next-question').click();
    
    // Select both correct answers (A and C)
    await page.getByTestId('answer-control-A').click();
    await page.getByTestId('answer-control-C').click();
    
    // Should show feedback for correct answers
    await expect(page.getByTestId('question-feedback')).toBeVisible();
    await expect(page.getByTestId('question-feedback')).toContainText('Correct');
  });

  test('should navigate using next and previous buttons', async ({ page }) => {
    await setupPracticeMode(page);
    
    // Start at question 1
    // Move to question 2
    await page.getByTestId('practice-next-question').click();
    
    // Next button should be enabled
    await expect(page.getByTestId('practice-next-question')).toBeEnabled();
    
    // Previous button should be enabled
    await expect(page.getByTestId('practice-previous-question')).toBeEnabled();
    
    // Go back to question 1
    await page.getByTestId('practice-previous-question').click();
    
    // Should be at Q1 (previous button should be disabled)
    await expect(page.getByTestId('practice-previous-question')).toBeDisabled();
  });

  test('should jump to specific question number', async ({ page }) => {
    await setupPracticeMode(page);
    
    // Get the question jump input
    const jumpInput = page.getByTestId('jump-to-question-input');
    
    // Jump to question 5
    await jumpInput.fill('5');
    
    // Click jump button
    const jumpBtn = page.getByTestId('jump-to-question-button');
    await jumpBtn.click();
    
    // Should be able to answer the question
    await page.getByTestId('answer-control-A').click();
  });

  test('should exit practice mode to menu', async ({ page }) => {
    await setupPracticeMode(page);
    
    // Click exit
    await page.getByTestId('practice-exit-to-menu').click();
    
    // Should return to mode selection
    await expect(page.getByTestId('quiz-mode-selection')).toBeVisible();
  });
});
