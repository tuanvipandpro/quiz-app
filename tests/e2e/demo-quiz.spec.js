import { expect, test } from '@playwright/test';

test.describe('Demo Quiz Loading', () => {
  test('should open quiz selection screen from start page', async ({ page }) => {
    await page.goto('/');
    
    // Click on demo quiz card
    await page.getByTestId('demo-quiz-card').click();
    
    // Should see quiz selection screen
    await expect(page.getByTestId('quiz-select')).toBeVisible();
  });

  test('should load selected demo quiz successfully', async ({ page }) => {
    await page.goto('/');
    
    // Open demo quiz selection
    await page.getByTestId('demo-quiz-card').click();
    
    // Select first available quiz (Test Quiz)
    await page.getByTestId('quiz-select').click();
    await page.locator('div[class*="ant-select-item"]').filter({ hasText: 'Test Quiz' }).first().click();
    
    // Load the selected quiz
    await page.getByTestId('load-selected-quiz').click();
    
    // Should see quiz loaded message
    await expect(page.getByTestId('loaded-quiz-summary')).toBeVisible();
    
    // Should show quiz mode selection
    await expect(page.getByTestId('quiz-mode-selection')).toBeVisible();
  });

  test('should go back from quiz selection', async ({ page }) => {
    await page.goto('/');
    
    // Open demo quiz selection
    await page.getByTestId('demo-quiz-card').click();
    
    // Go back
    await page.getByTestId('back-from-quiz-selection').click();
    
    // Should return to start screen
    await expect(page.getByTestId('demo-quiz-card')).toBeVisible();
    await expect(page.getByTestId('quiz-select')).not.toBeVisible();
  });
});
