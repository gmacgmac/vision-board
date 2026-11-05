// A node item's `insert` end to end (PLAN Decision 5, point 424, api.md 174): one item puts a new or existing card
// between two linked cards of a `flow` or `lanes` container (the node line, the unlink, two links with the old label);
// the result names the two cards; a retry replays, a different insert under the key conflicts; every refusal writes
// nothing and points at what to fix; `show_layout` places the card between its neighbours; with `insertBetween` off,
// `insert` is refused exactly as an unknown field was before the schema had it.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { cardId } from '#format';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { writeItems } from '../server/write-board.ts';
import { itemExample } from '../server/examples.ts';

let h: Harness;
let A: Joined;
let B: Joined;
before(async () => {
  h = await startBoard();
  A = await h.join('Insert chat');
  B = await h.join('Other chat');
});
after(() => h.close());

const BOARD = 'ins';
const write = (items: unknown[], who: Joined = A): Promise<any> => h.ok('write_board', { board: BOARD, body: { items } }, { as: who.client });
const act = (body: object) => h.ok('act', { board: BOARD, body: { type: 'act', ...body } });
const region = (id: string, mode: string, extra = {}) => ({ type: 'region', key: `r-${id}`, region: { id, title: id, mode, ...extra } });
const card = (where: string, title: string, extra = {}) => ({ type: 'node', node: { region: where, kind: 'topic', title }, ...extra });
const id = (n: number) => cardId(h.ledger.state().index, BOARD, n)!;
/** The links on the board now, by board number, `from>to` with its label. */
const links = () => [...h.ledger.state().links.values()].filter((l) => h.ledger.state().nodes.get(l.from)?.board === BOARD)
  .map((l) => `${h.ledger.state().index.nodes.get(l.from)!.n}>${h.ledger.state().index.nodes.get(l.to)!.n}${l.label ? ` ${l.label}` : ''}`).sort();
const codes = (r: any) => r.results.map((x: any) => (x.ok ? 'ok' : x.problem.type.split('/').pop()));

test('setup: steps 1>2>3 (flow), grid cards 4>5, a lanes container 6>7, a loose card 8, a flow 9>10 apart', async () => {
  const r = await write([
    { type: 'board', key: 'ins-board', title: 'Insert' }, region('steps', 'flow'), region('grid', 'grid'),
    region('work', 'lanes', { lanes: ['Now', 'Next'] }), region('other', 'flow'),
    card('steps', 'S1', { key: 's1' }), card('steps', 'S2', { key: 's2' }), card('steps', 'S3', { key: 's3' }),
    card('grid', 'G1', { key: 'g1' }), card('grid', 'G2', { key: 'g2' }),
    card('work', 'W1', { key: 'w1', node: { region: 'work', kind: 'topic', title: 'W1', lane: 'Now' } }),
    card('work', 'W2', { key: 'w2', node: { region: 'work', kind: 'topic', title: 'W2', lane: 'Next' } }),
    card('steps', 'Loose', { key: 'loose' }), card('other', 'O1', { key: 'o1' }), card('other', 'O2', { key: 'o2' }),
    { type: 'link', from: 1, to: 2, label: 'then' }, { type: 'link', from: 2, to: 3 }, { type: 'link', from: 4, to: 5 },
    { type: 'link', from: 6, to: 7 }, { type: 'link', from: 9, to: 10 },
  ]);
  assert.ok(r.results.every((x: any) => x.ok), JSON.stringify(r.results.filter((x: any) => !x.ok)));
  assert.deepEqual(links(), ['1>2 then', '2>3', '4>5', '6>7', '9>10'].sort());
});

test('a new card between 1 and 2: the node line, the unlink and two links with the old label; the result names both', async () => {
  const head = h.ledger.state().seq;
  const r = await write([card('steps', 'Trial', { key: 'trial', insert: { after: 1, before: 2 } })]);
  assert.deepEqual(r.results, [{ index: 0, key: 'trial', ok: true, seq: head + 1, n: 11, ver: 1, title: 'Trial', inserted: { after: 1, before: 2 } }]);
  const lines = h.ledger.events().filter((e) => e.seq > head);
  assert.deepEqual(lines.map((e) => [e.type, e.agent, 'key' in e ? e.key : undefined]),
    [['node', A.agent, 'trial'], ['unlink', A.agent, undefined], ['link', A.agent, undefined], ['link', A.agent, undefined]]);
  assert.ok(!('insert' in (lines[0] as any)) && !('insert' in (lines[0] as any).node), 'the stored node line carries no insert');
  assert.deepEqual(lines.slice(1).map((e: any) => [e.from, e.to, e.label]), [[id(1), id(2), undefined], [id(1), id(11), 'then'], [id(11), id(2), 'then']]);
  assert.deepEqual(links(), ['1>11 then', '11>2 then', '2>3', '4>5', '6>7', '9>10'].sort());
});

