// Ledger v21 (api.md 190-196, D-105): a node's `timeline` key. The ledger never normalises: a dated node line holds a
// stored form, accepted by the schema and `eventProblems` alike; a habit form, a quarter or a number is refused by
// both; a day its month lacks is the code's to refuse (the schema's pattern can't say it); an app line carries no date.
// A format-20 ledger becomes 21 by a restamp: only `v` changes, and it reads as before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEDGER_FORMAT, TIMELINE_FORMS, eventProblems, readLedger, upgradeLines, validateView } from '#format';
import { fixtureLines } from '#format/testing';
import { LEDGER_EVENT_ID, schemaProblems } from '../server/schema.ts';
import { AGENT } from './schema-cases.ts';

type Rec = Record<string, unknown>;
const verdict = (e: Rec) => ({ schema: schemaProblems(LEDGER_EVENT_ID, e).length === 0, hand: eventProblems(e).length === 0 });
const node = (extra: Rec) => ({ ...AGENT, type: 'node', board: 'b', n: 1, ver: 1, node: { region: 'plan', kind: 'topic', title: 'T', ...extra } });

test('format 21: a dated node line in each stored form is accepted by both checks', () => {
  assert.ok(LEDGER_FORMAT >= 21);
  for (const at of [...TIMELINE_FORMS, '2024-02-29', '2026-12-31T23:59']) assert.deepEqual(verdict(node({ timeline: at })), { schema: true, hand: true }, at);
  assert.deepEqual(verdict(node({ timeline: '2026-10', icon: 'milestone', tone: 'amber' })), { schema: true, hand: true });
});

test('a form the write edge would normalise is refused in a ledger line: the ledger holds one spelling', () => {
  for (const at of ['2026-10-13T14:30:00Z', '2026-10-13 14:30', '2026-10-13t14:30', ' 2026', 2026, '2026-Q4', '2026-W42', '2026-10-13T14', '2026-13', '2026-10-13T24:00', null]) {
    assert.deepEqual(verdict(node({ timeline: at })), { schema: false, hand: false }, JSON.stringify(at));
  }
  assert.match(eventProblems(node({ timeline: '2026-Q4' })).join(), /^node\.timeline: a date in one of four forms/);
});

test('a day its month lacks: the schema\'s pattern takes it, the code refuses it, so the reader never stores it', () => {
  for (const at of ['2026-02-30', '2023-02-29', '2026-04-31']) assert.deepEqual(verdict(node({ timeline: at })), { schema: true, hand: false }, at);
});

test('an app line carries no date, in both checks and in a view', () => {
  const app = node({ kind: 'app', app: { id: 'counter' }, timeline: '2026-10' });
  assert.deepEqual(verdict(app), { schema: false, hand: false });
  assert.match(eventProblems(app).join(), /node\.timeline: an app card is a window with no header for a date/);
  const view = (n: Rec) => ({ format: 1, session: 'p', version: 1, title: 'P', regions: [{ id: 'r', title: 'R', mode: 'flow' }], nodes: [{ id: '1', n: 1, region: 'r', kind: 'topic', title: 'T', ...n }], links: [] });
  assert.deepEqual(validateView(view({ timeline: '2026-10-13T14:30' })), []);
  assert.match(validateView(view({ timeline: '2026-10-13T14:30Z' })).join(), /^nodes\[0\]\.timeline: a date/);
  assert.match(validateView(view({ kind: 'app', app: { id: 'counter' }, timeline: '2026' })).join(), /nodes\[0\]\.timeline: an app card/);
});

test('a format-20 ledger restamps to 21, line for line, only `v` changed, and reads the same', () => {
  const current = fixtureLines('gallery');
  const older = current.map((l) => l.replace(`{"v":${LEDGER_FORMAT},`, '{"v":20,'));
  assert.ok(older.every((l) => l.startsWith('{"v":20,')));
  const up = upgradeLines(older);
  assert.deepEqual([up.stops, up.newer, up.changed, up.byFormat], [[], [], older.length, { 20: older.length }]);
  assert.deepEqual(up.lines, current);
  assert.deepEqual(readLedger(up.lines).problems, []);
});
