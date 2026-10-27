// Gallery samples for moving cards (3_FE_03): the board's built-in Later container holding the
// two cards the fixture ledger's `move` put there (its frame is fixed: no layout icons, only the
// cog), and an empty Later as it shows while a card is dragged over it, lit as the drop target.
// Both are real <vb-region> frames, built the way the board builds them (`placedView`,
// `LATER_FRAME`, `regionState`).
import { LATER_REGION } from '#format';
import { LATER, placedView } from '#actions';
import type { VbRegionElement } from '#ui';
import { regionState } from '#ui';
import { LATER_FRAME } from '../board/render.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

/** The empty sample's id: the gallery draws two Later frames, and frame ids must be unique. */
const EMPTY_LATER = 'later-empty';

export function laterSamples(body: HTMLElement, fx: Fixture): void {
  const view = placedView(fx.view, fx.state);
  const later = view.regions.find((r) => r.id === LATER_REGION)!;
  const held = document.createElement('vb-region') as VbRegionElement;
  held.render(later, LATER_FRAME);
  held.update(regionState(later, view, fx.state, new Set(view.nodes.map((n) => n.id))));
  const empty = document.createElement('vb-region') as VbRegionElement;
  const blank = { ...LATER, id: EMPTY_LATER };
  empty.render(blank, LATER_FRAME);
  empty.update(regionState(blank, view, fx.state, new Set()));
  empty.setAttribute('data-drop', '');
  const frames = el('div', 'g-frames vb-ground');
  frames.append(held, empty);
  body.append(group('Later, and a drop target',
    'Every board has a Later container, last, laid out as a grid; it shows while it holds a card. Here it holds two '
    + 'cards the person moved there. While a card is dragged, an empty Later shows too, and the container under '
    + 'the pointer that can take the card is lit (dashed accent line, soft fill).', frames));
}