test('show_layout places the inserted card between its neighbours', async () => {
  const r = await h.ok('show_layout', { board: BOARD, region: 'steps' }, { as: A.client });
  const col = (n: number) => r.cards.find((c: any) => c.n === n).column;
  assert.deepEqual([col(1), col(11), col(2), col(3)], [1, 2, 3, 4]);
});

test('an existing card by n and base, between 2 and 3; an unlabelled link gives unlabelled links', async () => {
  const r = await write([card('steps', 'Loose', { key: 'loose-in', n: 8, base: 1, insert: { after: 2, before: 3 } })]);
  assert.deepEqual(r.results[0], { index: 0, key: 'loose-in', ok: true, seq: r.results[0].seq, n: 8, ver: 2, title: 'Loose', inserted: { after: 2, before: 3 } });
  assert.deepEqual(links(), ['1>11 then', '11>2 then', '2>8', '4>5', '6>7', '8>3', '9>10'].sort());
});

test('cards named by key; in a lanes container', async () => {
  const r = await write([card('work', 'W3', { key: 'w3', node: { region: 'work', kind: 'topic', title: 'W3', lane: 'Now' }, insert: { after: { key: 'w1' }, before: { key: 'w2' } } })]);
  assert.deepEqual([codes(r), r.results[0].n, r.results[0].inserted], [['ok'], 12, { after: 6, before: 7 }]);
  assert.ok(links().includes('6>12') && links().includes('12>7') && !links().includes('6>7'));
});

test('a retry with the same key writes nothing twice; a different insert under it is a conflict', async () => {
  const head = h.ledger.state().seq;
  const again = await write([card('steps', 'Trial', { key: 'trial', insert: { after: 1, before: 2 } })]);
  assert.deepEqual(again.results[0], { index: 0, key: 'trial', ok: true, seq: again.results[0].seq, n: 11, ver: 1, title: 'Trial', inserted: { after: 1, before: 2 }, replayed: true });
  assert.equal(h.ledger.state().seq, head);
  const other = await write([card('steps', 'Trial', { key: 'trial', insert: { after: 2, before: 3 } })]);
  assert.deepEqual([codes(other), other.results[0].problem.errors[0].pointer], [['conflict'], '/items/0/key']);
  assert.equal(h.ledger.state().seq, head);
});

/** One item that must be refused: nothing is written, and its problem is returned. */
async function refused(item: object, code = 'invalid', who: Joined = A): Promise<any> {
  const head = h.ledger.state().seq;
  const r = await write([item], who);
  assert.deepEqual(codes(r), [code], JSON.stringify(r.results[0]));
  assert.equal(h.ledger.state().seq, head, 'nothing written');
  return r.results[0].problem;
}
const pointers = (p: any) => p.errors.map((e: any) => e.pointer);

