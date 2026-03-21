import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Upload Quiz', () => {
  test('should upload valid quiz JSON file', async ({ page }) => {
    await page.goto('/');
    
    // Click upload quiz card
    await page.getByTestId('upload-quiz-card').click();
    
    // Setup file upload
    const fixtureFile = path.join(process.cwd(), 'tests/fixtures/test-quiz.json');
    
    // Upload file via Ant Design Upload
    await page.getByTestId('upload-quiz').setInputFiles(fixtureFile);
    
    // Wait a bit for file to be processed
    await page.waitForTimeout(1000);
    
    // Should see quiz loaded message
    await expect(page.getByTestId('loaded-quiz-summary')).toBeVisible({ timeout: 10000 });
    
    // Should use the filename in the summary
    await expect(page.getByTestId('loaded-quiz-summary')).toContainText('Loaded');
    await expect(page.getByTestId('loaded-quiz-summary')).toContainText('questions');
  });

  test('should reject non-JSON file', async ({ page }) => {
    await page.goto('/');
    
    // Click upload quiz card
    await page.getByTestId('upload-quiz-card').click();
    
    // Create a temporary text file
    const tempFile = path.join(process.cwd(), 'tests/fixtures/not-quiz.txt');
    fs.writeFileSync(tempFile, 'This is not a JSON file');
    
    try {
      // Try to upload text file
      await page.getByTestId('upload-quiz').setInputFiles(tempFile);
      
      // Wait for error message
      await page.waitForTimeout(500);
      
      // Should show error message about file type
      await expect(page.locator('text=/can only upload JSON/i')).toBeVisible();
      
      // Should not load quiz
      await expect(page.getByTestId('loaded-quiz-summary')).not.toBeVisible();
    } finally {
      // Cleanup
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });

  test('should reject invalid JSON structure', async ({ page }) => {
    await page.goto('/');
    
    // Click upload quiz card
    await page.getByTestId('upload-quiz-card').click();
    
    // Create a file with invalid JSON structure (not an array)
    const tempFile = path.join(process.cwd(), 'tests/fixtures/invalid-structure.json');
    fs.writeFileSync(tempFile, JSON.stringify({ questions: [] }));
    
    try {
      // Upload invalid file
      await page.getByTestId('upload-quiz').setInputFiles(tempFile);
      
      // Wait for error message
      await page.waitForTimeout(500);
      
      // Should show error message about array requirement
      await expect(page.locator('text=/must contain an array/i')).toBeVisible();
      
      // Should not load quiz
      await expect(page.getByTestId('loaded-quiz-summary')).not.toBeVisible();
    } finally {
      // Cleanup
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });

  test('should reject JSON missing required fields', async ({ page, context }) => {
    // Listen for dialog/alert
    let alertMessage = '';
    context.on('dialog', dialog => {
      alertMessage = dialog.message();
      dialog.dismiss();
    });
    
    await page.goto('/');
    
    // Click upload quiz card
    await page.getByTestId('upload-quiz-card').click();
    
    // Create file missing required fields
    const tempFile = path.join(process.cwd(), 'tests/fixtures/missing-fields.json');
    const invalidQuiz = [
      {
        id: '1',
        question: 'Test question'
        // Missing: options, answer
      }
    ];
    fs.writeFileSync(tempFile, JSON.stringify(invalidQuiz));
    
    try {
      // Upload invalid file
      await page.getByTestId('upload-quiz').setInputFiles(tempFile);
      
      // Wait for error message
      await page.waitForTimeout(500);
      
      // Should show error message about missing fields
      await expect(page.locator('text=/missing required fields/i')).toBeVisible();
      
      // Should not load quiz
      await expect(page.getByTestId('loaded-quiz-summary')).not.toBeVisible();
    } finally {
      // Cleanup
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });

  test('should upload multiple files', async ({ page }) => {
    await page.goto('/');
    
    // Upload first file
    const fixtureFile = path.join(process.cwd(), 'tests/fixtures/test-quiz.json');
    await page.getByTestId('upload-quiz').setInputFiles(fixtureFile);
    
    // Wait for file to load
    await expect(page.getByTestId('loaded-quiz-summary')).toBeVisible({ timeout: 10000 });
    
    // Verify the quiz is loaded
    await expect(page.getByTestId('loaded-quiz-summary')).toContainText('Loaded');
  });
});
