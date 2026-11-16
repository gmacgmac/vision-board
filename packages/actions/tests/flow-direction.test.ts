// A flow's direction (D-100 5, api.md 189): the agent sets it on a container with any redraw; the person's `direction`
// act sets it for one container or, with no `region`, the whole board, and `auto` clears their choice at that level.
// `directionOf`: the person's for the container, else theirs for the board, else the container's own, else `across`.
// Arranging the board, not an answer: no Send.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '#format';
import { directionOf, LEDGER_FORMAT } from '#format';
import { conditionsOf, validateAct } from '../src/index.ts';
import { A, Ledger } from './ledger-v3.ts';

function drawn() {
  const l = new Ledger();
  l.agent(A, { type: 'join', label: 'Chat' });
  l.agent(A, { type: 'board', board: 'p', title: 'Plan' });
  l.agent(A, { type: 'region', board: 'p', region: { id: 'build', title: 'Build', mode: 'flow', direction: 'down' } });
  l.agent(A, { type: 'region', board: 'p', region: { id: 'ship', title: 'Ship', mode: 'flow' } });
  return l;
}

test('the person\'s choice for the container wins, then theirs for the board, then the agent\'s, then across', () => {
  const l = drawn();
  const of = () => ['build', 'ship'].map((r) => directionOf(l.state(), 'p', r));
  assert.deepEqual(of(), ['down', 'across']);
  l.act({ action: 'direction', board: 'p', direction: 'across' });
  assert.deepEqual(of(), ['across', 'across'], 'the board-wide choice hides the agent\'s');
  l.act({ action: 'direction', board: 'p', region: 'ship', direction: 'down' });
  assert.deepEqual(of(), ['across', 'down']);
  l.act({ action: 'direction', board: 'p', region: 'ship', direction: 'auto' });
  assert.deepEqual(of(), ['across', 'across'], 'auto on the container gives back the board\'s');
  l.act({ action: 'direction', board: 'p', direction: 'auto' });
  assert.deepEqual(of(), ['down', 'across'], 'auto on the board gives back the agent\'s');
  l.agent(A, { type: 'region', board: 'p', region: { id: 'build', title: 'Build', mode: 'flow' } });
  assert.equal(directionOf(l.state(), 'p', 'build'), 'across', 'the agent\'s redraw without one: across');
  assert.equal(directionOf(l.state(), 'nope', 'x'), 'across');
});

test('a direction is no answer: it lights no Send', () => {
  const l = drawn();
  l.act({ action: 'direction', board: 'p', region: 'build', direction: 'across' });
  l.act({ action: 'direction', board: 'p', direction: 'down' });
  assert.deepEqual(conditionsOf(l.state(), { board: 'p' }).filter((c) => c.kind === 'board.unsent'), []);
});

test('validateAct: the person\'s, on a container of the board it was sent to, or the whole board', () => {
  const s = drawn().state();
  const act = (f: Partial<ActEvent>) => ({ v: LEDGER_FORMAT, seq: s.seq + 1, at: '2026-11-16T10:00:00Z', by: 'person', type: 'act', action: 'direction', board: 'p', direction: 'down', ...f }) as ActEvent;
  assert.deepEqual([validateAct(act({}), s, 'p'), validateAct(act({ region: 'ship' }), s, 'p')], [[], []]);
  assert.match(validateAct(act({ by: 'agent', agent: A }), s, 'p').join(), /only the person/);
  assert.match(validateAct(act({ region: 'nope' }), s, 'p').join(), /region: unknown "nope"/);
});
