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

// A ledger open read-only (D-085 3; READONLY_UI_01): the same controls pause as on a locked board, and the flag too,
// since read-only writes no flag; only `BoardState.readOnly` says so (the page sets it from its reads).
const readOnly = (): BoardState => ({ ...board(false), readOnly: true as const });

test('a read-only ledger pauses a card and its container as a lock does, and the card\'s flag besides', () => {
  const st = nodeState(node({}), readOnly());
  assert.equal(st.paused, true);
  assert.equal(st.readOnly, true);
  assert.ok(!('readOnly' in nodeState(node({}), board(true))), 'a lock leaves the flag');
  assert.ok(!('readOnly' in nodeState(node({}), board(false))));
  assert.equal(regionState(region, view, readOnly(), new Set(['3'])).paused, true);
  const source = fs.readFileSync(new URL('../src/node/vb-node.ts', import.meta.url), 'utf8');
  assert.match(source, /const FLAG = 'button\[data-flag\]'/);
  assert.match(source, /pauseControls\(this, FLAG, st\.readOnly === true\)/);
});

// The reason as the paused controls' tooltip (FE_01): their own tip kept, then given back.
test('explainPaused sets the reason as the title, keeps the control\'s own, and gives it back', async () => {
  const { explainPaused } = await import('../src/paused/paused.ts');
  const make = (title: string | null) => {
    const attrs = new Map<string, string>(title === null ? [] : [['title', title]]);
    return { dataset: {} as Record<string, string | undefined>, getAttribute: (k: string) => attrs.get(k) ?? null, setAttribute: (k: string, v: string) => void attrs.set(k, v), removeAttribute: (k: string) => void attrs.delete(k) };
  };
  const [a, none] = [make('Check · a'), make(null)];
  const root = { querySelectorAll: () => [a, none] } as unknown as ParentNode;
  explainPaused(root, 'button', 'Why');
  explainPaused(root, 'button', 'Why'); // again: the stash is not overwritten by the reason
  assert.equal(a.getAttribute('title'), 'Why');
  assert.equal(none.getAttribute('title'), 'Why');
  explainPaused(root, 'button', undefined);
  assert.equal(a.getAttribute('title'), 'Check · a');
  assert.equal(none.getAttribute('title'), null);
  const source = fs.readFileSync(new URL('../src/node/vb-node.ts', import.meta.url), 'utf8');
  assert.match(source, /explainPaused\(this, `\$\{PAUSED\}, \$\{FLAG\}, \$\{APP\}`/);
});
