// The page's parking and replies (proposals-seen-parking FE_03): which cards still wait for their
// handover comes from the conditions table (`pageConditions`); the handover, and the replies under the
// notes they answer (on a card, on a group of cards, on a container), come from the held state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '../../../packages/format/src/index.ts';
import type { ViewNode } from '../../../packages/format/src/index.ts';
import { foldLedger } from '../../../packages/actions/src/index.ts';
import { pageConditions } from '../src/board/board-data.ts';
import { createParking } from '../src/board/parking.ts';

const A = 'a-aaaa1111';
let seq = 0;
/** The time `line` gives the line with this `seq`. */
const AT = (n: number) => `2026-10-08T13:${String(n).padStart(2, '0')}:00Z`;
const line = (e: object) => JSON.stringify({ v: 10, seq: ++seq, at: AT(seq), ...e });
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const person = (e: object) => line({ by: 'person', ...e });
const item = (n: number) => agent({ type: 'node', board: 'b', n, ver: 1, node: { region: 'r', kind: 'question', title: `Card ${n}`, item: true } });
const card = (n: number): ViewNode => ({ id: String(n), n, region: 'r', kind: 'question', title: `Card ${n}` });
const bundle = { situation: 'S', background: 'B', assessment: 'A', recommendation: 'R' };

/** Cards 1 to 4. 1: later, no park. 2: later, then parked. 3: a note (seq 11), answered, and a reply
 *  naming nothing. 3 and 4 share a group note (seq 12), answered on card 4. A note on the container
 *  (seq 13), answered on card 1. */
function ledger() {
  seq = 0;
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }), agent({ type: 'board', board: 'b', title: 'B' }),
    agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    item(1), item(2), item(3), item(4),
    person({ type: 'act', action: 'later', n: 1, ver: 1 }), person({ type: 'act', action: 'later', n: 2, ver: 1 }),
    agent({ type: 'park', n: 2, bundle }),
    person({ type: 'act', action: 'comment', n: 3, ver: 1, text: 'Why?' }),
    person({ type: 'act', action: 'comment', nodes: [3, 4], text: 'Both?' }),
    person({ type: 'act', action: 'comment', board: 'b', region: 'r', text: 'Order?' }),
    agent({ type: 'reply', n: 3, text: 'Because.', to: 11 }), agent({ type: 'reply', n: 3, text: 'Also, FYI' }),
    agent({ type: 'reply', n: 4, text: 'Yes, both.', to: 12 }), agent({ type: 'reply', n: 1, text: 'Fine as is.', to: 13 }),
  ];
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  return foldLedger(events);
}

const make = (s: ReturnType<typeof ledger>, f: { handover?: boolean; replies?: boolean; readOnly?: boolean } = {}) => {
  const p = createParking({
    handover: f.handover ?? true, replies: f.replies ?? true, state: () => s, board: () => 'b',
    awaiting: () => pageConditions(s, 'b').awaiting, readOnly: () => f.readOnly ?? false,
  });
  p.refresh();
  return p;
};

test('the conditions table says which cards wait for a handover: Later with no park after it', () => {
  assert.deepEqual([...pageConditions(ledger(), 'b').awaiting], [1]);
});

test('awaiting and the written handover come to the card; neither when the flag is off', () => {
  const s = ledger();
  const p = make(s);
  assert.deepEqual(p.card(card(1)), { awaiting: true }, 'its reply answers the container note, not a note of its own');
  assert.deepEqual(p.card(card(2)), { handover: bundle });
  assert.deepEqual(make(s, { handover: false }).card(card(2)), {});
  assert.equal(make(s, { handover: false }).card(card(1)).awaiting, undefined);
});

test('a past version has no awaiting (today\'s fact); the written handover still reads from its state', () => {
  const p = make(ledger(), { readOnly: true });
  assert.equal(p.card(card(1)).awaiting, undefined);
  assert.deepEqual(p.card(card(2)), { handover: bundle });
});

test('a reply sits on the card its note is on; one naming no note stays on its own card', () => {
  const p = make(ledger());
  assert.deepEqual(p.card(card(3)).replies, [
    { seq: 14, text: 'Because.', at: AT(14), to: 11, agent: 'Pricing chat' }, { seq: 15, text: 'Also, FYI', at: AT(15), agent: 'Pricing chat' },
    { seq: 16, text: 'Yes, both.', at: AT(16), to: 12, agent: 'Pricing chat' },
  ]);
  assert.deepEqual(p.card(card(4)).replies, [{ seq: 16, text: 'Yes, both.', at: AT(16), to: 12, agent: 'Pricing chat' }], 'a group note is answered on every card it is on');
});

test('a reply to a container note is on no card; the frame reads it', () => {
  const p = make(ledger());
  assert.equal(p.card(card(1)).replies, undefined);
  assert.deepEqual(p.containers().map((r) => [r.seq, r.to]), [[17, 13]]);
});

test('with the cardReplies flag off there are no replies anywhere', () => {
  const p = make(ledger(), { replies: false });
  assert.equal(p.card(card(3)).replies, undefined);
  assert.deepEqual(p.containers(), []);
});

test('a non-item has nothing; a new line shows after refresh', () => {
  const s = ledger();
  const p = make(s);
  assert.deepEqual(p.card({ id: 'x', region: 'r', kind: 'topic', title: 'T' }), {});
  const before = p.card(card(3)).replies!.length;
  s.replies.get(3)!.push({ seq: s.seq + 1, at: '2026-10-08T14:00:00Z', text: 'Later still', to: 11 });
  s.seq += 1;
  p.refresh();
  assert.equal(p.card(card(3)).replies!.length, before + 1);
});

// Note and reply times (card-polish BE_01, api.md 156): each reply the page passes in carries `at`,
// the time of its ledger line, for the time chip on hover (card 4's reply is checked above).
test('every reply carries the time of its ledger line', () => {
  const p = make(ledger());
  assert.deepEqual(p.card(card(3)).replies!.map((r) => r.at), [AT(14), AT(15), AT(16)]);
  assert.deepEqual(p.containers().map((r) => r.at), [AT(17)], 'a reply to a container note too');
});
