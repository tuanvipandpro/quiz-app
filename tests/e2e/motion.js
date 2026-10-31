import { expect } from '@playwright/test';

// Measure and interact with the settled UI, not an intermediate CSS transform/color.
// This observes browser animation state; it neither disables motion nor sleeps.
export async function settleMotion(locator) {
  await expect
    .poll(
      () =>
        locator.evaluate((element) => {
          const animations = element.getAnimations({ subtree: true });
          for (let parent = element.parentElement; parent; parent = parent.parentElement)
            animations.push(...parent.getAnimations());
          return animations.some(
            (animation) =>
              (animation.playState === 'running' || animation.pending) &&
              animation.effect?.getComputedTiming().iterations !== Infinity
          );
        }),
      { message: 'finite UI animations have settled' }
    )
    .toBe(false);
}

export async function selectMenuItem(page, name) {
  const item = page.getByRole('menuitem', { name, exact: true });
  await expect(item).toBeVisible();
  await settleMotion(item);
  await item.click();
}
