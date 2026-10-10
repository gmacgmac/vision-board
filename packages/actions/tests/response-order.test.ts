// The order the agent reads the person's responses in (every-node PLAN ruling 7, api.md 120): each
// batch, up to its Send, sorted by card number; a note on a group at its lowest card, a container's
// note or layout at the lowest card in it (first when it holds none); grant answers after the
// cards; acts at one place in the order made. Paging cuts in ledger order, then sorts the page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inCardOrder, responsesAfter, responsesPage } from '../src/index.ts';
import { A, C, scene } from './ledger-v3.ts';

/** Board `b` at v8: cards 1, 5, 6 in `r`, 2 in `q`, 3 in `old`, and an empty container `none`. */
function clicks() {
  const l = scene();
  l.v = 8;
  l.node(A, 5, 1, { region: 'r', kind: 'finding' });
  l.node(A, 6, 1, { region: 'r', kind: 'note' });
  l.region(A, 'none');
  const at = {
    on5: l.act({ action: 'comment', n: 5, ver: 1, text: 'Source?' }),
    ack2: l.act({ action: 'ack', n: 2, ver: 1 }),
    group: l.act({ action: 'comment', nodes: [6, 3], text: 'These two clash.' }),
    on1: l.act({ action: 'context', n: 1, ver: 1 }),
    onQ: l.act({ action: 'comment', board: 'b', region: 'q', text: 'All of q.' }),
    on2: l.act({ action: 'comment', n: 2, ver: 1, text: 'And why?' }),
    modeR: l.act({ action: 'mode', board: 'b', region: 'r', mode: 'list' }),
    send: l.act({ action: 'send', board: 'b' }),
    drop1: 0, onNone: 0, grant: 0, send2: 0,
  };
  at.drop1 = l.act({ action: 'drop', n: 1, ver: 1 });
  at.grant = l.act({ action: 'grant', request: l.request(C, 'r') });
  at.onNone = l.act({ action: 'comment', board: 'b', region: 'none', text: 'Empty?' });
  at.send2 = l.act({ action: 'send', board: 'b' });
  return { l, at };
}

test('each batch sorted by card number; a Send ends its batch; one card\'s acts in the order made', () => {
  const { l, at } = clicks();
  const s = l.state();
  assert.deepEqual(responsesAfter(s, 'b', 0).map((e) => e.seq), Object.values(at).sort((a, b) => a - b), 'the ledger keeps the clicks');
  assert.deepEqual(inCardOrder(s, responsesAfter(s, 'b', 0)).map((e) => e.seq), [
    at.on1, at.modeR, // card 1, and container r's layout at its lowest card
    at.ack2, at.onQ, at.on2, // card 2: q's note at its only card, between card 2's acts in the order made
    at.group, // the group 6, 3 at card 3
    at.on5, at.send,
    at.onNone, at.drop1, at.grant, at.send2, // an empty container's note first; a grant answer after the cards
  ]);
});

test('paging: cut in ledger order, then sorted; the next page starts after the highest seq', () => {
  const { l, at } = clicks();
  const s = l.state();
  const first = responsesPage(s, 'b', 0, 3);
  assert.deepEqual(first.responses.map((e) => e.seq), [at.ack2, at.group, at.on5]);
  assert.equal(first.more, true);
  const seen: number[] = [];
  let after = 0;
  for (let page = responsesPage(s, 'b', after, 3); ; page = responsesPage(s, 'b', after, 3)) {
    seen.push(...page.responses.map((e) => e.seq));
    if (!page.more) break;
    after = Math.max(...page.responses.map((e) => e.seq));
  }
  assert.deepEqual(seen.sort((a, b) => a - b), Object.values(at).sort((a, b) => a - b), 'every act once');
  assert.deepEqual(responsesPage(s, 'b', 0, 100), { responses: inCardOrder(s, responsesAfter(s, 'b', 0)) }, 'no `more` when all fit');
});
