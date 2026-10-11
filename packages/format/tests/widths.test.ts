// A container's card widths (field-report batch 3 ruling 5, api.md 132): defined once by mode, and
// the person's choice wins over the container's own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_WIDTHS, MODES, readLedger, widthsOf } from '../src/index.ts';

test('every mode has its default: match for grid and column, own for the rest', () => {
  assert.deepEqual(Object.keys(DEFAULT_WIDTHS).sort(), [...MODES].sort());
  assert.deepEqual(MODES.filter((m) => DEFAULT_WIDTHS[m] === 'match'), ['grid', 'column']);
});

test('widthsOf: the person\'s choice, then the container\'s, then the mode\'s default', () => {
  assert.equal(widthsOf('grid'), 'match');
  assert.equal(widthsOf('lanes'), 'own');
  assert.equal(widthsOf('lanes', 'match'), 'match');
  assert.equal(widthsOf('grid', 'own'), 'own');
  assert.equal(widthsOf('grid', 'own', 'match'), 'match');
  assert.equal(widthsOf('flow', undefined, 'match'), 'match');
});

test('a v13 ledger: a region sets its widths, the person sets them on a container that exists', () => {
  const at = '2026-10-11T09:00:00Z';
  const A = 'a-abcd1234';
  const lines = [
    { v: 13, seq: 1, at, by: 'agent', agent: A, type: 'join', label: 'Chat' },
    { v: 13, seq: 2, at, by: 'agent', agent: A, type: 'board', board: 'b', title: 'B' },
    { v: 13, seq: 3, at, by: 'agent', agent: A, type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'lanes', lanes: ['A'], widths: 'match' } },
    { v: 13, seq: 4, at, by: 'person', type: 'act', action: 'widths', board: 'b', region: 'r', widths: 'own' },
    { v: 13, seq: 5, at, by: 'person', type: 'act', action: 'widths', board: 'b', region: 'nope', widths: 'own' },
  ].map((e) => JSON.stringify(e));
  assert.deepEqual(readLedger(lines).problems, ['line 5: region: unknown "nope"']);
});
