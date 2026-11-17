// The node with its marks on its edges (FE_01, D-099; nodeEdges): the template draws by the skin's row, never a skin's
// name; no footer; marks in visual order, so the tab order follows what is drawn; the icon tile, built in or from the
// library; the three menus; and every skin offers the same actions. Off (no `edges`), nothing of it is drawn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import { SKINS } from '#format';
import type { BoardState } from '#actions';
import { answerPicker, contextMenu, nodeState, nodeTemplate, numberMenu, SKIN_DEFS } from '../src/index.ts';

const node = (f: Partial<ViewNode> = {}): ViewNode => ({ id: '28', region: 'r', kind: 'question', title: 'Order <of> work', n: 28, ...f });
const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set(), ...f });
const edges = SKIN_DEFS.default;
const marks = (html: string): string[] => [...html.matchAll(/data-mark="(\w+)"|class="(vb-node-kind|vb-node-grip|vb-node-content|vb-mark vb-mark-awaiting)"/g)].map((m) => m[1] ?? m[2]!);

test('every skin has a row, and the template reads only the row', () => {
  assert.deepEqual(Object.keys(SKIN_DEFS).sort(), [...SKINS].sort());
  assert.deepEqual(SKIN_DEFS.default, { answer: 'disc', marks: 'edges' });
});

test('off, the node is today\'s: a footer and no mark; on, no footer, no notes block, no bottom tabs', () => {
  const off = nodeTemplate(node(), { bookmark: true, history: true });
  assert.ok(off.includes('vb-node-foot') && !off.includes('data-mark'));
  const on = nodeTemplate(node(), { bookmark: true, history: true, edges });
  for (const gone of ['vb-node-foot', 'vb-node-notes', 'vb-node-btabs', 'data-act=', 'data-bookmark', 'vb-note-pin']) assert.ok(!on.includes(gone), gone);
});

test('the marks sit in visual order, so reading and tab order follow it: number, kind, disc, body, badge, Awaiting, notes', () => {
  assert.deepEqual(marks(nodeTemplate(node(), { edges })), ['number', 'vb-node-kind', 'answer', 'vb-node-content', 'badge', 'vb-mark vb-mark-awaiting', 'notes']);
  assert.deepEqual(marks(nodeTemplate(node({ kind: 'finding', icon: 'signal' }), { edges })),
    ['number', 'vb-node-grip', 'vb-node-content', 'badge', 'vb-mark vb-mark-awaiting', 'notes'], 'a node that tells has no disc; an icon swaps the kind tab for the grip');
  assert.deepEqual(marks(nodeTemplate(node({ n: undefined }), { edges })), ['vb-node-kind', 'vb-node-content'], 'no number, no marks');
});

test('each mark is a real button; the number is a toggle, the badge controls the history box that holds the stepper', () => {
  const html = nodeTemplate(node(), { edges, idPrefix: 'p-' });
  assert.match(html, /<button type="button" class="vb-mark vb-node-num" data-mark="number" data-tip="Bookmark · B" aria-pressed="false" aria-keyshortcuts="B">28<\/button>/);
  assert.match(html, /data-mark="badge"[^>]*aria-controls="p-vb-pop-history-28" hidden>/);
  assert.match(html, /id="p-vb-pop-history-28"[^>]*><h4[^>]*>Card 28 history<\/h4><div class="vb-node-steps" id="p-vb-steps-28"[^]*class="vb-node-stepnav" hidden>[^]*<div class="vb-history-body">/);
  assert.match(html, /data-pop="proposal" id="p-vb-pop-proposal-28"/);
  assert.ok(html.includes('<h3 class="vb-node-title">Order &#60;of&#62; work</h3>'), 'the title escaped');
});

