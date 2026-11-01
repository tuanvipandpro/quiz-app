import { test, expect } from '@playwright/test';
import { waitForUiMotion } from './uiMotion.js';

test('UI measurement waits for a pending finite transition without waiting for infinite decoration', async ({
  page,
}) => {
  await page.setContent(`
    <style>
      #surface { background-color: rgb(255, 255, 255); transition: background-color 600ms linear; }
      #sample { color: rgb(0, 0, 0); transition: color 500ms linear; }
      #sample span { display: inline-block; animation: spin 200ms linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
    <div id="surface"><button id="sample"><span aria-hidden="true">*</span>Measure</button></div>
  `);
  const sample = page.locator('#sample');
  await sample.evaluate((element) => {
    getComputedStyle(element).color;
    getComputedStyle(element.parentElement).backgroundColor;
    requestAnimationFrame(() => {
      element.style.color = 'rgb(255, 0, 0)';
      element.parentElement.style.backgroundColor = 'rgb(0, 0, 0)';
    });
  });

  await waitForUiMotion(sample);
  expect(await sample.evaluate((element) => getComputedStyle(element).color)).toBe(
    'rgb(255, 0, 0)'
  );
  expect(
    await sample.evaluate((element) => getComputedStyle(element.parentElement).backgroundColor)
  ).toBe('rgb(0, 0, 0)');
  expect(
    await sample.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .some((animation) => animation.effect.getComputedTiming().endTime === Infinity)
    )
  ).toBe(true);
});
