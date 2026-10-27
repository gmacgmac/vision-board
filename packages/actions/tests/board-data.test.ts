// One board as the page draws it and `get_board` answers it, built once (`boardData`, `boardJson`):
// the shape of each from the roadmap fixture, and the answered cards "Hide answered" leaves out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { boardView, readLedger } from '#format';
import { FIXTURES_DIR } from '#format/files';
import { answeredIds, boardAccess, boardData, boardJson, boardState, foldLedger, itemsOut } from '../src/index.ts';

const lines = fs.readFileSync(`${FIXTURES_DIR}roadmap.ledger.jsonl`, 'utf8').trim().split('\n');
const read = readLedger(lines);
assert.deepEqual(read.problems, []);
const s = foldLedger(read.events);

test('boardData: the head, the drawn view, the state, each card\'s latest version by its board number, the access', () => {
  const d = boardData(s, 'roadmap');
  assert.equal(d.head, s.seq);
  assert.deepEqual(d.view, boardView(s, 'roadmap'));
  assert.deepEqual(d.state, boardState(s, 'roadmap'));
  assert.deepEqual(d.access, boardAccess(s, 'roadmap'));
  assert.deepEqual(Object.keys(d.versions).sort(), d.view.nodes.map((n) => n.id).sort(), 'a View node\'s id is its board number');
  assert.ok(Object.values(d.versions).every((v) => v >= 1));
});

test('boardJson: the stored statuses named at the edge, each map an object, the access at the top', () => {
  const d = boardData(s, 'roadmap');
  const j = boardJson(d);
  assert.deepEqual(j.state.items, itemsOut(d.state.items));
  assert.deepEqual(j.state.pins, Object.fromEntries(d.state.pins));
  assert.deepEqual(j.state.modes, Object.fromEntries(d.state.modes));
  assert.equal('widths' in j.state, d.state.widths.size > 0, 'a map nobody set is left out');
  assert.deepEqual([j.head, j.view, j.versions], [d.head, d.view, d.versions]);
  for (const key of Object.keys(d.access)) assert.deepEqual((j as Record<string, unknown>)[key], (d.access as unknown as Record<string, unknown>)[key], key);
  assert.doesNotThrow(() => JSON.stringify(j));
});

test('answeredIds: the decided cards, but not one the agent still owes an answer', () => {
  let seq = 0;
  const line = (e: object) => JSON.stringify({ v: 12, seq: ++seq, at: `2026-10-11T11:${String(seq).padStart(2, '0')}:00Z`, ...e });
  const agent = (e: object) => line({ by: 'agent', agent: 'a-aaaa1111', ...e });
  const ask = (n: number) => agent({ type: 'node', board: 'b', n, ver: 1, node: { region: 'p', kind: 'question', title: `Question ${n}?` } });
  const { events, problems } = readLedger([
    agent({ type: 'join', label: 'Pricing chat' }), agent({ type: 'board', board: 'b', title: 'B' }),
    agent({ type: 'region', board: 'b', region: { id: 'p', title: 'P', mode: 'grid' } }),
    ask(1), ask(2), ask(3),
    line({ by: 'person', type: 'act', action: 'ack', n: 1, ver: 1 }), line({ by: 'person', type: 'act', action: 'drop', n: 2, ver: 1 }),
  ]);
  assert.deepEqual(problems, []);
  const d = boardData(foldLedger(events), 'b');
  assert.deepEqual([...answeredIds(d)].sort(), ['1', '2'], 'card 3 is open');
  assert.deepEqual([...answeredIds(d, new Set([2]))], ['1'], 'owed: card 2 stays until the reply lands');
});
