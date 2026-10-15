// Gallery samples for a container's title (found-in-use FE_03): a title that wraps to two lines
// and ends in "…", on a wide frame and on a narrow one, each with the full-text tip open the way
// hover or keyboard focus on the title opens it (`data-title-tip-open`, the attribute the hover
// tip sets), and a short title that fits one line and has no tip. Real <vb-region> frames from the
// fixture ledger's `title-*` regions, updated with `regionState` as the board does.
import type { VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { regionState } from '../../../../packages/ui/src/index.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

/** The frames that draw the tip open. */
const OPEN = new Set(['title-wide', 'title-narrow']);

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
    'A title wraps to two lines, then ends in "…"; the head keeps its height. When it is cut, its full text shows in a tip '
    + 'below the title on hover of the title and on keyboard focus in the label group (the grip is focusable); Esc dismisses it, '
    + 'and it stays while the pointer is on it (titleTip flag). The first two frames show it open, on a wide and on a narrow '
    + 'frame; the third has a short title that fits one line, so it has no tip.', frames));
}
