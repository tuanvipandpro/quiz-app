import { test, expect } from '@playwright/test';
import { waitForUiMotion } from './uiMotion.js';

test('UI measurement includes preparation before rc-motion starts its CSS transition', async ({
  page,
}) => {
  await page.setContent(`
    <style>
      #surface { background-color: rgb(255, 255, 255); transition: background-color 200ms linear; }
      #sample { color: rgb(0, 0, 0); transition: color 150ms linear; }
    </style>
    <div id="surface"><button id="sample">Measure</button></div>
  `);
  const sample = page.locator('#sample');
  await sample.evaluate((element) => {
    const surface = element.parentElement;
    getComputedStyle(element).color;
    getComputedStyle(surface).backgroundColor;
    element.classList.add('ant-test-enter', 'ant-test-enter-prepare');
    surface.addEventListener('transitionend', (event) => {
      if (event.target === surface && event.propertyName === 'background-color') {
        element.classList.remove('ant-test-enter', 'ant-test-enter-active');
      }
    });
    let frames = 0;
    const prepare = () => {
      if (++frames < 6) {
        requestAnimationFrame(prepare);
        return;
      }
      element.classList.replace('ant-test-enter-prepare', 'ant-test-enter-active');
      element.style.color = 'rgb(255, 0, 0)';
      surface.style.backgroundColor = 'rgb(0, 0, 0)';
    };
    requestAnimationFrame(prepare);
  });

  await waitForUiMotion(sample);
  expect(await sample.evaluate((element) => getComputedStyle(element).color)).toBe(
    'rgb(255, 0, 0)'
  );
  expect(await sample.getAttribute('class')).not.toContain('ant-test-enter');
});

test('UI measurement waits for a pending finite transition without waiting for infinite decoration', async ({
  page,
}) => {
  await page.setContent(`
    <style>
      #surface { background-color: rgb(255, 255, 255); transition: background-color 600ms linear; }
      #sample { color: rgb(0, 0, 0); transition: color 500ms linear; }
      #sample span { display: inline-block; animation: spin 200ms linear infinite; }
      #feedback { height: 10px; transition: height 700ms linear; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
    <div id="surface" class="ant-modal"><div id="feedback"></div><button id="sample"><span aria-hidden="true">*</span>Measure</button></div>
  `);
  const sample = page.locator('#sample');
  await sample.evaluate((element) => {
    getComputedStyle(element).color;
    getComputedStyle(element.parentElement).backgroundColor;
    requestAnimationFrame(() => {
      element.style.color = 'rgb(255, 0, 0)';
      element.parentElement.style.backgroundColor = 'rgb(0, 0, 0)';
      element.parentElement.querySelector('#feedback').style.height = '30px';
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
    await page.locator('#feedback').evaluate((element) => getComputedStyle(element).height)
  ).toBe('30px');
  expect(
    await sample.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .some((animation) => animation.effect.getComputedTiming().endTime === Infinity)
    )
  ).toBe(true);
});
