// Gallery entry for the agent's proposals (proposals flag, FE_01, D-018): the PROPOSAL tab at rest,
// the card popover open on an open proposal, on an out-of-date one and on two proposals on one card,
// the bar above the board and Accept all's list. Shown only with the flag on, so ?flags=-proposals
// draws the gallery as it was. The cards are real <vb-node> elements updated with `nodeState` and the
// fixture ledger's proposals, read through the conditions table as the board reads them; the open
// boxes are forced open (`data-open`, the attribute the popover sets). The bar and the list are the
// board's own Svelte components, mounted in the page flow.
import { mount } from 'svelte';
import type { ViewNode } from '../../../../packages/format/src/index.ts';
import type { VbNodeElement } from '../../../../packages/ui/src/index.ts';
import { nodeState } from '../../../../packages/ui/src/index.ts';
import ProposalsBar from '../shell/ProposalsBar.svelte';
import ConfirmList from '../shell/ConfirmList.svelte';
import { acceptAllPlan, acceptAllWords } from '../board/proposals.ts';
import { cardList, el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

function card(n: ViewNode, fx: Fixture, open: boolean): VbNodeElement {
  const { state, rows } = fx.proposals;
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n);
  node.update(nodeState(n, state, undefined, false, { proposals: rows.filter((r) => r.n === n.n) }));
  if (open) {
    node.querySelector('[data-pop="proposal"]')!.toggleAttribute('data-open', true);
    node.querySelector('[data-tab="proposal"]')!.setAttribute('aria-expanded', 'true');
  }
  return node;
}

function bar(fx: Fixture): HTMLElement {
  const host = el('div', 'g-access');
  mount(ProposalsBar, { target: host, props: { rows: fx.proposals.rows, placement: 'gallery', onreview: () => {}, onacceptall: () => {} } });
  return host;
}

function acceptAll(fx: Fixture): HTMLElement {
  const w = acceptAllWords(acceptAllPlan(fx.proposals.rows));
  const host = el('div', 'g-confirm vb-dialog');
  host.append(el('p', 'g-confirm-head', w.heading), el('p', 'vb-dialog-item', w.body));
  mount(ConfirmList, { target: host, props: { list: { items: w.items, skipped: w.skipped } } });
  return host;
}

export function proposalsSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'proposals';
  box.setAttribute('aria-labelledby', 'feature-proposals');
  const heading = el('h2', 'g-title', 'Agent proposals');
  heading.id = 'feature-proposals';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'ack · drop · reject, with proposal'), ' · feature flag proposals (D-018, api.md 93), on by default · off with ?flags=-proposals');
  const nodes = fx.proposals.view.nodes;
  const rest = nodes.filter((n) => n.kind === 'finding').map((n) => card(n, fx, false));
  const open = cardList('Cards with their proposal box open', ...nodes.filter((n) => n.kind !== 'finding').map((n) => card(n, fx, true)));
  open.classList.add('g-tips', 'g-tips-stack');
  box.append(heading,
    el('p', 'g-desc', 'An agent proposes to acknowledge or drop a card, say from an email the person pasted into the chat; only the person decides. The card gets a tab on its bottom edge and never changes size; the tab opens a box beside it.'),
    meta,
    group('The tab', 'PROPOSAL on the bottom edge. Hover or keyboard focus shows the box; a click or Enter opens it and moves focus into it; Esc or a press outside closes it and focus goes back to the tab.', cardList('A card with a proposal', ...rest)),
    group('The box', 'Who proposes, what, from where and when, then Reject and Accept. Out of date (the card changed since): the tab says so, the box says why, and Accept can\'t be pressed; Reject still clears it. Several on one card: newest first.', open),
    group('The bar', 'Above the board while any proposal is open: Review opens the first card\'s box; Accept all lists what it applies first.', bar(fx)),
    group('Accept all', 'The confirm step: the newest proposal on each card that is not out of date, in card order; the rest are not included, with why.', acceptAll(fx)));
  return box;
}
