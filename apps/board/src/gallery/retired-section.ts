// Gallery entry for retired cards (retiredMarker flag, field report batch 2 ruling 1), shown by
// default (gallery.html?flags=-retiredMarker hides it): a container the agent retired two cards from,
// one at a time. The cards left the board; the frame's title line says "2 cards retired", a quiet
// button that opens the board version where they last appeared. The frame is a real <vb-region>,
// with the marker the board works out from the fixture ledger (retired.ts, render.ts).
import type { VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { regionState, retiredMarker } from '../../../../packages/ui/src/index.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

const REGION = 'retired-here';

export function retiredSection(fx: Fixture): HTMLElement {
  const { view, state, retired } = fx.marks;
  const region = view.regions.find((r) => r.id === REGION)!;
  const gone = retired.get(REGION)!;
  const frame = document.createElement('vb-region') as VbRegionElement;
  frame.render(region);
  frame.update({ ...regionState(region, view, state, new Set(view.nodes.map((n) => n.id))), retired: retiredMarker(gone.count, gone.version) });
  const frames = el('div', 'g-frames vb-ground');
  frames.append(frame);
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
    group('A container cards were retired from', 'Two of its four cards were retired one at a time. The marker after the count opens the board version where they last appeared, read-only.', frames));
  return box;
}
