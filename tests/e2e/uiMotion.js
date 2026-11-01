export async function waitForUiMotion(locator) {
  await locator.evaluate(async (element) => {
    // Let the opening/theme-change frame register its CSS transitions first.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (;;) {
      const animations = new Set(element.getAnimations({ subtree: true }));
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        for (const animation of parent.getAnimations()) animations.add(animation);
      }
      const running = [...animations].filter(
        (animation) =>
          animation.playState === 'running' &&
          Number.isFinite(animation.effect?.getComputedTiming().endTime)
      );
      if (!running.length) return;
      // A cancelled transition can be replaced; collect the active ones again.
      await Promise.all(running.map((animation) => animation.finished.catch(() => undefined)));
    }
  });
}

export async function clickAfterUiMotion(locator) {
  await waitForUiMotion(locator);
  await locator.click();
}
