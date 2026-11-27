import test from 'node:test';
import assert from 'node:assert/strict';
import { taipeiDayStart, formatReport } from './goatcounter-daily.mjs';

test('yesterday is a Taipei day, in UTC', () => {
  // 09:00 in Taipei on 11-27 is 01:00 UTC
  const now = new Date('2026-11-27T01:00:00Z');
  assert.equal(taipeiDayStart(now, 0).toISOString(), '2026-11-26T16:00:00.000Z');
  assert.equal(taipeiDayStart(now, 1).toISOString(), '2026-11-25T16:00:00.000Z');
  // 23:30 UTC on 11-26 is already 11-27 in Taipei
  assert.equal(taipeiDayStart(new Date('2026-11-26T23:30:00Z'), 0).toISOString(), '2026-11-26T16:00:00.000Z');
});

test('the report lists the top pages and referrers', () => {
  const text = formatReport({
    day: '2026-11-26',
    total: 42,
    previous: 30,
    hits: [
      { path: '/a/', title: '文章 A', count: 20 },
      { path: 'click', event: true, count: 3 },
      { path: '/b/', title: '', count: 5 },
    ],
    refs: [{ name: 'Google', count: 10 }, { name: '', count: 4 }],
  });
  assert.match(text, /2026-11-26 瀏覽數：42\*\*（前一天 30，\+12）/);
  assert.match(text, /- 文章 A（20）/);
  assert.match(text, /- \/b\/（5）/);
  assert.doesNotMatch(text, /click/);
  assert.match(text, /- 直接開啟（4）/);
});
