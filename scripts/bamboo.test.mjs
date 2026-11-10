import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROVES, culmPoints, feel } from '../src/lib/bamboo.mjs';

const tip = (wind) => {
  const c = GROVES.front[3];
  const pts = culmPoints(c, feel(...wind), 0, 1, true);
  return pts[pts.length - 1][0] - culmPoints(c, feel(0, 0, wind[2]), 0, 1, true).at(-1)[0];
};

test('the bamboo bends downwind: left in an east wind, right in a west wind', () => {
  assert.ok(tip([40, 40, 90]) < -10);
  assert.ok(tip([40, 40, 270]) > 10);
});

test('a stronger wind bends it further', () => {
  assert.ok(Math.abs(tip([50, 50, 90])) > Math.abs(tip([20, 20, 90])));
});

test('a calm hardly bends it, and a gale stops growing past 1.3', () => {
  assert.ok(Math.abs(tip([2, 2, 90])) < 1);
  assert.equal(feel(200, 200, 90).k, 1.3);
});

test('the grove is drawn the same on every build', async () => {
  const again = await import('../src/lib/bamboo.mjs?again');
  assert.deepEqual(again.GROVES, GROVES);
});
