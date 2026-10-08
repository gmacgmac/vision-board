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

test('gallery ledger: every item kind appears in every status it can reach', () => {
  const s = foldLedger(events);
  const view = boardView(s, 'gallery');
  const state = boardState(s, 'gallery');
  const cells = new Set(view.nodes.filter((n) => n.region === 'kinds').map((n) => `${n.kind}/${statusOf(state, n.id)}`));
  const statuses = ['open', 'acknowledged', 'dropped', 'commented', 'context', 'later'];
  for (const kind of KINDS.filter((k) => NODE_TYPES[k].actions.length > 0)) {
    for (const status of statuses) {
      const reachable = !(status === 'dropped' && !NODE_TYPES[kind].actions.includes('drop'));
      assert.equal(cells.has(`${kind}/${status}`), reachable, `${kind} / ${status}`);
    }
  }
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
  const found = conditionsOf(s, { board: 'proposals' }).filter((c) => c.kind.startsWith('proposal.')).map((c) => [c.n, c.kind]);
  assert.deepEqual(found.sort(), [[92, 'proposal.open'], [93, 'proposal.stale'], [94, 'proposal.open'], [94, 'proposal.open'], [95, 'proposal.open']]);
});

test('gallery ledger: the changed cards samples have two cards seen at version 1 and changed three times, one changed once', () => {
  const s = foldLedger(events);
  const unseen = [...pageConditions(s, 'updates').unseen];
  assert.deepEqual(unseen.map((n) => [n, unseenCount(s, n)]), [[96, 3], [97, 3], [98, 1]]);
  assert.deepEqual(unseenSteps(s, 97, () => '').map((x) => x.changes.map((c) => `${c.change} ${c.field}`)),
    [['added body'], ['changed title'], ['changed body', 'added tags', 'removed size']]);
});

test('gallery ledger: the changed cards board has one NEW card, drawn after the person first opened it, and no other', () => {
  const s = foldLedger(events);
  assert.deepEqual([...pageConditions(s, 'updates').fresh], [103]);
  for (const board of ['gallery', 'notes', 'containers', 'container-notes', 'proposals', 'parking']) assert.deepEqual([...pageConditions(s, board).fresh], [], board);
});

test('gallery ledger: the parking samples have a card awaiting its handover, one parked, a reply under a note and one naming none', () => {
  const s = foldLedger(events);
  const found = conditionsOf(s, { board: 'parking' }).filter((c) => c.kind === 'item.awaiting').map((c) => c.n);
  assert.deepEqual(found, [99]);
  assert.deepEqual([...s.parks.keys()], [100]);
  assert.deepEqual([101, 102].map((n) => s.replies.get(n)!.map((r) => r.to !== undefined)), [[true], [false]]);
});
