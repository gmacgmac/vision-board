// Gallery entry for parking and replies (handover and cardReplies flags, FE_03, D-020): a card in Later
// whose handover is owed ("Awaiting" with its tip), one whose handover is written (the HANDOVER tab and
// its box), an agent's reply under the note it answers, one that names no note, and a reply under a
// container's note. Shown only with a flag on, so ?flags=-handover,-cardReplies draws the gallery as it
// was. The cards and the frame are real <vb-node> and <vb-region> elements updated with `nodeState` and
// `regionState` from the fixture ledger, read as the board reads it (parking.ts); the open box and the tip
// are forced open with the attributes the behaviours set.
import type { ViewNode } from '#format';
import type { VbNodeElement, VbRegionElement } from '#ui';
import { nodeState, regionState } from '#ui';
import { cardList, el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';

function card(n: ViewNode, fx: Fixture, look: 'tip' | 'box' | 'rest' = 'rest'): VbNodeElement {
  const { state, cards } = fx.parking;
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, ownIds());
  node.update(nodeState(n, state, undefined, false, cards.get(n.n!)));
  if (look === 'tip') node.toggleAttribute('data-status-tip-open', true);
  if (look === 'box') {
    node.querySelector('[data-pop="handover"]')!.toggleAttribute('data-open', true);
    node.querySelector('[data-tab="handover"]')!.setAttribute('aria-expanded', 'true');
  }
  return node;
}

/** The container note "Answered" with the agent's reply under it, its block shown. */
function answeredFrame(fx: Fixture): HTMLElement {
  const { view, state, owed } = fx.containerNotes;
  const region = view.regions.find((r) => r.id === 'n-answered')!;
  const f = document.createElement('vb-region') as VbRegionElement;
  f.render(region, ownIds());
  f.update(regionState(region, view, state, new Set(view.nodes.map((n) => n.id)), undefined, owed, fx.parking.containerReplies));
  f.noteShown = true;
  const box = el('div', 'g-frames vb-ground');
  box.append(f);
  return box;
}

export function parkingSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'parking';
  box.setAttribute('aria-labelledby', 'feature-parking');
  const heading = el('h2', 'g-title', 'Parking and replies');
  heading.id = 'feature-parking';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'park · reply, with to'), ' · feature flags handover and cardReplies (D-020, api.md 36), on by default · off with ?flags=-handover,-cardReplies');
  const [awaiting, parked, answered, orphan] = fx.parking.view.nodes as [ViewNode, ViewNode, ViewNode, ViewNode];
  const open = cardList('A card with its handover open', card(parked, fx, 'box'));
  open.classList.add('g-tips', 'g-tips-stack');
  box.append(heading,
    el('p', 'g-desc', 'A card saved for later waits for the agent\'s handover; once it is written the card opens it. The agent\'s replies show under the notes they answer.'),
    meta,
    group('Awaiting', 'Until the agent writes the handover, the footer says "Awaiting" in place of "Saved for later"; hovering it tells "Awaiting context". The card\'s name says it too.',
      cardList('Cards awaiting their handover', card(awaiting, fx), card(awaiting, fx, 'tip'))),
    group('Handover', 'A HANDOVER tab on the bottom edge, shown here with its box open. Hover or keyboard focus shows the box; a click or Enter opens it. Situation, Background, Assessment and Recommendation as headed sections, then the sources; the box scrolls when it is long.',
      open),
    group('Replies', 'The agent\'s reply under the note it answers, as the note is: Markdown, cut at three lines, its full text on hover or focus. Read-only. A reply that names no note takes its place by time among the notes.',
      cardList('Cards with replies', card(answered, fx), card(orphan, fx))),
    group('Reply to a container note', 'Under the note in the container\'s note block, cut at three lines until "Show all".', answeredFrame(fx)));
  return box;
}
