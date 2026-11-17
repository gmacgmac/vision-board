// A board's skin (D-100 2, api.md 183): set on the board's `board` line by whoever makes it and by the person's `skin`
// act; the latest line naming a skin wins, a rename (a `board` line with none) keeps it, and absent it is `default`.
// Agents read it (`get_board`, `list_boards`); it is no answer and lights no Send; only the person's act changes it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '#format';
import { readLedger, LEDGER_FORMAT } from '#format';
import { boardData, boardJson, boardList, boardState, conditionsOf, skinOf, validateAct } from '../src/index.ts';
import { A, Ledger } from './ledger-v3.ts';

/** A board `p` made by A in the Command Lens skin, at v20. */
function made() {
  const l = new Ledger();
  l.agent(A, { type: 'join', label: 'Chat' });
  l.agent(A, { type: 'board', board: 'p', title: 'Plan', skin: 'command-lens' });
  l.agent(A, { type: 'region', board: 'p', region: { id: 'r', title: 'R', mode: 'flow' } });
  return l;
}

test('the maker sets it; a rename keeps it; the person\'s act changes it; default is left out of every read', () => {
  const l = made();
  assert.equal(skinOf(l.state(), 'p'), 'command-lens');
  l.personBoard('p', 'Plan, renamed');
  const s = l.state();
  assert.deepEqual([boardState(s, 'p').skin, s.boards.get('p')!.title], ['command-lens', 'Plan, renamed'], 'a rename keeps the skin');
  assert.deepEqual(boardList(s).map((b) => b.skin), ['command-lens']);
  assert.equal(boardJson(boardData(s, 'p')).state.skin, 'command-lens');
  l.act({ action: 'skin', board: 'p', skin: 'default' });
  const back = l.state();
  assert.deepEqual([skinOf(back, 'p'), boardState(back, 'p').skin, 'skin' in boardList(back)[0]!], ['default', undefined, false]);
  l.act({ action: 'skin', board: 'p', skin: 'command-lens' });
  assert.equal(skinOf(l.state(), 'p'), 'command-lens');
});

test('a skin is no answer: it lights no Send', () => {
  const l = made();
  l.act({ action: 'skin', board: 'p', skin: 'default' });
  assert.deepEqual(conditionsOf(l.state(), { board: 'p' }).filter((c) => c.kind === 'board.unsent'), []);
});

test('only the person\'s act changes it, on the board it was sent to; an agent sets it on its board line only', () => {
  const l = made();
  const s = l.state();
  const act = (f: Partial<ActEvent>) => ({ v: LEDGER_FORMAT, seq: s.seq + 1, at: '2026-11-16T10:00:00Z', by: 'person', type: 'act', action: 'skin', board: 'p', skin: 'command-lens', ...f }) as ActEvent;
  assert.deepEqual(validateAct(act({}), s, 'p'), []);
  assert.match(validateAct(act({ by: 'agent', agent: A }), s, 'p').join(), /only the person/);
  assert.match(validateAct(act({ board: 'q' }), s, 'q').join(), /unknown "q"/);
  const line = (e: object) => JSON.stringify({ v: LEDGER_FORMAT, seq: l.seq + 1, at: '2026-11-16T10:00:00Z', by: 'agent', agent: A, ...e });
  assert.match(readLedger([...l.lines, line({ type: 'board', board: 'p', title: 'Mine', skin: 'default' })]).problems.join(), /already exists/);
  assert.match(readLedger([...l.lines, line({ type: 'region', board: 'p', region: { id: 'r', title: 'R', mode: 'flow', skin: 'default' } })]).problems.join(), /region\.skin: unknown field/);
  assert.match(readLedger([...l.lines, line({ type: 'board', board: 'z', title: 'Z', skin: 'neon' })]).problems.join(), /skin: one of default, command-lens/);
});
