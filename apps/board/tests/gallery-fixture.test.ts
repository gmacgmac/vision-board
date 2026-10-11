// The gallery's fixture ledger is real data in the real schema (rule 11): it must pass the same
// checks a live ledger passes, and it must cover every state the gallery promises to show.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { boardView, KINDS, MODES, NODE_TYPES, readLedger } from '../../../packages/format/src/index.ts';
import type { ActEvent } from '../../../packages/format/src/index.ts';
import { boardAccess, boardState, conditionsOf, foldLedger, statusOf, validateAct } from '../../../packages/actions/src/index.ts';
import { pageConditions } from '../src/board/board-data.ts';
import { unseenCount, unseenSteps } from '../src/board/updates.ts';

const FILE = new URL('../src/gallery/gallery.ledger.jsonl', import.meta.url);
const lines = fs.readFileSync(FILE, 'utf8').trim().split('\n');
const { events, problems } = readLedger(lines);

test('gallery ledger: every line passes the ledger checks', () => {
  assert.deepEqual(problems, []);
  assert.equal(events.length, lines.length);
});

test('gallery ledger: every act is one its node type offers, by the person', () => {
  events.forEach((e, i) => {
    if (e.type === 'act') assert.deepEqual(validateAct(e as ActEvent, foldLedger(events.slice(0, i))), [], `seq ${e.seq}`);
  });
});

// every-node ruling 2: every kind takes a comment, more context and Later; only a card that needs an
// answer takes ✓ and ✗, so only those reach acknowledged and dropped. Exactly one card per cell.
test('gallery ledger: every kind appears once in every status it can reach, and in no other', () => {
  const s = foldLedger(events);
  const view = boardView(s, 'gallery');
  const state = boardState(s, 'gallery');
  const cells = view.nodes.filter((n) => n.region === 'kinds').map((n) => `${n.kind}/${statusOf(state, n.id)}`);
  const statuses = ['open', 'acknowledged', 'dropped', 'commented', 'context', 'later'];
  const closes: Record<string, string> = { acknowledged: 'ack', dropped: 'drop' };
  for (const kind of KINDS) {
    for (const status of statuses) {
      const reachable = !closes[status] || NODE_TYPES[kind].actions.includes(closes[status] as never);
      assert.equal(cells.filter((c) => c === `${kind}/${status}`).length, reachable ? 1 : 0, `${kind} / ${status}`);
    }
  }
  assert.equal(cells.length, 3 * 6 + 4 * 4);
});

test('gallery ledger: a region frame exists for every layout mode', () => {
  const s = foldLedger(events);
  const modes = new Set(boardView(s, 'gallery').regions.filter((r) => r.id.startsWith('frame-')).map((r) => r.mode));
  for (const m of MODES) assert.ok(modes.has(m), `mode ${m}`);
});

test('gallery ledger: the agent access samples have two open requests for a container and one for the board, frames with a creator and a granted holder', () => {
  const access = boardAccess(foldLedger(events), 'gallery');
  assert.deepEqual(access.requests?.map((r) => [r.region, Boolean(r.label)]), [['held', true], ['held', true], [undefined, true]]);
  assert.deepEqual(boardAccess(foldLedger(events), 'notes').boardHolders?.map((h) => [h.label, h.creator ?? false]),
    [['Pricing chat', true], ['Docs chat', false]]);
  for (const region of ['held', 'held-hover']) {
    assert.deepEqual(access.holders?.[region]?.map((h) => [h.label, h.creator ?? false]), [['Pricing chat', true], ['Docs chat', false]], region);
  }
});

test('gallery ledger: the container samples have a sent container note, three not yet sent and one moved container', () => {
  const state = boardState(foldLedger(events), 'containers');
  const notes = Object.fromEntries([...state.regionNotes].map(([id, ns]) => [id, ns.map((n) => n.sent === true)]));
  assert.deepEqual(notes, { 'c-sent': [true], 'c-hover': [false], 'c-focus': [false], 'c-open': [false] });
  assert.deepEqual([...state.regionPins.keys()], ['c-moved']);
});

test('gallery ledger: the proposals samples have an open proposal, one out of date, two on one card and one at rest', () => {
  const s = foldLedger(events);
  const found = conditionsOf(s, { board: 'proposals' }).filter((c) => c.kind.startsWith('proposal.')).map((c) => [c.id, c.kind]);
  assert.deepEqual(found.sort(), [[92, 'proposal.open'], [93, 'proposal.stale'], [94, 'proposal.open'], [94, 'proposal.open'], [95, 'proposal.open']]);
});

test('gallery ledger: the changed cards samples have two cards seen at version 1 and changed three times, one changed once', () => {
  const s = foldLedger(events);
  const unseen = [...pageConditions(s, 'updates').unseen];
  // Board numbers (D-041 proposed): the updates board's cards are its 1 to 4 (the ledger's 96, 97, 98, 103).
  assert.deepEqual(unseen.map((n) => [n, unseenCount(s, 'updates', n)]), [[1, 3], [2, 3], [3, 1]]);
  assert.deepEqual(unseenSteps(s, 'updates', 2, () => '').map((x) => x.changes.map((c) => `${c.change} ${c.field}`)),
    [['added body'], ['changed title'], ['changed body', 'added tags', 'removed size']]);
});

test('gallery ledger: the changed cards board has one NEW card, drawn after the person first opened it, and no other', () => {
  const s = foldLedger(events);
  assert.deepEqual([...pageConditions(s, 'updates').fresh], [4], 'the ledger\'s 103, the board\'s 4');
  for (const board of ['gallery', 'notes', 'containers', 'container-notes', 'proposals', 'parking']) assert.deepEqual([...pageConditions(s, board).fresh], [], board);
});

test('gallery ledger: the parking samples have a card awaiting its handover, one parked, a reply under a note and one naming none', () => {
  const s = foldLedger(events);
  const found = conditionsOf(s, { board: 'parking' }).filter((c) => c.kind === 'item.awaiting').map((c) => c.id);
  assert.deepEqual(found, [99]);
  assert.deepEqual([...s.parks.keys()], [100]);
  assert.deepEqual([101, 102].map((n) => s.replies.get(n)!.map((r) => r.to !== undefined)), [[true], [false]]);
});
