// A moment in the person's own clock (node-time.ts, card-polish FE_02): "Today" and "Yesterday" by the
// person's calendar day, else the version dropdown's words. Dates are built in local time, so the test
// holds in any time zone; the expected words come from the same locale calls, never written out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fullTime, noteTime, versionTime } from '../src/index.ts';

const at = (d: number, h: number, m: number): string => new Date(2026, 9, d, h, m).toISOString();
const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

test('noteTime: today and yesterday by the calendar day, else the date and time as versionTime gives them', () => {
  const now = new Date(2026, 9, 19, 0, 30);
  assert.equal(noteTime(at(19, 0, 5), now), `Today ${clock(at(19, 0, 5))}`);
  assert.equal(noteTime(at(18, 23, 59), now), `Yesterday ${clock(at(18, 23, 59))}`, 'a few minutes ago, but yesterday');
  assert.equal(noteTime(at(18, 0, 0), now), `Yesterday ${clock(at(18, 0, 0))}`);
  assert.equal(noteTime(at(17, 23, 59), now), versionTime(at(17, 23, 59)));
  assert.equal(noteTime(at(1, 9, 10), new Date(2026, 9, 1, 23, 0)), `Today ${clock(at(1, 9, 10))}`);
  // Yesterday across a month's end.
  assert.equal(noteTime(new Date(2026, 8, 30, 18, 10).toISOString(), new Date(2026, 9, 1, 8, 0)), `Yesterday ${clock(new Date(2026, 8, 30, 18, 10).toISOString())}`);
});

test('versionTime and fullTime: the month and day with the time, and the whole date for a title', () => {
  const iso = at(18, 9, 10);
  assert.equal(versionTime(iso), new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
  assert.equal(fullTime(iso), new Date(iso).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }));
  assert.ok(fullTime(iso).includes('2026'), 'the year is in the title');
});
