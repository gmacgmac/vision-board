// Gallery entry for the node's edges (D-099; FE_01): the edges board's cards drawn from the fixture ledger through `nodeState`, as the board draws them, in the default
// skin's row: every mark in every state (waiting, ticked, crossed, a proposal, bookmarked, New, N updates, a settled
// vN, Awaiting, notes none, counted, on a group, unread), icons built in and from the library (one drawn, one with a
// failing path and one missing: the plain tile), tones by name and by hue; then the moments the page sets on a mark
// (a write on its way, one that failed, a press on a locked board), the selected look, and the three menus open.
import type { ViewNode } from '#format';
import type { CardConditions, IconLibrary, NodeState, SkinDef, VbNodeElement } from '#ui';
import { answerPicker, contextMenu, MARK_MOMENT_WORDS, nodeState, numberMenu, SKIN_DEFS } from '#ui';
import { mount } from 'svelte';
import { pageMarkdown } from '../flags.ts';
import { ToolbarMenu } from '../board/chrome/index.ts';
import { chromeSample } from './chrome-sample.ts';
import { cardList, el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';

/** The library the page would hold from `list_icons` with `paths`: x-uplink drawn; x-bad-path with a path outside the
 *  grammar, so it draws the plain tile; x-missing is not in it, the plain tile too. */
const LIBRARY: IconLibrary = new Map([
  ['x-uplink', ['M4 20l4-9 4 9', 'M6 16h4', 'M14 4a6 6 0 0 1 6 6', 'M14 8a2 2 0 0 1 2 2']],
  ['x-bad-path', ['M4 4L20 20 url(x)']],
]);

/** A card of the edges board drawn in skin row `def` (the default's, unless a skin's section asks for its own). */
export function edgeCard(fx: Fixture, n: ViewNode, selected = false, def: SkinDef = SKIN_DEFS.default): { node: VbNodeElement; st: NodeState } {
  const { state, cards } = fx.edges;
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, { ...ownIds(), markdown: pageMarkdown(), edges: def, icons: LIBRARY });
  const st = nodeState(n, state, undefined, selected, cards.get(n.n!) ?? ({} as CardConditions));
  node.update(st);
  return { node, st };
}

export const byTitle = (fx: Fixture, title: string): ViewNode => fx.edges.view.nodes.find((n) => n.title === title)!;

/** A card with a moment the page sets on its disc: a write on its way, one that failed, or a press on a locked board. */
function moment(fx: Fixture, title: string, attr: string): HTMLElement {
  const { node } = edgeCard(fx, byTitle(fx, title));
  node.querySelector('[data-mark="answer"]')!.toggleAttribute(attr, true);
  return node;
}

/** A card with one of its menus drawn open beside it, as the page opens it. */
export function withMenu(fx: Fixture, title: string, menu: (n: ViewNode, st: NodeState, prefix: string) => string, def?: SkinDef): HTMLElement {
  const n = byTitle(fx, title);
  const { node, st } = edgeCard(fx, n, false, def);
  const box = el('div', 'g-edge-menu');
  box.innerHTML = menu(n, st, ownIds().idPrefix); // markup from node-menus.ts, which escapes every text run
  box.querySelector<HTMLElement>('[role="menu"]')!.hidden = false;
  const pair = el('div', 'g-edge-pair');
  pair.append(cardList(`${n.title}, with its menu open`, node), box);
  return pair;
}

/** A mark with the board's tip under it, as the page shows it after a deliberate hover or on keyboard focus, or a
 *  moment's words beside it (mark-tips.ts). The tip's words are the mark's own, or the moment's. */