test('refused, each saying what to fix: no link, the link the other way, two containers, a grid, another region', async () => {
  let p = await refused(card('steps', 'X', { key: 'x1', insert: { after: 1, before: 3 } }));
  assert.match(p.detail, /Card 1 has no link to card 3/);
  assert.deepEqual(pointers(p), ['/items/0/insert']);
  p = await refused(card('steps', 'X', { key: 'x2', insert: { after: 3, before: 8 } }));
  assert.match(p.detail, /card 8 links to card 3: send `after: 8` and `before: 3`/);
  await write([{ type: 'link', key: 'cross-link', from: 3, to: 9 }]);
  p = await refused(card('steps', 'X', { key: 'x3', insert: { after: 3, before: 9 } }));
  assert.match(p.detail, /Card 3 is in container "steps" and card 9 in "other"/);
  p = await refused(card('grid', 'X', { key: 'x4', insert: { after: 4, before: 5 } }));
  assert.match(p.detail, /Container "grid" lays out as `grid`/);
  p = await refused(card('other', 'X', { key: 'x5', insert: { after: 1, before: 11 } }));
  assert.match(p.detail, /The card's `region` is "other", but the cards it goes between are in "steps"/);
  assert.deepEqual(pointers(p), ['/items/0/node/region']);
});

test('refused: the same card twice, the card itself, a retired card, a card the person moved, the person\'s grid', async () => {
  let p = await refused(card('steps', 'X', { key: 'x6', insert: { after: 2, before: 2 } }));
  assert.deepEqual(pointers(p), ['/items/0/insert/before']);
  p = await refused(card('steps', 'S2', { key: 'x7', n: 2, insert: { after: 2, before: 8 } }));
  assert.match(p.detail, /Card 2 can't go between itself/);
  assert.deepEqual(pointers(p), ['/items/0/insert/after']);
  await act({ action: 'move', n: 5, region: 'other' });
  p = await refused(card('steps', 'G2', { key: 'x9', n: 5, insert: { after: 1, before: 11 } }));
  assert.match(p.detail, /The person moved card 5 to "other", and their move wins over yours, so it can't go into "steps"/);
  assert.deepEqual(pointers(p), ['/items/0/n']);
  await write([{ type: 'retire', key: 'retire-10', n: 10 }]);
  p = await refused(card('other', 'X', { key: 'x10', insert: { after: 9, before: 10 } }));
  assert.match(p.detail, /Card 10 was retired/);
  await h.ok('act', { board: BOARD, body: { type: 'act', action: 'mode', board: BOARD, region: 'steps', mode: 'grid' } });
  p = await refused(card('steps', 'X', { key: 'x11', insert: { after: 1, before: 11 } }));
  assert.match(p.detail, /Container "steps" lays out as `grid`/);
  await h.ok('act', { board: BOARD, body: { type: 'act', action: 'mode', board: BOARD, region: 'steps', mode: 'flow' } });
});

test('refused: another agent without the grant; a key that failed; a bad insert shape comes back with the insert example', async () => {
  const p = await refused(card('steps', 'X', { key: 'b1', insert: { after: 1, before: 11 } }), 'needs-grant', B);
  assert.equal(p.board, BOARD);
  const head = h.ledger.state().seq;
  const r = await write([card('nowhere', 'X', { key: 'bad' }), card('steps', 'Y', { key: 'y', insert: { after: { key: 'bad' }, before: 11 } })]);
  assert.deepEqual([codes(r), r.results[1].problem.errors[0].pointer], [['invalid', 'depends-on-failed'], '/items/1/insert/after']);
  assert.equal(h.ledger.state().seq, head);
  const shape = await refused(card('steps', 'X', { key: 'x12', insert: { after: 1 } }));
  assert.deepEqual(shape.example, itemExample('node', 'insert'));
  assert.ok((shape.example as any).insert, 'the example shows insert');
});

test('flag off: insert is refused as the unknown field it was, with the plain node example', () => {
  const head = h.ledger.state().seq;
  const items = [
    card('steps', 'X', { key: 'off1', insert: { after: 1, before: 11 } }),
    { type: 'node', key: 'off2', node: { region: 'steps', kind: 'note' }, insert: { after: 1, before: 2 } },
  ];
  const r = writeItems(h.ledger, A.agent, BOARD, items, false, false);
  // As write_board answered before the schema had `insert` (captured from the schema at insert-md/start).
  assert.deepEqual(r.map((x: any) => x.problem.errors), [
    [{ pointer: '/items/0/insert', detail: 'unknown field `insert`' }],
    [{ pointer: '/items/1/node/title', detail: '`title` is required' }, { pointer: '/items/1/insert', detail: 'unknown field `insert`' }],
  ]);
  assert.ok(r.every((x: any) => x.problem.example.key === 'fee-question'));
  assert.equal(h.ledger.state().seq, head);
  assert.deepEqual(writeItems(h.ledger, A.agent, BOARD, [card('steps', 'Plain', { key: 'off3' })], false, false).map((x) => x.ok), [true]);
});

test('flag off on the server: write_board refuses insert as an unknown field and writes nothing', async () => {
  const off = await startBoard({ flags: { insertBetween: false } });
  try {
    const C = await off.join('Flag-off chat');
    const go = (items: unknown[]) => off.ok('write_board', { board: 'off', body: { items } }, { as: C.client });
    await go([{ type: 'board', key: 'off-board', title: 'Off' }, region('steps', 'flow'), card('steps', 'A', { key: 'a' }), card('steps', 'B', { key: 'b' }),
      { type: 'link', key: 'ab', from: 1, to: 2 }]);
    const head = off.ledger.state().seq;
    const r = await go([card('steps', 'X', { key: 'x', insert: { after: 1, before: 2 } })]);
    assert.deepEqual(r.results[0].problem.errors, [{ pointer: '/items/0/insert', detail: 'unknown field `insert`' }]);
    assert.equal(r.results[0].problem.example.key, 'fee-question');
    assert.equal(off.ledger.state().seq, head);
  } finally {
    await off.close();
  }
});
