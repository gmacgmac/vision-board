// New and updated cards at board scale (new-and-updated Design 3 and 5): `freshCards`, the one list
// the toolbar's "N new" chip and every container's pill read, and the `container.fresh` row against
// the fold: true while a container holds a new or updated card changed after the person's latest
// engagement with any card in it, ended by a seen or an act on any of its cards, never by a Send.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LedgerState } from '../src/index.ts';
import { conditionsOf, freshCards } from '../src/index.ts';
import { A, Ledger } from './ledger-v3.ts';

/** Board `b` opened by the person: region `r` with items 1 and 2, region `q` with item 3, each seen
 * at version 1; then A adds item 4 in `r` and redraws item 3 at version 2. */
function board(): Ledger {
  const l = new Ledger();
  l.v = 10;
  l.agent(A, { type: 'join', label: 'Pricing chat' });
  l.agent(A, { type: 'board', board: 'b', title: 'Board' });
  l.region(A, 'r');
  l.region(A, 'q');
  l.node(A, 1, 1, { region: 'r' });
  l.node(A, 2, 1, { region: 'r' });
  l.node(A, 3, 1, { region: 'q' });
  l.seenBoard('b', l.seq);
  for (const n of [1, 2, 3]) l.seen(n, 1);
  l.node(A, 4, 1, { region: 'r' });
  l.node(A, 3, 2, { region: 'q', body: 'Changed.' });
  return l;
}

const fresh = (s: LedgerState) => conditionsOf(s, { board: 'b' }).filter((c) => c.kind === 'container.fresh').map((c) => c.container);
const rows = (s: LedgerState) => freshCards(s, 'b').map((c) => `${c.n}${c.updated ? ' updated' : ' new'} in ${c.container}`);

test('freshCards: the new and the updated cards in board order, each with its container', () => {
  const l = board();
  assert.deepEqual(rows(l.state()), ['3 updated in q', '4 new in r']);
  const four = freshCards(l.state(), 'b').find((c) => c.n === 4)!;
  assert.equal(four.title, 'Node 4');
  l.node(A, 4, 2, { region: 'r', body: 'Again.' });
  assert.deepEqual(rows(l.state()), ['3 updated in q', '4 new in r'], 'a new card changed again is still new only, never updated');
});

test('freshCards: only what the tabs show; a card at version 1 never seen carries no tab, so it is not listed', () => {
  const l = new Ledger();
  l.v = 10;
  l.agent(A, { type: 'board', board: 'b', title: 'Board' });
  l.region(A, 'r');
  l.node(A, 1, 1, { region: 'r' });
  l.seenBoard('b', l.seq);
  assert.ok(conditionsOf(l.state(), { board: 'b' }).some((c) => c.kind === 'item.unseen'), 'item.unseen holds');
  assert.deepEqual(rows(l.state()), [], 'but no tab, so no row');
  l.agent(A, { type: 'reply', n: 1, text: 'Noted.' });
  assert.deepEqual(rows(l.state()), ['1 updated in r'], 'an agent reply is an update of its own');
});

test('container.fresh: a container holding a new or updated card; ended by a seen of one of its cards', () => {
  const l = board();
  assert.deepEqual(fresh(l.state()), ['q', 'r'], 'in the order of their first fresh card');
  l.seen(4, 1);
  assert.deepEqual(fresh(l.state()), ['q'], 'seeing the new card ends r');
  assert.deepEqual(rows(l.state()), ['3 updated in q']);
});

test('container.fresh: any act on any card in it ends it, even one neither new nor updated; the other cards stay new', () => {
  const l = board();
  l.act({ action: 'pin', n: 1, x: 10, y: 10 });
  assert.deepEqual(fresh(l.state()), ['q'], 'an act on card 1, old, ends r');
  assert.deepEqual(rows(l.state()), ['3 updated in q', '4 new in r'], 'card 4 keeps its NEW');
  l.act({ action: 'pin', n: 2, x: 10, y: 10 });
  assert.deepEqual(fresh(l.state()), ['q'], 'an act in r leaves q fresh');
});

test('container.fresh: the agent changing one of its cards again makes it fresh again; a Send ends nothing', () => {
  const l = board();
  l.seen(4, 1);
  l.act({ action: 'send', board: 'b' });
  assert.deepEqual(fresh(l.state()), ['q'], 'a Send ends nothing');
  l.node(A, 2, 2, { region: 'r', body: 'Changed.' });
  assert.deepEqual(fresh(l.state()), ['r', 'q'], 'card 2 changed after the person looked at r');
  l.node(A, 5, 1, { region: 'q' });
  l.seen(3, 2);
  assert.deepEqual(fresh(l.state()), ['r'], 'seeing 3 in q, after 5 was drawn, ends q though 5 is still new');
  assert.deepEqual(rows(l.state()), ['2 updated in r', '5 new in q']);
});

test('container.fresh: a card counts in the container the person put it in', () => {
  const l = board();
  l.seen(4, 1);
  l.seen(3, 2);
  assert.deepEqual(fresh(l.state()), []);
  l.node(A, 6, 1, { region: 'r' });
  assert.deepEqual(fresh(l.state()), ['r']);
  l.act({ action: 'move', n: 1, region: 'q' });
  assert.deepEqual(fresh(l.state()), ['r'], 'the move names card 1, now in q: r stays fresh');
  l.act({ action: 'move', n: 6, region: 'q' });
  assert.deepEqual(fresh(l.state()), [], 'card 6 moved into q, and the move engages it');
});
