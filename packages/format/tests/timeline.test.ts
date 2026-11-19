// A node's `timeline` key (D-105, api.md 190-196): the four stored forms, a model's habits normalised to one spelling
// without changing the precision or the time digits, everything else refused; the order every timeline is drawn in;
// and `common.schema.json` `$defs.timeline` held to `isTimeline` over the same table, as node-look.test.ts holds tone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA_DIR } from '../src/files.ts';
import {
  TIMELINE_FORMS, TIMELINE_MAX, TIMELINE_PATTERN, compareTimeline, isTimeline, normaliseTimeline, sortByTimeline,
  timelinePrecision, timelineProblems, timelineYear,
} from '../src/index.ts';

const KEPT = ['2026', '2026-10', '2026-10-13', '2026-10-13T14:30', '2024-02-29', '2026-12-31T23:59', '2000-02-29'];

/** A model's habit and the one spelling it is stored as (decision 2): the time digits as written, never converted. */
const NORMALISED: [unknown, string][] = [
  ['2026-10-13T14:30:00Z', '2026-10-13T14:30'],
  ['2026-10-13T14:30:45.123+02:00', '2026-10-13T14:30'],
  ['2026-10-13T14:30-0500', '2026-10-13T14:30'],
  ['2026-10-13T14:30+05', '2026-10-13T14:30'],
  ['2026-10-13 14:30', '2026-10-13T14:30'],
  ['2026-10-13t14:30z', '2026-10-13T14:30'],
  ['2026-10-13T23:59:59.999-12:00', '2026-10-13T23:59'],
  [' 2026-10 ', '2026-10'],
  ['\t2026-10-13\n', '2026-10-13'],
  [2026, '2026'],
  [1000, '1000'],
  [9999, '9999'],
];

const REFUSED: unknown[] = [
  '2026-Q4', 'Q4 2026', '2026-W42', '2026-W42-1', 'next week', 'Oct 2026', '2026-10-13T14', '2026-10-13T24:00',
  '2026-02-30', '2023-02-29', '1900-02-29', '2026-04-31', '2026-13', '2026-00', '2026-10-00', '2026-10-13T14:60',
  '26-10-13', '20261013', '2026-1-3', '2026-10-13T14:30:00+25:00', '2026-10-13T14:30+0560', '2026-10-13T14:30:61',
  '2026-10-13Z', '2026Z', '2026-10-13T', '2026-10-13  14:30', '2026-10-13T14:30 Z', '+2026', '२०२६',
  26, 2026.5, 99999, 999, -2026, true, null, undefined, '', '   ', 'x'.repeat(41), ['2026'], { year: 2026 },
];

test('the four forms: each kept as it is, and named in order of precision', () => {
  assert.deepEqual(TIMELINE_FORMS, ['2026', '2026-10', '2026-10-13', '2026-10-13T14:30']);
  for (const v of [...TIMELINE_FORMS, ...KEPT]) {
    assert.ok(isTimeline(v), v);
    assert.equal(normaliseTimeline(v), v, v);
  }
});

test('a model\'s habits are stored in one spelling, the precision and the time digits as written', () => {
  for (const [raw, stored] of NORMALISED) assert.equal(normaliseTimeline(raw), stored, JSON.stringify(raw));
  for (const [, stored] of NORMALISED) assert.ok(isTimeline(stored), stored);
});

test('anything else is refused: quarters, weeks, words, an hour alone, impossible dates, other shapes', () => {
  for (const raw of REFUSED) {
    assert.equal(normaliseTimeline(raw), undefined, JSON.stringify(raw));
    assert.ok(!isTimeline(raw), JSON.stringify(raw));
  }
  assert.equal(TIMELINE_MAX, 40);
  assert.equal(normaliseTimeline(`${'2026-10-13T14:30:00.000000000000000'}Z`.padEnd(40, ' ')), '2026-10-13T14:30', 'at 40 characters');
});

