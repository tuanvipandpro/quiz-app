import { waitForUiMotion } from './uiMotion.js';

const rgba = (color) => {
  if (color === 'transparent') return [0, 0, 0, 0];
  if (!/^rgba?\(/.test(color)) throw new Error(`Unsupported computed color: ${color}`);
  const values = color.match(/[\d.]+/g).map(Number);
  return [values[0], values[1], values[2], values[3] ?? 1];
};
const over = (foreground, background) => [
  ...foreground
    .slice(0, 3)
    .map((value, index) => value * foreground[3] + background[index] * (1 - foreground[3])),
  1,
];
const luminance = (color) => {
  const rgb = color.slice(0, 3).map((value) => {
    value /= 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};

export function contrastFromColors(foreground, backgrounds) {
  let background = [255, 255, 255, 1];
  for (const color of [...backgrounds].reverse()) background = over(rgba(color), background);
  const text = over(rgba(foreground), background);
  const a = luminance(text),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export async function contrastRatio(locator) {
  await waitForUiMotion(locator);
  const colors = await locator.evaluate((element) => {
    const backgrounds = [];
    for (let current = element; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (Number(style.opacity) !== 1)
        throw new Error('Contrast measurement requires settled, opaque groups.');
      backgrounds.push(style.backgroundColor);
    }
    return { foreground: getComputedStyle(element).color, backgrounds };
  });
  return contrastFromColors(colors.foreground, colors.backgrounds);
}
