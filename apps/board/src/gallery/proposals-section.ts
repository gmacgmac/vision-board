// Gallery entry for the agent's proposals (proposals flag, FE_01, D-018): the PROPOSAL tab at rest,
// the card popover open on an open proposal, on an out-of-date one and on two proposals on one card,
// the notice over the board and its pill, and Accept all's list. Shown only with the flag on, so ?flags=-proposals
// draws the gallery as it was. The cards are real <vb-node> elements updated with `nodeState` and the
// fixture ledger's proposals, read through the conditions table as the board reads them; the open
// boxes are forced open (`data-open`, the attribute the popover sets). The notice and the list are the
// board's own Svelte components; the notice and its pill sit over a card on the board's ground.
// Review's list (reviewList flag, REVIEW_01) is a section of its own, last of all in the gallery
// (main.ts), so the sections above keep their place.
import { mount } from 'svelte';
import type { ViewNode } from '#format';
import type { VbNodeElement } from '#ui';
import { nodeState } from '#ui';
import { ProposalsBar } from '../board/chrome/index.ts';
import ConfirmList from '../shell/ConfirmList.svelte';
import type { ProposalRow } from '#actions';
import { acceptAllPlan } from '#actions';
import { acceptAllWords, proposes } from '../board/cards/index.ts';
import { reviewRows } from '../board/find/index.ts';
import { cardList, el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';

function card(n: ViewNode, fx: Fixture, open: boolean): VbNodeElement {
  const { state, rows } = fx.proposals;
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, ownIds());
  node.update(nodeState(n, state, undefined, false, { proposals: rows.filter((r) => r.n === n.n) }));
  if (open) {
    node.querySelector('[data-pop="proposal"]')!.toggleAttribute('data-open', true);
    node.querySelector('[data-tab="proposal"]')!.setAttribute('aria-expanded', 'true');
  }
  return node;
}

/** The notice, or its pill, over a card on the board's ground, so the see-through shows. */
function notice(fx: Fixture, n: ViewNode, collapsed: boolean, rows: readonly ProposalRow[] = fx.proposals.rows, look?: 'focus' | 'hover'): HTMLElement {
  const stage = el('div', 'g-bubble-stage g-notice-stage vb-ground');
  const c = card(n, fx, false);
  c.style.transform = 'translate(48px, 18px)';
  stage.append(cardList(collapsed ? 'A card under the pill' : 'A card under the notice', c));
  mount(ProposalsBar, { target: stage, props: { rows, placement: 'gallery', ids: ownIds().idPrefix, collapsed, ...(look && { look }), onreview: () => {}, onacceptall: () => {} } });
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

/** The fixture's proposals with their cards' titles, as the page gives the notice with the reviewList flag on. */
const titled = (fx: Fixture): ProposalRow[] =>
  fx.proposals.rows.map((r) => ({ ...r, title: fx.proposals.view.nodes.find((n) => n.n === r.n)?.title ?? '' }));

/** The list as the browser draws it open (a native list box with the same rows), beside the notice. */
function openList(rows: readonly ProposalRow[]): HTMLElement {
  const list = el('select', 'vb-select');
  list.style.height = 'auto'; // a list box shows its rows; the select's own height is a closed one's
  list.size = reviewRows(rows, proposes).length;
  list.setAttribute('aria-label', 'The Review list, drawn open');
  for (const r of reviewRows(rows, proposes)) list.append(Object.assign(el('option', undefined, r.text), { value: r.value, title: r.title ?? '' }));
  return list;
}

/** Review's list (reviewList flag, REVIEW_01, ruling 319), a section of its own; the gallery puts it last of all (main.ts). */
export function reviewListSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'reviewList';
  box.setAttribute('aria-labelledby', 'feature-reviewList');
  const heading = el('h2', 'g-title', 'Review list');
  heading.id = 'feature-reviewList';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'propose'), ' · feature flag reviewList (ruling 319), on by default · off with ?flags=-reviewList');
  const rows = titled(fx);
  const atRest = fx.proposals.view.nodes.at(-1)!;
  const open = el('div', 'g-row');
  open.append(notice(fx, atRest, false, rows, 'focus'), openList(rows));
  box.append(heading,
    el('p', 'g-desc', 'With proposals on more than one card, the notice\'s Review is a list of those cards, like the open and new lists: "12 · title · what it proposes", in card order, a long title or proposal cut with "…" and whole in its tooltip. Choosing one goes to the card as Go to card does (selected and focused, its marks kept), zooms in when the board is too far out for its controls, and opens its proposal box with focus in it. With one card, Review goes straight to it.'),
    meta,
    group('Review at rest', 'The same size and place as the button it replaces; the list is the browser\'s own.', notice(fx, atRest, false, rows)),
    group('Review in focus, and the list open', 'The notice with Review focused (the ring), and the list as the browser opens it, drawn here as an open list box.', open));
  return box;
}
