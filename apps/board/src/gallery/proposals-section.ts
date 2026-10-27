// Gallery entry for the agent's proposals (proposals flag, FE_01, D-018): the PROPOSAL tab at rest,
// the card popover open on an open proposal, on an out-of-date one and on two proposals on one card,
// the notice over the board and its pill, and Accept all's list. Shown only with the flag on, so ?flags=-proposals
// draws the gallery as it was. The cards are real <vb-node> elements updated with `nodeState` and the
// fixture ledger's proposals, read through the conditions table as the board reads them; the open
// boxes are forced open (`data-open`, the attribute the popover sets). The notice and the list are the
// board's own Svelte components; the notice and its pill sit over a card on the board's ground.
import { mount } from 'svelte';
import type { ViewNode } from '#format';
import type { VbNodeElement } from '#ui';
import { nodeState } from '#ui';
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

/** The notice, or its pill, over a card on the board's ground, so the see-through shows. */
function notice(fx: Fixture, n: ViewNode, collapsed: boolean): HTMLElement {
  const stage = el('div', 'g-bubble-stage g-notice-stage vb-ground');
  const c = card(n, fx, false);
  c.style.transform = 'translate(48px, 18px)';
  stage.append(cardList(collapsed ? 'A card under the pill' : 'A card under the notice', c));
  mount(ProposalsBar, { target: stage, props: { rows: fx.proposals.rows, placement: 'gallery', collapsed, onreview: () => {}, onacceptall: () => {} } });
  return stage;
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
  // The fixture draws the three cards shown with their box open first, then the one at rest.
  const nodes = fx.proposals.view.nodes;
  const atRest = nodes.at(-1)!;
  const rest = [card(atRest, fx, false)];
  const open = cardList('Cards with their proposal box open', ...nodes.slice(0, -1).map((n) => card(n, fx, true)));
  open.classList.add('g-tips', 'g-tips-stack');
  box.append(heading,
    el('p', 'g-desc', 'An agent proposes ✓ (Check) or ✗ (Cross) on a card, say from an email the person pasted into the chat; only the person decides. The card gets a tab on its bottom edge and never changes size; the tab opens a box beside it.'),
    meta,
    group('The tab', 'PROPOSAL on the bottom edge. Hover or keyboard focus shows the box; a click or Enter opens it and moves focus into it; Esc or a press outside closes it and focus goes back to the tab.', cardList('A card with a proposal', ...rest)),
    group('The box', 'Who proposes, what, from where and when, then Reject and Accept. Out of date (the card changed since): the tab says so, the box says why, and Accept can\'t be pressed; Reject still clears it. Several on one card: newest first.', open),
    group('The notice', 'Over the board\'s top left while any proposal is open, see-through, and it moves nothing: Review opens the first card\'s box; Accept all lists what it applies first; Hide or Esc collapses it to the pill, kept for this viewer.', notice(fx, atRest, false)),
    group('The pill', 'The notice hidden, in the same place: the count, kept up to date. A press brings the notice back.', notice(fx, atRest, true)),
    group('Accept all', 'The confirm step: the newest proposal on each card that is not out of date, in card order; the rest are not included, with why.', acceptAll(fx)));
  return box;
}
