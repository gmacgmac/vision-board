// Gallery samples for a container's title (found-in-use FE_03, review polish rulings 2 and 9): a long
// title on one line ending in "…", on a wide frame and on a narrow one, each with the full-text tip
// open the way hover or keyboard focus on the title opens it (`data-title-tip-open`, the attribute
// the hover tip sets), and a short title that fits and has no tip. Real <vb-region> frames from the
// fixture ledger's `title-*` regions, updated with `regionState` as the board does. Then a container
// drawn by the board's own drawing at 40%: its top line keeps its size while the cards shrink. Then the
// title's three places (open list and container title FE_02), one container: centred at 100% (the
// board's own drawing); slid left beside the tools on a line as short on screen as it is at about 70%
// (its frame alone, since cards drawn at 70% have buttons under the 24px target); and at the start at
// 25% (the drawing again), where the tools have left the line.
import type { VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { regionState } from '../../../../packages/ui/src/index.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { miniBoard } from './mini-board.ts';

/** The frames that draw the tip open. */
const OPEN = new Set(['title-wide', 'title-narrow']);

/** The container the title placement samples show (the layout board's row of cards). */
const PLACED = 'align';

/** That container's frame alone, on a line as short on screen as the board draws it at about 70%: its
 *  label slides left beside the tools. Its id takes the same suffix the mini boards give theirs. */
function slidFrame(fx: Fixture): HTMLElement {
  const { view, state } = fx.layout;
  const region = view.regions.find((r) => r.id === PLACED)!;
  const f = document.createElement('vb-region') as VbRegionElement;
  f.render({ ...region, id: `${PLACED}-title-70` });
  f.update(regionState(region, view, state, new Set(view.nodes.map((n) => n.id))));
  f.querySelector<HTMLElement>('.vb-region-empty')!.hidden = true;
  f.style.width = 'calc(var(--vb-card-w) * 2.6)';
  const box = el('div', 'g-frames vb-ground');
  box.append(f);
  return box;
}

export function titleSamples(body: HTMLElement, fx: Fixture): void {
  const frames = el('div', 'g-frames vb-ground');
  for (const region of fx.view.regions.filter((r) => r.id.startsWith('title-'))) {
    const f = document.createElement('vb-region') as VbRegionElement;
    f.render(region);
    f.update(regionState(region, fx.view, fx.state, new Set()));
    // The sample holds no cards, and its title is the subject: no "Everything here is answered."
    f.querySelector<HTMLElement>('.vb-region-empty')!.hidden = true;
    f.toggleAttribute('data-title-tip-open', OPEN.has(region.id));
    frames.append(f);
  }
  body.append(group('Long titles',
    'A title takes one line and ends in "…", never broken mid-word; the head keeps its height. When it is cut, its full text '
    + 'shows in a tip below the title on hover of the title and on keyboard focus in the label group (the grip is focusable); '
    + 'Esc dismisses it, and it stays while the pointer is on it (titleTip flag). The first two frames show it open, on a wide '
    + 'and on a narrow frame; the third has a short title that fits, so it has no tip.', frames),
  group('Zoomed out',
    'At 40% the cards shrink but the top line keeps its size on screen, so the title still reads; below 55% the controls, '
    + 'the grip and the retired marker leave the line and the title takes their room.',
    miniBoard(fx.layout, 'align', { label: 'A row of cards at 40%', suffix: '-far', zoom: 0.4 })),
  group('Title placement',
    'The label (grip, title and count) sits in the middle of the top line. When the line is too short on screen to centre '
    + 'it beside the tools (zooming out), it slides left, never onto them; zoomed out below 55% it starts the line, and only '
    + 'at the start is the title cut. A drag on the grip, the title or the count moves the container; hovering them tints '
    + 'them together.',
    miniBoard(fx.layout, PLACED, { label: 'A row of cards at 100%', suffix: '-title-100' }), slidFrame(fx),
    miniBoard(fx.layout, PLACED, { label: 'A row of cards at 25%', suffix: '-title-25', zoom: 0.25 })));
}
