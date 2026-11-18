// Gallery entry for the Command Lens skin (D-100; FE_04): the edges board's cards drawn by the skin's row (SKIN_DEFS) inside a board root
// that carries the skin (data-vb-skin), so its tokens apply as on a board: every mark in every state on the plate and
// the switch, selected, the moments a press leaves on a half or the number, and the menus and the selection bar on the
// dark glass. The same cards, marks and menus as the edges section: a skin moves the controls, never what they do.
import type { Skin } from '#format';
import type { VbSelectionBarElement } from '#ui';
import { barView, contextMenu, numberMenu, SKIN_DEFS } from '#ui';
import { selectionButtons } from '../board/input/index.ts';
import { cardList, el, group } from './dom.ts';
import { byTitle, edgeCard, withMenu } from './edges-section.ts';
import type { Fixture } from './fixture.ts';

const SKIN: Skin = 'command-lens';
const ROW = SKIN_DEFS[SKIN];

/** A card with a moment the page sets on its mark `m` for a while: a write on its way, one that failed, a lock. */
function moment(fx: Fixture, title: string, m: string, attr: string): HTMLElement {
  const { node } = edgeCard(fx, byTitle(fx, title), false, ROW);
  node.querySelector(`[data-mark="${m}"]`)!.toggleAttribute(attr, true);
  return node;
}

/** The selection bar over two nodes, on the glass, where the page would place it. */
function glassBar(): HTMLElement {
  const bar = document.createElement('vb-selection-bar') as VbSelectionBarElement;
  bar.show(barView(2, selectionButtons(2, false)));
  const box = el('div', 'g-edge-menu g-skin-bar');
  box.append(bar);
  return box;
}

export function commandLensSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'command-lens';
  box.setAttribute('aria-labelledby', 'feature-command-lens');
  const heading = el('h2', 'g-title', 'The Command Lens skin');
  heading.id = 'feature-command-lens';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, `<vb-node> render(n, { edges: SKIN_DEFS['${SKIN}'] })`), ' in a board root with data-vb-skin (D-100)');
  const skin = el('div', 'vb-board g-skin');
  skin.dataset.vbSkin = SKIN;
  const every = fx.edges.view.nodes.map((n) => edgeCard(fx, n, false, ROW).node);
  const selected = ['Go-ahead to install', 'Switch to the satellite backup at 2% loss'].map((t) => edgeCard(fx, byTitle(fx, t), true, ROW).node);
  skin.append(
    group('Every mark, in every state', 'The plate is the handle and holds the number, the kind, what changed, Awaiting, a proposal and the notes; a dark plate and the switch mean the node asks, a light plate and no switch that it only tells. Bookmarked, the number fills and hangs a notched tail; the lit half is the only thing an answer recolours; a proposal outlines its half and puts a chip in the plate.',
      cardList('Command Lens, every state', ...every)),
    group('Selected', 'The node\'s own border in its colour (its tone\'s, if it has one), thicker; no outer ring.', cardList('Command Lens, selected', ...selected)),
    group('Moments', 'Set by the page for a moment: a write on its way (a spinner in the half), one that failed (ringed in red with "!" until the next press), a press on a locked board (a lock in the half); the number fails the same way.',
      cardList('Command Lens moments', moment(fx, 'Go-ahead to install', 'tick', 'data-saving'), moment(fx, 'Install window agreed', 'cross', 'data-failed'),
        moment(fx, 'Keep the backup encoder warm', 'tick', 'data-locked'), moment(fx, 'Order of work', 'number', 'data-failed'))),
    group('On the glass', 'Menus and the selection bar float on the skin\'s dark glass in both themes, at one size at any zoom; the same rows and keys as in the default skin.',
      withMenu(fx, 'Go-ahead to install', numberMenu, ROW), withMenu(fx, 'Order of work', contextMenu, ROW), glassBar()));
  box.append(heading, el('p', 'g-desc', 'The second skin: the same node, marks and actions, placed where this skin puts them and drawn in its tokens.'), meta, skin);
  return box;
}
