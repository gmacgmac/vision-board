// A locked board's cards and frames (N40 ruling 4): the state says `paused` while `BoardState.locked`
// is set and is left out otherwise, for a card and for its container; the flag is never among what
// the elements pause (paused.ts lists), so it stays usable; everything else that changes the board is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Region, View, ViewNode } from '#format';
import type { BoardState } from '#actions';
import { nodeState, nodeTemplate, regionState } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode => ({ id: '3', region: 'r', kind: 'question', title: 'T', n: 3, ...f });
const board = (locked: boolean): BoardState => ({
  items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(),
  regionNotes: new Map(), flags: new Set(), ...(locked && { locked: true as const }),
});
const region: Region = { id: 'r', title: 'R', mode: 'grid' };
const view: View = { format: 1, session: 'b', version: 1, title: 'B', regions: [region], nodes: [node({})], links: [] };

test('a card and its container are paused while the board is locked, and only then', () => {
  assert.equal(nodeState(node({}), board(true)).paused, true);
  assert.ok(!('paused' in nodeState(node({}), board(false))));
  assert.equal(regionState(region, view, board(true), new Set(['3'])).paused, true);
  assert.ok(!('paused' in regionState(region, view, board(false), new Set(['3']))));
});

test('the elements pause every control that changes the board, and never the flag', () => {
  const source = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
  const list = (file: string) => /const PAUSED = '([^']+)'/.exec(source(file))![1]!;
  const cardList = list('../src/node/vb-node.ts');
  for (const sel of ['button[data-act]', '.vb-size-trig', '.vb-size-opt', '.vb-note-pin', 'button[data-answer]']) assert.ok(cardList.includes(sel), sel);
  assert.doesNotMatch(cardList, /data-flag|vb-flag/);
  // The flag button is a `data-flag`, never a `data-act`, so the card list can't catch it.
  const html = nodeTemplate(node({}), { flag: true });
  assert.match(html, /<button type="button" class="vb-act vb-flag" data-flag /);
  assert.doesNotMatch(html, /data-flag[^>]*data-act|data-act="flag"/);
  const frameList = list('../src/region/vb-region.ts');
  for (const sel of ['button[data-mode]', 'button.vb-mtile', '.vb-widths', '.vb-region-grip', '.vb-region-comment', 'data-note-act="edit"', 'data-note-act="remove"', 'data-revoke'])
    assert.ok(frameList.includes(sel), sel);
  assert.doesNotMatch(frameList, /vb-cog|data-note-act="show"/, 'the cog and Show in container stay');
});
