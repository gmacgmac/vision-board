// Gallery entry for card size tiers (D-030), shown by default (nodeSize is on by default;
// gallery.html?flags=-nodeSize hides it). The three tiers as the auto rule picks them, the agent's suggestion and
// emphasis, then the person's own pick, which Width (the selection bar's, or the card's right-click menu) sets (D-099 3; there is no control on the node).
// Each card is a real <vb-node>, drawn with the tier the board would use (`tierOf`, through sizeTier) from the fixture
// ledger's "sizes" region.
import type { ViewNode } from '#format';
import type { BoardState } from '#actions';
import type { VbNodeElement } from '#ui';
import { nodeState } from '#ui';
import { tierOf } from '../board/cards/index.ts';
import { cardList, el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { REGION_SIZES } from './fixture.ts';

/** The first five cards show the tiers; the rest carry the person's pick or keep the automatic one. */
const TIER_SAMPLES = 5;

function sized(n: ViewNode, state: BoardState): VbNodeElement {
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, ownIds());
  node.update(nodeState(n, state, tierOf(n, state)));
  return node;
}

/** The person's XL pick (600px, the person's only: an agent never suggests it): a card of its own, with the pick set on a copy of the state. */
const XL_CARD: ViewNode = { id: 'size-xl', region: REGION_SIZES, kind: 'question', title: 'You widened this one to XL',
  body: 'XL is 600px, the widest width, and only the person picks it: Width on the selection bar or in the card\'s right-click menu.' };

export function sizeSection(fx: Fixture): HTMLElement {
  const cards = fx.view.nodes.filter((n) => n.region === REGION_SIZES).map((n) => sized(n, fx.state));
  cards.push(sized(XL_CARD, { ...fx.state, sizes: new Map([...fx.state.sizes, [XL_CARD.id, 'xl']]) }));
  const box = el('section', 'g-section');
  box.dataset.feature = 'nodeSize';
  box.setAttribute('aria-labelledby', 'feature-nodeSize');
  const heading = el('h2', 'g-title', 'Node size');
  heading.id = 'feature-nodeSize';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'data-size="s | m | l | xl"'), ' · feature flag nodeSize (D-030) · on by default · off with ?flags=-nodeSize');
  const canvas = (label: string, list: VbNodeElement[]) => {
    const c = el('div', 'g-sizes vb-ground');
    c.append(cardList(label, ...list));
    return c;
  };
  box.append(heading,
    el('p', 'g-desc', 'Cards take one of three widths. The body picks one (over 480 characters L; over 140, a code block or more than six list items M; otherwise S), the agent may suggest one, emphasis moves it one tier up, and the person\'s pick wins.'),
    meta,
    group('The three tiers, picked automatically', 'S (280px), M (360px) and L (464px) from the body alone, then a short card the agent asked to be M, and a short emphasised card (M).',
      canvas('Size tiers', cards.slice(0, TIER_SAMPLES))),
    group('The person\'s pick', 'Width, on the selection bar or in a card\'s right-click menu, sets the tier to S, M, L or XL (600px), or gives it back to Auto; a pick is the person\'s `size` act and wins over the agent\'s suggestion.',
      canvas('Picked and automatic sizes', cards.slice(TIER_SAMPLES))));
  return box;
}
