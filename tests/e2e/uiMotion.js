export async function waitForUiMotion(locator) {
  await locator.evaluate(async (element) => {
    const region = element.closest('.ant-modal, .ant-dropdown, .ant-select-dropdown') || element;
    // Allow React effects to commit; frame count alone is not a readiness signal.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (;;) {
      const animations = new Set(region.getAnimations({ subtree: true }));
      const nodes = [region, ...region.querySelectorAll('[class]')];
      for (let parent = region.parentElement; parent; parent = parent.parentElement) {
        nodes.push(parent);
        for (const animation of parent.getAnimations()) animations.add(animation);
      }
      // rc-motion schedules prepare/start/active across multiple frames. During
      // preparation there may be no Web Animation yet, but the UI is not ready.
      const preparing = nodes.some(
        (node) =>
          node.getClientRects().length &&
          [...node.classList].some((name) =>
            /^ant-.+-(?:appear|enter|leave)(?:-(?:prepare|start|active))?$/.test(name)
          )
      );
      const running = [...animations].filter(
        (animation) =>
          (animation.playState === 'running' || animation.pending) &&
          Number.isFinite(animation.effect?.getComputedTiming().endTime)
      );
      if (!running.length && !preparing) return;
      // Re-query browser state each frame. Resize/replacement can retire CSS
      // transitions while a previously captured finished promise remains pending.
      // Neither a stale promise nor a fixed delay is a UI readiness signal.
      await new Promise(requestAnimationFrame);
    }
  });
}

export async function clickAfterUiMotion(locator) {
  await locator.click({ trial: true });
  await waitForUiMotion(locator);
  await locator.click();
}
