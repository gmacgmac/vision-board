// Gallery entry for the one layout control (node-overhaul FE_07, PLAN decision 20): a container shows one button with the
// active layout, its popover the menu of the others (and, on a flow, its Across, Down and Auto). Below it, the page to compare the layouts: the same eight linked cards drawn in each of the
// six modes, so the maintainer can decide which to keep (none is removed in this set). Every sample is a mini board drawn by the
// board's own drawing (mini-board.ts).
import type { Direction, Mode, View } from '#format';
import { MODES } from '#format';
import type { VbRegionElement } from '#ui';
import { MODE_HINT, MODE_LABEL } from '#ui';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { miniBoard } from './mini-board.ts';

const LINKS = [[1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7], [7, 4], [4, 8]];

/** The eight linked cards in container `line`, laid out in `mode`. */
function eight(fx: Fixture, mode: Mode): { view: View; state: Fixture['layout']['state'] } {
  const view: View = {
    format: 1, session: 'gallery-layouts', version: 1, title: 'Layouts',
    regions: [{ id: 'line', title: MODE_LABEL[mode], mode }],
    nodes: Array.from({ length: 8 }, (_, i) => ({ id: `lc${i + 1}`, n: 800 + i + 1, region: 'line', kind: 'topic' as const, title: `Step ${i + 1}` })),
    links: LINKS.map(([a, b]) => ({ from: `lc${a}`, to: `lc${b}` })),
  };
  return { view, state: fx.layout.state };
}

/** One frame with the control, its popover open when `open`. */
function control(fx: Fixture, mode: Mode, o: { open: boolean; direction?: Direction; suffix: string }): HTMLElement {
  return miniBoard(eight(fx, mode), 'line', {
    label: `${MODE_LABEL[mode]} with the layout control`, suffix: o.suffix, ...(o.direction && { direction: o.direction }),
    then: (host) => { if (o.open) host.querySelector<VbRegionElement>('vb-region')?.showPanel('modes', { mode, focus: false }); },
  });
}

/** A group whose open popover reaches left of its frame: room for it. */
const open = (g: HTMLElement): HTMLElement => { g.classList.add('g-lc-open'); return g; };

export function layoutControlSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'layout-control';
  box.setAttribute('aria-labelledby', 'feature-layout-control');
  const heading = el('h2', 'g-title', 'One layout control');
  heading.id = 'feature-layout-control';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'region-template.ts layoutButton, modePopover, directionRow · region-row.ts bindModeRow · act direction { board, region, direction }'),
    ' · PLAN decision 20');
  const compare = el('div', 'g-lc-compare');
  // A picture to compare the layouts by, not a board to use: its cards are drawn at 60%, so their controls are out of reach.
  compare.inert = true;
  for (const m of MODES) compare.append(group(MODE_LABEL[m], MODE_HINT[m], miniBoard(eight(fx, m), 'line', { label: `Eight linked cards as ${MODE_LABEL[m]}`, zoom: 0.6, suffix: `-cmp-${m}`, direction: 'across' })));
  box.append(heading,
    el('p', 'g-desc', 'A container shows one button, the active layout\'s icon named "Layout: Flow". A press, or a pointer resting on it for a moment, opens the layouts; the arrows move between them, Esc closes and returns focus to the button. The popover keeps one size at any zoom. No layout is removed.'),
    meta,
    group('Closed', 'The one button in the container\'s tools.', control(fx, 'grid', { open: false, suffix: '-lc-closed' })),
    open(group('Open', 'Every layout, a tile each; the current layout marked.', control(fx, 'column', { open: true, suffix: '-lc-open' }))),
    open(group('A flow\'s direction', 'A flow\'s popover also offers Across, Down and Auto; the container\'s way marked and named in the button ("Layout: Flow, down"). Auto gives back the agent\'s.', control(fx, 'flow', { open: true, direction: 'down', suffix: '-lc-dir' }))),
    group('Compare the layouts', 'The same eight linked cards in each of the six layouts, side by side, to decide which to keep.', compare));
  return box;
}
