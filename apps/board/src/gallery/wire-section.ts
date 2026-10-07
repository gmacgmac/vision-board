// Gallery entry for connectors behind cards (D-032), shown by default (wireLayers is on by default;
// gallery.html?flags=-wireLayers hides it). One stage on the board's canvas, built from the board's
// own rules (`.vb-world[data-wire-layers]` in board.css): connectors draw behind an item card and a
// note card, which are see-through (--vb-card-fill), and the focused card's connector draws again
// above the cards. The cards are real <vb-node> elements from the fixture ledger.
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { REGION_OTHER } from './fixture.ts';
import { card } from './node-section.ts';

const NOTE_TITLE = 'Note: the agent remarks, nothing to answer';
const WIRE = { x1: 24, x2: 976 };
/** Where each card sits on the stage, and the height of each connector (all horizontal). */
const ITEM = { x: 120, y: 56 };
const NOTE = { x: 520, y: 236 };
const BEHIND_ITEM = 100;
const BEHIND_NOTE = 280;
const ABOVE_ITEM = 150;

const NS = 'http://www.w3.org/2000/svg';
function wires(rows: number[], className: string): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  for (const y of rows) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('class', className.includes('top') ? 'vb-wire hot' : 'vb-wire');
    path.setAttribute('d', `M ${WIRE.x1} ${y} H ${WIRE.x2}`);
    svg.append(path);
  }
  return svg;
}

function stage(fx: Fixture): HTMLElement {
  const item = card(fx.view.nodes.find((n) => n.region === REGION_OTHER && n.kind !== 'note' && n.kind !== 'topic')!, fx);
  const note = card(fx.view.nodes.find((n) => n.title === NOTE_TITLE)!, fx);
  item.style.transform = `translate(${ITEM.x}px, ${ITEM.y}px)`;
  note.style.transform = `translate(${NOTE.x}px, ${NOTE.y}px)`;
  const list = el('div', 'g-wire-cards');
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', 'Cards with a connector behind them');
  list.append(item, note);
  const box = el('div', 'g-wire-stage vb-ground vb-world');
  box.dataset.wireLayers = '';
  box.append(wires([BEHIND_ITEM, BEHIND_NOTE], 'vb-wires'), list, wires([ABOVE_ITEM], 'vb-wires vb-wires-top'));
  return box;
}

export function wireSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'wireLayers';
  box.setAttribute('aria-labelledby', 'feature-wireLayers');
  const heading = el('h2', 'g-title', 'See-through cards');
  heading.id = 'feature-wireLayers';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'data-wire-layers'), ' · feature flag wireLayers (D-032) · on by default · off with ?flags=-wireLayers');
  box.append(heading,
    el('p', 'g-desc', 'Connectors draw behind container frames and cards. A card is partly see-through (--vb-card-fill, 70%), so a connector under one still shows. The focused card\'s connectors draw again above the cards, in the hot colour.'),
    meta,
    group('Connectors behind an item and a note', 'The top line passes behind an item card, the bottom line behind a note card, and the middle (hot) line is the focused card\'s own connector, drawn above the cards.', stage(fx)));
  return box;
}
