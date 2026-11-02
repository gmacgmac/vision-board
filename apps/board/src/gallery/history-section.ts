// Gallery entry for a card's history (cardHistory flag, card-polish FE_03), shown by default
// (gallery.html?flags=-cardHistory hides it): a card with the ⓘ at the far right of its footer, at
// rest; the box open on a card with a note and a reply, its rows from the fixture ledger's per-card
// times as the board reads them (packages/actions `cardTimeRows`); and the box open on a card with no
// row, the empty state. The cards are real <vb-node> elements from the notes board; the open boxes are
// forced open (`data-open`, the attribute the popover sets) and filled as the page fills them.
import type { ViewNode } from '#format';
import type { HistoryRow } from '#actions';
import { cardTimeRows } from '#actions';
import type { VbNodeElement } from '#ui';
import { HISTORY, historyMarkup, nodeState } from '#ui';
import { idOf } from '../board/card-numbers.ts';
import { cardList, el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { NOTES_BOARD } from './fixture.ts';

/** The notes board's cards the section draws: at rest, open with rows, open with none. */
const AT_REST = 'Note times';
const WITH_ROWS = 'A reply since you put them away';
const EMPTY = 'A note not yet sent';

function card(n: ViewNode, fx: Fixture, rows?: readonly HistoryRow[]): VbNodeElement {
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, { ...ownIds(), history: true });
  node.update(nodeState(n, fx.notes.state, undefined, false, fx.notes.cards.get(n.n!)));
  if (rows) {
    const box = node.querySelector<HTMLElement>(`[data-pop="${HISTORY}"]`)!;
    box.querySelector('.vb-history-body')!.innerHTML = historyMarkup(rows, new Date());
    box.toggleAttribute('data-open', true);
    node.querySelector('button.vb-history')!.setAttribute('aria-expanded', 'true');
  }
  return node;
}

export function historySection(fx: Fixture): HTMLElement {
  const nodes = fx.notes.view.nodes;
  const named = (title: string) => nodes.find((n) => n.title === title)!;
  const rows = cardTimeRows(fx.ledger, idOf(fx.ledger, NOTES_BOARD, named(WITH_ROWS).n!)!);
  const box = el('section', 'g-section');
  box.dataset.feature = 'cardHistory';
  box.setAttribute('aria-labelledby', 'feature-cardHistory');
  const heading = el('h2', 'g-title', 'Card history');
  heading.id = 'feature-cardHistory';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'cardTimeRows(state, id)'), ' · feature flag cardHistory, on by default · off with ?flags=-cardHistory');
  const open = cardList('Cards with their history open', card(named(WITH_ROWS), fx, rows), card(named(EMPTY), fx, []));
  open.classList.add('g-tips', 'g-tips-stack');
  box.append(heading,
    el('p', 'g-desc', 'When things happened to a card: first drawn and each update, each note sent, each agent reply, ✓, ✗ and reopened, and its app allowed or stopped. Times only: no note or reply text, and never the person\'s flag or hidden notes.'),
    meta,
    group('The ⓘ', 'At the far right of every card\'s footer, 24px like the flag. Hover or keyboard focus shows the box; a click or Enter opens it and moves focus into it; Esc or a press outside closes it and focus goes back to the ⓘ.', cardList('A card with its ⓘ', card(named(AT_REST), fx))),
    group('The box', 'Newest first, a time and one line each, the agent\'s name on its rows. A row naming a note or a reply is a link: it closes the box and rings that note on the card. Then the empty state.', open));
  return box;
}
