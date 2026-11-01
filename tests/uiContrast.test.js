import assert from 'node:assert/strict';
import test from 'node:test';
import { contrastFromColors } from './e2e/uiContrast.js';

const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001);

test('opaque black on white has the reference 21:1 contrast', () => {
  closeTo(contrastFromColors('rgb(0, 0, 0)', ['rgb(255, 255, 255)']), 21);
});
test('translucent text is composited rather than treated as opaque black', () => {
  closeTo(contrastFromColors('rgba(0, 0, 0, 0.25)', ['rgb(255, 255, 255)']), 1.8339920877);
});
test('translucent backgrounds are composited over their ancestors', () => {
  closeTo(
    contrastFromColors('rgb(0, 0, 0)', ['rgba(255, 255, 255, 0.5)', 'rgb(0, 0, 0)']),
    5.2808228096
  );
});
test('fully transparent layers preserve existing solid danger-token measurements', () => {
  closeTo(
    contrastFromColors('rgb(161, 43, 56)', ['rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)']),
    7.196540024
  );
});
