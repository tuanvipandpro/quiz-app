import { expect, test } from '@playwright/test';

test('renders the start screen', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('app-home-link')).toBeVisible();
  await expect(page.getByTestId('demo-quiz-card')).toBeVisible();
  await expect(page.getByTestId('upload-quiz-card')).toBeVisible();
  await expect(page.getByTestId('download-sample-quiz')).toBeVisible();
});