test('the icon tile: a built-in, a library drawing, and the plain tile for a missing one or one that fails', () => {
  const lib = new Map([['x-dish', ['M4 20l4-9 4 9']], ['x-bad', ['M4 4"/><img src=x onerror=alert(1)>']]]);
  const tile = (icon: string) => /<span class="vb-node-tile" aria-hidden="true">(.*?)<\/span><\/div>/.exec(nodeTemplate(node({ icon }), { edges, icons: lib }))![1];
  assert.match(tile('signal')!, /^<svg class="vb-icon vb-node-tile-icon"/);
  assert.equal(tile('x-dish'), '<svg class="vb-icon vb-node-tile-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20l4-9 4 9"/></svg>');
  for (const plain of ['x-gone', 'x-bad']) assert.equal(tile(plain), '', plain);
  assert.ok(!nodeTemplate(node({ icon: 'x-bad' }), { edges, icons: lib }).includes('onerror'));
  assert.match(nodeTemplate(node({ icon: 'signal' }), { edges }), /<p class="vb-node-kick">Question<\/p><h3 class="vb-node-title">/);
});

test('a tone never reaches the markup: the element applies the checked value through CSSOM', () => {
  assert.ok(!/tone|style=/.test(nodeTemplate(node({ tone: 210 }), { edges })));
});

test('an app card keeps today\'s card under the flag (its window is FE_08)', () => {
  assert.ok(nodeTemplate(node({ kind: 'app', app: { id: 'calc' } }), { edges }).includes('vb-node-foot'));
});

test('the number\'s menu: Bookmark (or Remove), Save for later (or Bring back), and Put back on a moved node', () => {
  const rows = (html: string) => [...html.matchAll(/data-menu-act="([\w-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(rows(numberMenu(node(), nodeState(node(), board()))), ['bookmark', 'later']);
  const s = board({ bookmarks: new Set(['28']), pins: new Map([['28', { x: 1, y: 1 }]]) as never, items: new Map([['28', { status: 'later', notes: [] }]]) });
  assert.deepEqual(rows(numberMenu(node(), nodeState(node(), s))), ['unbookmark', 'reopen', 'unpin']);
  const html = numberMenu(node(), nodeState(node(), board()), 'p-');
  assert.match(html, /^<div class="vb-menu-list vb-menu-fixed" id="p-vb-menu-number-28" role="menu" aria-label="Item 28" hidden>/);
  assert.match(html, /<span class="vb-menu-label">Bookmark<\/span><kbd>B<\/kbd>/);
});

test('the right-click list: the six actions with their keys, no Tick or Cross on a node that only tells, no Save for later on an app', () => {
  const rows = (n: ViewNode) => [...contextMenu(n, nodeState(n, board())).matchAll(/data-menu-act="(\w+)"[^>]*>.*?<kbd>(\w)<\/kbd>/g)].map((m) => `${m[1]} ${m[2]}`);
  assert.deepEqual(rows(node()), ['ack A', 'drop X', 'comment C', 'bookmark B', 'later L', 'history H']);
  assert.deepEqual(rows(node({ kind: 'topic' })), ['comment C', 'bookmark B', 'later L', 'history H']);
  assert.deepEqual(rows(node({ kind: 'app' })), ['comment C', 'bookmark B', 'history H']);
});

test('the answer picker: Tick and Cross side by side, named with their keys, in their colours', () => {
  const html = answerPicker(node());
  assert.match(html, /data-menu-look="picker" aria-orientation="horizontal" hidden>/);
  assert.match(html, /data-menu-act="ack" data-tone="tick" aria-label="Tick \(A\)">/);
  assert.match(html, /data-menu-act="drop" data-tone="cross" aria-label="Cross \(X\)">/);
});

test('every skin offers the same actions: the menus never read the skin, and each row draws an answer on a node that asks', () => {
  for (const name of SKINS) {
    const html = nodeTemplate(node(), { edges: SKIN_DEFS[name] });
    assert.ok(/data-mark="answer"|data-mark="tick"[^]*data-mark="cross"/.test(html), name);
    for (const m of ['number', 'badge', 'notes']) assert.ok(html.includes(`data-mark="${m}"`), `${name}: ${m}`);
  }
});
