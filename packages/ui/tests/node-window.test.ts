// An app node as a window (D-099 5; appWindow flag, FE_08; node-window.ts): with the edges and the flag, one title bar
// (number, name, badge, why Allow shows, Allow or "Allowed ▾", the drawer arrow, Open with appStage), the app under it,
// the drawer's pane and the history box; no footer, no kind tab, no notes, no Save for later in its menus. Without the
// flag, or without the edges, an app card is today's, byte for byte. The drawer's state rides in the card's input.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import type { BoardState } from '#actions';
import { appView, contextMenu, nodeState, nodeTemplate, numberMenu, SKIN_DEFS } from '../src/index.ts';

const app = (f: Partial<ViewNode> = {}): ViewNode =>
  ({ id: '7', region: 'r', kind: 'app', title: 'Mission <control>', n: 7, app: { id: 'mission-control', w: 720, h: 460 }, ...f });
const board = (): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set() });
const edges = SKIN_DEFS.default;
/** The bar's controls, in the order drawn (so the tab order follows them). */
const bar = (html: string): string[] =>
  [...html.split('vb-win-bar')[1]!.split('vb-win-body')[0]!.matchAll(/data-mark="(\w+)"|class="(vb-app-name vb-win-name|vb-win-reason|vb-app-status|vb-win-btn vb-win-drawer|vb-win-btn vb-win-open)"/g)]
    .map((m) => m[1] ?? m[2]!);

test('without the flag, or without the edges, an app card is today\'s', () => {
  assert.equal(nodeTemplate(app(), { edges }), nodeTemplate(app(), { edges, appWindow: false }));
  assert.equal(nodeTemplate(app(), { appWindow: true }), nodeTemplate(app()));
  assert.ok(nodeTemplate(app(), { edges }).includes('vb-node-foot'));
});

test('a window: the bar in order, the app under it, the drawer\'s pane and history; no footer, kind tab, notes or disc', () => {
  const html = nodeTemplate(app(), { edges, appWindow: true, appStage: true, idPrefix: 'p-' });
  assert.deepEqual(bar(html), ['number', 'vb-app-name vb-win-name', 'badge', 'vb-win-reason', 'vb-app-status', 'vb-win-btn vb-win-drawer', 'vb-win-btn vb-win-open']);
  for (const gone of ['vb-node-foot', 'vb-node-kind', 'vb-node-notes', 'data-mark="notes"', 'data-mark="answer"', 'vb-node-btabs', 'data-act=']) assert.ok(!html.includes(gone), gone);
  assert.ok(html.includes('<vb-app-frame data-app="mission-control"'));
  assert.ok(html.includes('aria-controls="p-vb-drawer-7"') && html.includes('id="p-vb-drawer-7"'), 'the arrow names its pane');
  assert.ok(html.includes('data-pop="history"'), 'H and the badge open history');
  assert.ok(html.includes('Mission &#60;control&#62;') && !html.includes('Mission <control>'), 'the name is escaped');
});

test('Open only with appStage; the bar is a plate, so a plate skin draws it as its own and it is the drag handle', () => {
  assert.ok(!nodeTemplate(app(), { edges, appWindow: true }).includes('vb-win-open'));
  const lens = nodeTemplate(app(), { edges: SKIN_DEFS['command-lens'], appWindow: true });
  assert.ok(lens.includes('class="vb-node-plate vb-win-bar"'));
  assert.ok(!lens.includes('vb-mark-switch'), 'an app only tells: no switch');
});

test('no Save for later on an app: not in the number\'s menu, not in the right-click list', () => {
  const st = nodeState(app(), board());
  for (const menu of [numberMenu(app(), st), contextMenu(app(), st)]) assert.ok(!/data-menu-act="(later|reopen)"/.test(menu), menu);
  assert.ok(numberMenu(app(), st).includes('data-menu-act="bookmark"'));
});

test('the drawer\'s state rides in the card\'s input, and Open is named with the app', () => {
  assert.equal(appView(app(), {}).drawer, false);
  const v = appView(app(), { drawer: true, info: { id: 'mission-control', state: 'ready', title: 'Mission control', tools: [], allowed: false } });
  assert.deepEqual([v.drawer, v.names.open], [true, 'Open Mission control']);
});