test('a normalised value never gains precision, and normalising twice changes nothing', () => {
  for (const [raw] of NORMALISED) {
    const once = normaliseTimeline(raw)!;
    assert.equal(normaliseTimeline(once), once);
  }
  assert.equal(normaliseTimeline('2026-10-13Z'), undefined, 'a zone on a date alone is refused, never read as a time');
  assert.equal(normaliseTimeline('2026'.padStart(41, ' ')), undefined, 'over 40 characters as sent, spaces included');
});

test('precision and year of each form', () => {
  assert.deepEqual(TIMELINE_FORMS.map(timelinePrecision), ['year', 'month', 'day', 'minute']);
  assert.deepEqual(TIMELINE_FORMS.map(timelineYear), ['2026', '2026', '2026', '2026']);
  assert.equal(timelineYear('1999-12-31T23:59'), '1999');
});

test('order: by start, coarser first at the same start, 0 only for equal values', () => {
  const inOrder = ['2026', '2026-01', '2026-01-01', '2026-01-01T00:00', '2026-01-01T09:00', '2026-01-02', '2026-10', '2027'];
  for (let i = 0; i < inOrder.length; i += 1) {
    for (let j = 0; j < inOrder.length; j += 1) {
      assert.equal(Math.sign(compareTimeline(inOrder[i]!, inOrder[j]!)), Math.sign(i - j), `${inOrder[i]} vs ${inOrder[j]}`);
    }
  }
  const shuffled = [inOrder[5], inOrder[0], inOrder[7], inOrder[3], inOrder[1], inOrder[6], inOrder[4], inOrder[2]] as string[];
  assert.deepEqual([...shuffled].sort(compareTimeline), inOrder);
});

test('sortByTimeline: stable by date, then card number, then input order; the input is never changed', () => {
  const nodes = [
    { id: 'a', timeline: '2026-11-03', n: 7 },
    { id: 'b', timeline: '2026-11', n: 9 },
    { id: 'c', timeline: '2026-11-03', n: 2 },
    { id: 'd', timeline: '2026-11-03' },
    { id: 'e', timeline: '2026-11-03' },
    { id: 'f', timeline: '2026-11-03T09:00', n: 1 },
  ];
  const before = JSON.stringify(nodes);
  assert.deepEqual(sortByTimeline(nodes).map((x) => x.id), ['b', 'c', 'a', 'd', 'e', 'f']);
  assert.equal(JSON.stringify(nodes), before);
});

test('timelineProblems: the stored form only, its words naming the field and the four forms', () => {
  const problems = (v: unknown) => { const p: string[] = []; timelineProblems(v, 'node.timeline', p); return p; };
  for (const v of KEPT) assert.deepEqual(problems(v), [], v);
  for (const [raw] of NORMALISED) if (typeof raw !== 'string' || raw !== normaliseTimeline(raw)) assert.equal(problems(raw).length, 1, JSON.stringify(raw));
  const [words] = problems('2026-Q4');
  assert.match(words!, /^node\.timeline: /);
  for (const form of TIMELINE_FORMS) assert.ok(words!.includes(`\`${form}\``), form);
});

test('the schema twin: common.schema.json $defs.timeline is the stored pattern; the calendar check is the code\'s', () => {
  const common = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, 'common.schema.json'), 'utf8'));
  const def = common.$defs.timeline;
  assert.equal(def.type, 'string');
  assert.equal(def.pattern, TIMELINE_PATTERN.source);
  for (const form of TIMELINE_FORMS) assert.ok(def.description.includes(`\`${form}\``), form);
  const schema = new RegExp(def.pattern, 'u');
  // Shapes the pattern takes and the calendar refuses: a day the month does not have.
  const calendarOnly = new Set(['2026-02-30', '2023-02-29', '1900-02-29', '2026-04-31']);
  const table = [...KEPT, ...NORMALISED.flatMap(([raw, stored]) => [raw, stored]), ...REFUSED];
  for (const v of table) {
    const shaped = typeof v === 'string' && schema.test(v);
    assert.equal(shaped, isTimeline(v) || calendarOnly.has(v as string), JSON.stringify(v));
  }
});
