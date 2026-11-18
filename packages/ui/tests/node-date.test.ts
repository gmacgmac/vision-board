// A dated node's header (D-105 4, PLAN decision 16, call 10): `timelineLabel` from the precision written, month first,
// no year on a day or a time, the time as written; the full form for assistive technology; the value as `datetime`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datedOf, timelineLabel } from '../src/index.ts';

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

test('a year is itself, short and in full', () => {
  assert.deepEqual(timelineLabel('2026'), { short: '2026', full: '2026', datetime: '2026' });
});

test('every month, in each of the three forms that name one', () => {
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    assert.deepEqual(timelineLabel(`2026-${mm}`), { short: `${SHORT[m - 1]} 2026`, full: `${LONG[m - 1]} 2026`, datetime: `2026-${mm}` });
    assert.deepEqual(timelineLabel(`2027-${mm}-09`), { short: `${SHORT[m - 1]} 9`, full: `9 ${LONG[m - 1]} 2027`, datetime: `2027-${mm}-09` });
    assert.deepEqual(timelineLabel(`2026-${mm}-13T14:30`),
      { short: `${SHORT[m - 1]} 13 · 14:30`, full: `13 ${LONG[m - 1]} 2026, 14:30`, datetime: `2026-${mm}-13T14:30` });
  }
});

test('a day drops its leading zero; a time keeps its digits as written (no zone, decision 3)', () => {
  assert.equal(timelineLabel('2026-12-01').short, 'Dec 1');
  assert.equal(timelineLabel('2026-12-31').short, 'Dec 31');
  assert.deepEqual(timelineLabel('2026-12-01T00:05'), { short: 'Dec 1 · 00:05', full: '1 December 2026, 00:05', datetime: '2026-12-01T00:05' });
});

test('datedOf: a stored date on any kind but an app card; nothing else counts', () => {
  assert.equal(datedOf({ kind: 'question', timeline: '2026-10-13' }), '2026-10-13');
  assert.equal(datedOf({ kind: 'note', timeline: '2026' }), '2026');
  assert.equal(datedOf({ kind: 'app', timeline: '2026-10-13' }), undefined, 'T_01 refuses one on an app card; the node ignores it');
  for (const bad of [undefined, '', '2026-Q4', '2026-02-30', '2026-10-13T14', 2026]) assert.equal(datedOf({ kind: 'topic', timeline: bad }), undefined, String(bad));
});
