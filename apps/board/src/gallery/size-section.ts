// Gallery entry for card size tiers (D-030), shown only with the nodeSize flag on
// (gallery.html?flags=nodeSize), so the gallery without the flag is unchanged. The three tiers as
// the auto rule picks them, the agent's suggestion and emphasis, then the size control at rest,
// with your pick, revealed and with keyboard focus. Each card is a real <vb-node>, drawn with the
// tier the board would use (`tierOf`, through sizeTier) from the fixture ledger's "sizes" region.
import type { ViewNode } from '../../../../packages/format/src/index.ts';
import type { VbNodeElement } from '../../../../packages/ui/src/index.ts';
import { nodeState } from '../../../../packages/ui/src/index.ts';
import { tierOf } from '../board/size.ts';
import { cardList, el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { REGION_SIZES } from './fixture.ts';

/** Samples drawn in a live state, keyed by title: the pill forced open, and a focus ring on L. */
const OPEN = new Set(['Who sends the migration email?', 'Does the credit show on the invoice?']);
const FOCUS_L = 'Does the credit show on the invoice?';
/** The first five cards show the tiers; the rest show the control. */
const TIER_SAMPLES = 5;

function sized(n: ViewNode, fx: Fixture): VbNodeElement {
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, { sizeControl: true });
  node.update(nodeState(n, fx.state, tierOf(n, fx.state)));
  if (OPEN.has(n.title)) {
    node.querySelector<HTMLElement>('.vb-size')!.dataset.open = '';
    node.querySelector('.vb-size-trig')!.setAttribute('aria-expanded', 'true');
  }
  if (n.title === FOCUS_L) node.querySelector('[data-size-pick="l"]')!.classList.add('g-focused');
  return node;
}

export function sizeSection(fx: Fixture): HTMLElement {
  const cards = fx.view.nodes.filter((n) => n.region === REGION_SIZES).map((n) => sized(n, fx));
  const box = el('section', 'g-section');
  box.dataset.feature = 'nodeSize';
  box.setAttribute('aria-labelledby', 'feature-nodeSize');
  const heading = el('h2', 'g-title', 'Node size');
  heading.id = 'feature-nodeSize';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'data-size="s | m | l"'), ' · feature flag nodeSize (D-030) · on with ?flags=nodeSize');
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
    group('The size control', 'At rest on automatic, at rest with your pick (◆ S), revealed on hover with the moved-by-you marker, and opened by keyboard with focus on L.',
      canvas('Size control states', cards.slice(TIER_SAMPLES))));
  return box;
}
