// The gallery's fixture ledger is real data in the real schema (rule 11): it must pass the same
// checks a live ledger passes, and it must cover every state the gallery promises to show.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { boardView, KINDS, MODES, NODE_TYPES, readLedger } from '../../../packages/format/src/index.ts';
import type { ActEvent } from '../../../packages/format/src/index.ts';
import { boardAccess, boardState, foldLedger, statusOf, validateAct } from '../../../packages/actions/src/index.ts';

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

test('gallery ledger: the agent access samples have two open requests and frames with a creator and a granted holder', () => {
  const access = boardAccess(foldLedger(events), 'gallery');
  assert.equal(access.requests?.length, 2);
  assert.ok(access.requests!.every((r) => r.region === 'held' && r.label));
  for (const region of ['held', 'held-hover']) {
    assert.deepEqual(access.holders?.[region]?.map((h) => [h.label, h.creator ?? false]), [['Pricing chat', true], ['Docs chat', false]], region);
  }
});
