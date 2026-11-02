// Gallery entry for retired cards (retiredMarker flag, field report batch 2 ruling 1), shown by
// default (gallery.html?flags=-retiredMarker hides it): a container the agent retired two cards from,
// one at a time. The cards left the board; the frame's title line says "2 cards retired", a quiet
// button that opens the board version where they last appeared, with the person's answers as they
// stood just before the retire (review polish ruling 10). The frame is a real <vb-region>,
// with the marker the board works out from the fixture ledger (packages/actions retired.ts, render.ts).
import type { VbRegionElement } from '#ui';
import { regionState, retiredMarker } from '#ui';
import { el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';

const REGION = 'retired-here';
/** One card left of seven, under a long title: the narrowest frame a container takes (review polish
 *  ruling 9, tracker N41), where the marker and the controls stay whole and the title ends in "…". */
const NARROW = 'retired-narrow';

/** Container `id` of the marks board with its marker, as the board draws it (render.ts). */
function frameOf(fx: Fixture, id: string): VbRegionElement {
  const { view, state, retired } = fx.marks;
  const region = view.regions.find((r) => r.id === id)!;
  const gone = retired.get(id)!;
  const frame = document.createElement('vb-region') as VbRegionElement;
  frame.render(region, ownIds());
  frame.update({ ...regionState(region, view, state, new Set(view.nodes.map((n) => n.id))), retired: retiredMarker(gone.count, gone.version, gone.until) });
  return frame;
}

export function retiredSection(fx: Fixture): HTMLElement {
  const frames = el('div', 'g-frames vb-ground');
  frames.append(frameOf(fx, REGION), frameOf(fx, NARROW));
  const box = el('section', 'g-section');
  box.dataset.feature = 'retiredMarker';
  box.setAttribute('aria-labelledby', 'feature-retiredMarker');
  const heading = el('h2', 'g-title', 'Retired cards');
  heading.id = 'feature-retiredMarker';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'write_board { type: "retire", n | region }'), ' · feature flag retiredMarker (api.md 126), on by default · off with ?flags=-retiredMarker');
  box.append(heading,
    el('p', 'g-desc', 'An agent retires a card, or a whole container, on a board it holds. Retired cards leave the board and keep their history in the ledger; a container retired whole leaves with them.'),
    meta,
    group('A container cards were retired from', 'Two of its four cards were retired one by one. The marker opens the version they were last in, read-only, with the answers at the retire. '
      + 'Beside it, one card left of seven in the narrowest frame: the marker and the controls stay whole, the title ends in "…".', frames));
  return box;
}
