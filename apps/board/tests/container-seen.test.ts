// A container seen on the person's screen (nodeEdges flag, point 308, D-099 4; container-seen.ts): a click inside a
// container clears its new-and-updated pill on this page only, until its next change, and quiets the agent's replies
// under its note (tracker N47); per board; nothing is written, so a new page (a reload) shows them again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '#format';
import { foldLedger } from '#actions';
import type { FreshCount } from '#actions';
import { lineMaker } from '#format/testing';
import { createContainerSeen } from '../src/board/cards/container-seen.ts';

const A = 'a-aaaa1111';
const maker = lineMaker({ at: '2026-11-17T10' });
const { line } = maker;
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const person = (e: object) => line({ by: 'person', ...e });

/** Board b, containers r and q, one card in each; a note on container r (line 7) and the agent's reply to it (line 8). */
function ledger() {
  maker.reset();
  const { events, problems } = readLedger([
    agent({ type: 'join', label: 'Planning chat' }),
    agent({ type: 'board', board: 'b', title: 'B' }),
    agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    agent({ type: 'region', board: 'b', region: { id: 'q', title: 'Q', mode: 'grid' } }),
    agent({ type: 'node', board: 'b', n: 1, ver: 1, node: { region: 'r', kind: 'question', title: 'One?' } }),
    agent({ type: 'node', board: 'b', n: 2, ver: 1, node: { region: 'q', kind: 'question', title: 'Two?' } }),
    person({ type: 'act', action: 'comment', board: 'b', region: 'r', text: 'Which one first?' }),
    agent({ type: 'reply', n: 1, text: 'This one.', to: 7 }),
  ]);
  assert.deepEqual(problems, []);
  return foldLedger(events);
}

const fresh = (seq: number): ReadonlyMap<string, FreshCount> => new Map([['r', { added: 1, updated: 0, seq }], ['q', { added: 0, updated: 1, seq: 6 }]]);
const reply = { seq: 8, to: 7, text: 'This one.', at: '2026-11-17T10:00:08Z' };

test('a click in a container clears its pill on this screen until a later change; the other containers keep theirs', () => {
  const seen = createContainerSeen();
  const regionOf = () => undefined;
  assert.deepEqual([...seen.fresh('b', fresh(5)).keys()], ['r', 'q']);
  assert.equal(seen.clear('b', 'r', fresh(5), [], regionOf), true);
  assert.deepEqual([...seen.fresh('b', fresh(5)).keys()], ['q'], 'r cleared, q not');
  assert.equal(seen.clear('b', 'r', fresh(5), [], regionOf), false, 'a second click changes nothing');
  assert.deepEqual([...seen.fresh('b', fresh(9)).keys()], ['r', 'q'], 'a later change shows the pill again');
  assert.deepEqual([...seen.fresh('other', fresh(5)).keys()], ['r', 'q'], 'per board');
  assert.deepEqual([...createContainerSeen().fresh('b', fresh(5)).keys()], ['r', 'q'], 'a new page (a reload) shows it again');
});

test('a reply to a container\'s note is bright until a click in the container quiets it (N47)', () => {
  const s = ledger();
  const seen = createContainerSeen();
  const regionOf = (to: number) => s.asks.get(to)?.region;
  assert.equal(regionOf(7), 'r');
  assert.deepEqual(seen.replies(s, 'b', [reply], regionOf).map((r) => r.unseen), [true]);
  assert.equal(seen.clear('b', 'q', new Map(), [reply], regionOf), false, 'a click in another container leaves it');
  assert.equal(seen.clear('b', 'r', new Map(), [reply], regionOf), true);
  assert.deepEqual(seen.replies(s, 'b', [reply], regionOf).map((r) => r.unseen), [undefined]);
  assert.deepEqual(seen.replies(s, 'b', [{ ...reply, seq: 12 }], regionOf).map((r) => r.unseen), [true], 'a later reply is bright again');
  const card = { seq: 9, text: 'Mine.', at: reply.at };
  assert.deepEqual(seen.replies(s, 'b', [card], regionOf).map((r) => r.unseen), [undefined], 'a reply naming no container note is not this file\'s');
});
