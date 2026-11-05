// Gallery entry for one tab for updates and a proposal (oneChangeTab flag, on by default; point 444): the changed
// cards board's cards (fixture.ts `updates`) with their unseen versions and a proposal, as the page passes them
// in: the one amber tab at rest, out of date, and its box open with the proposal first and the step beneath (the
// box forced open, `data-open`, as the proposals section does). Last of all, so no section moves.
import type { ViewNode } from '#format';
import { flagOn } from '#format';
import type { CardProposal, CardUpdates, VbNodeElement } from '#ui';
import { nodeState } from '#ui';
import { cardList, el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { pageFlags } from '../flags.ts';

/** A proposal made on the card's latest version, as the page's proposal rows read it. */
const FRESH: CardProposal = { seq: 9001, action: 'ack', reason: 'The client agreed on the call.', when: 'Nov 5, 16:10', stale: false, agent: 'Pricing chat', source: 'Email pasted in chat' };

function card(n: ViewNode, fx: Fixture, proposals: readonly CardProposal[], open = false): VbNodeElement {
  const { state, cards } = fx.updates;
  const u = cards.get(n.n!)!;
  const updates: CardUpdates = open ? { count: u.count, steps: u.steps, at: 0 } : { count: u.count };
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, ownIds());
  node.update(nodeState(n, state, undefined, false, { updates, proposals, oneTab: true }));
  if (open) {
    node.querySelector('[data-pop="proposal"]')!.toggleAttribute('data-open', true);
    node.querySelector('[data-tab="proposal"]')!.setAttribute('aria-expanded', 'true');
  }
  return node;
}

/** Cards in a list padded so their bottom tabs, and an open box, show in the section's screenshot. */
function list(label: string, ...cards: VbNodeElement[]): HTMLElement {
  const l = cardList(label, ...cards);
  l.style.padding = 'var(--vb-space-4) var(--vb-space-1) var(--vb-space-5)'; // room for the hung tab and its target
  return l;
}

/** Room under a card whose box is open: the box is beside the card and taller than it. */
function open(l: HTMLElement): HTMLElement {
  l.style.paddingBottom = 'calc(3 * var(--vb-space-6))';
  return l;
}

export function oneTabSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'oneChangeTab';
  box.setAttribute('aria-labelledby', 'feature-oneChangeTab');
  const heading = el('h2', 'g-title', 'One tab for an update and a proposal');
  heading.id = 'feature-oneChangeTab';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, '[data-tab="proposal"][data-updated]'), ' · feature flag oneChangeTab (point 444), on by default · off with ?flags=-oneChangeTab');
  const [rest, stepping] = fx.updates.view.nodes as [ViewNode, ViewNode];
  const stale = fx.updates.rows.filter((r) => r.n === rest.n);
  box.append(heading,
    el('p', 'g-desc', 'A card the agent changed and proposed on shows one tab, not two: something here needs you. Opening it shows all of it in order of what to do.'),
    meta,
    group('The tab', `"1 update · proposal" in the updated amber, named "1 update and a proposal on item N"; "· out of date" when every proposal is, as the proposal tab says. ${flagOn('updateSignals', pageFlags()) ? 'It hangs below the footer at a third of the card, so the buttons stay where they are.' : 'On a small card the buttons rise a little, as for two tabs.'}`,
      list('Cards with an update and a proposal', card(stepping, fx, [FRESH]), card(rest, fx, stale))),
    group('Opened', 'The proposal first, Reject and Accept as from the proposal tab; the update\'s step beneath it, Back and Next in the box. Opening it shows the first step (and marks it seen); closing it folds the steps. A proposal alone and updates alone keep their own tabs.',
      open(list('The box open on an update and a proposal', card(stepping, fx, [FRESH], true)))));
  return box;
}
