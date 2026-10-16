// Gallery entry for a past version of the board (versionView flag, navigation FE_01): the banner
// that shows under the header while a past version is on show, read-only, with Back to now. It is
// the board's own Svelte component, mounted in the page flow with a fixed version, the gallery
// board's latest past one. Then a checked and a crossed card as a past version draws them: each shows
// its mark, lit and inert (review polish FIX_01). Shown only with the flag on, so ?flags=-versionView
// draws the gallery as it was.
import { mount } from 'svelte';
import type { ItemStatus } from '../../../../packages/actions/src/index.ts';
import { statusOf } from '../../../../packages/actions/src/index.ts';
import type { VbNodeElement } from '../../../../packages/ui/src/index.ts';
import { nodeState } from '../../../../packages/ui/src/index.ts';
import VersionBanner from '../shell/VersionBanner.svelte';
import { cardList, el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { REGION_KINDS } from './fixture.ts';

/** A checked and a crossed question in a read-only world, as the board draws a past version
 *  (board.css `.vb-world[data-readonly]`). Rendered under their own ids, so none is on the page twice;
 *  their state is the fixture's. */
function pastCards(fx: Fixture): HTMLElement {
  const asks = fx.view.nodes.filter((n) => n.region === REGION_KINDS && n.kind === 'question' && !fx.cleared.has(n.n!));
  const drawn = (status: ItemStatus) => {
    const n = asks.find((x) => statusOf(fx.state, x.id) === status)!;
    const node = document.createElement('vb-node') as VbNodeElement;
    node.render({ ...n, id: `${n.id}-past` });
    node.update(nodeState(n, fx.state));
    return node;
  };
  const world = el('div', 'vb-world g-past');
  world.toggleAttribute('data-readonly', true);
  world.append(cardList('Answered cards in a past version', drawn('acknowledged'), drawn('dropped')));
  return world;
}

export function versionSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'versionView';
  box.setAttribute('aria-labelledby', 'feature-versionView');
  const heading = el('h2', 'g-title', 'Past versions');
  heading.id = 'feature-versionView';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'VersionBanner'), ' · feature flag versionView, on by default · off with ?flags=-versionView');
  const host = el('div', 'g-banner');
  mount(VersionBanner, { target: host, props: { run: fx.pastVersion, placement: 'gallery', onback: () => undefined } });
  box.append(heading,
    el('p', 'g-desc', 'The toolbar\'s version dropdown lists the open board\'s versions: now, then each run of the agent\'s drawing, newest first. Choosing a past one shows the board as it was then, read-only.'),
    meta,
    group('Banner', 'Under the header while a past version shows: which version and when, and Back to now (Esc does the same). Every control that would act is hidden on the board meanwhile.', host),
    group('Answered cards', 'A card answered by then keeps its ✓ or ✗, lit as now, so it never looks open: a mark, not a button, it takes no press and no focus. The other buttons are hidden.', pastCards(fx)));
  return box;
}