function withTip(fx: Fixture, title: string, m: string, words?: string, attr?: string): HTMLElement {
  const { node } = edgeCard(fx, byTitle(fx, title));
  const mark = node.querySelector<HTMLElement>(`[data-mark="${m}"]`)!;
  if (attr) mark.toggleAttribute(attr, true);
  const tip = el('div', 'vb-tip vb-mark-tip', words ?? mark.dataset.tip);
  tip.setAttribute('role', 'tooltip');
  const pair = el('div', 'g-edge-pair');
  const box = el('div', 'g-edge-menu');
  box.append(tip);
  pair.append(cardList(`${title}, with a tip`, node), box);
  return pair;
}

/** The "⋯" menu with the board's Skin rows (D-100 2), the default ticked. */
function skinRows(): HTMLElement {
  const host = el('div', 'g-edge-menu');
  mount(ToolbarMenu, { target: host, context: chromeSample({}, { skin: 'default', version: 3 }), props: { onhide: () => undefined, onskin: () => undefined, open: true, placement: 'gallery' } });
  return host;
}

export function edgesSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'node-edges';
  box.setAttribute('aria-labelledby', 'feature-node-edges');
  const heading = el('h2', 'g-title', 'The node\'s edges');
  heading.id = 'feature-node-edges';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, '<vb-node> render(n, { edges: SKIN_DEFS.default, icons })'), ' · D-099, the default skin (D-100)');
  const every = fx.edges.view.nodes.map((n) => edgeCard(fx, n).node);
  const selected = ['Go-ahead to install', 'Switch to the satellite backup at 2% loss'].map((t) => edgeCard(fx, byTitle(fx, t), true).node);
  box.append(heading,
    el('p', 'g-desc', 'Every action sits on the node\'s edge, and each mark is the control for what it shows: the number is the bookmark, the disc the answer, the badge opens history, the notes mark the conversation. No footer.'),
    meta,
    group('Every mark, in every state', 'Waiting, ticked and crossed discs; a proposal\'s dashed ring; bookmarked numbers; New, "1 update" and a settled "v3"; Awaiting; notes none, counted, on a group of nodes, and unread. Icons built in and from the project\'s library: one drawn, one whose path fails its check and one missing, both the plain tile. Tones by name and by hue.',
      cardList('Node edges, every state', ...every)),
    group('Selected', 'The node\'s own border, brighter and thicker; no outer ring. The notes mark and the badge keep their thin border.',
      cardList('Selected nodes', ...selected)),
    group('Moments on the disc', 'Set by the page for a moment: a write on its way (one bright arc), a write that failed (the answer from before stays, ringed in red with "!"), a press on a locked board or a read-only ledger (a lock).',
      cardList('Disc moments', moment(fx, 'Go-ahead to install', 'data-saving'), moment(fx, 'Install window agreed', 'data-failed'), moment(fx, 'Keep the backup encoder warm', 'data-locked'))),
    group('Menus', 'One size at any zoom: the number\'s menu (Bookmark, Save for later; Put back on a moved node), the answer picker beside the disc, and the right-click list with every action and its key (no Tick or Cross on a node that only tells).',
      withMenu(fx, 'Go-ahead to install', numberMenu),
      withMenu(fx, 'Go-ahead to install', (n, _st, p) => answerPicker(n, p)),
      withMenu(fx, 'Order of work', contextMenu)),
    group('Tips', 'After a deliberate hover of about two seconds, or at once when Tab brings focus to a mark, its tip shows above it; never after a click. A press the board can\'t take turns the mark into a lock for a moment with the reason beside it; a write that failed keeps its words until the next press.',
      withTip(fx, 'Go-ahead to install', 'answer'), withTip(fx, 'Keep the backup encoder warm', 'answer', MARK_MOMENT_WORDS.boardIsLocked, 'data-locked'),
      withTip(fx, 'Install window agreed', 'answer', MARK_MOMENT_WORDS.tickNotSaved, 'data-failed')),
    group('The board\'s skin', 'The "⋯" menu lists each skin, the board\'s ticked; a choice is the person\'s skin act, for everyone who opens the board.', skinRows()));
  return box;
}
