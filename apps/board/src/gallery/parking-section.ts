// Gallery entry for parking and replies (handover and cardReplies flags, FE_03, D-020): a card in Later
// whose handover is owed (the quiet Awaiting tab on its bottom edge), one whose handover is written (a "Handover"
// section of its body, DESIGN_01 review), nodes with the agent's replies (their notes mark; the replies are read in
// the conversation box, note bubble section), and a reply under a container's note. Shown only with a flag on, so
// ?flags=-handover,-cardReplies draws the gallery as it was. The cards and the frame are real <vb-node> and
// <vb-region> elements updated with `nodeState` and `regionState` from the fixture ledger, read as the board reads it
// (parking.ts).
import type { ViewNode } from '#format';
import type { VbNodeElement, VbRegionElement } from '#ui';
import { nodeState, regionState } from '#ui';
import { cardList, el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';

function card(n: ViewNode, fx: Fixture): VbNodeElement {
  const { state, cards } = fx.parking;
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, ownIds());
  node.update(nodeState(n, state, undefined, false, cards.get(n.n!)));
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
  box.append(heading,
    el('p', 'g-desc', 'A card saved for later waits for the agent\'s handover; once it is written it is part of the node. The agent\'s replies are read in the node\'s conversation, under the notes they answer.'),
    meta,
    group('Awaiting', 'Until the agent writes the handover, a quiet grey "Awaiting" tab sits on the bottom edge, where New and the updates sit; its tip says "Awaiting context". The card\'s name says it too.',
      cardList('A card awaiting its handover', card(awaiting, fx))),
    group('Handover', 'Once written, the handover is a "Handover" section of the node\'s body: Situation, Background, Assessment and Recommendation as headed sections, then the sources. The Awaiting tab goes.',
      cardList('A card with its handover', card(parked, fx))),
    group('Replies', 'A node with the agent\'s replies: its notes mark counts the notes and fills while a reply is unread. The replies are read in its conversation box, each under the note it answers, as Markdown, read-only; a reply that names no note takes its place by time among the notes.',
      cardList('Cards with replies', card(answered, fx), card(orphan, fx))),
    group('Reply to a container note', 'Under the note in the container\'s note block, cut at three lines until "Show all".', answeredFrame(fx)));
  return box;
}
