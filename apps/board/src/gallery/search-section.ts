// Gallery entry for search in the Go to card box (cardSearch flag, SEARCH_02; tracker M7): the
// board's own Svelte box in each search state (empty, with a query and its count, stepped to a later
// match, no matches), and a container of the marks board drawn by the board's own drawing with the
// rings and the dim on it. Every state comes from the same state code the board uses
// (go-to-card.ts `createGoTo` over `#actions` boardSearchDocs). Shown only with the goToCard and
// cardSearch flags on; last in the gallery, so no section above moves.
import { mount } from 'svelte';
import { boardSearchDocs } from '#actions';
import GoToCard from '../shell/GoToCard.svelte';
import type { GoBox, GoTo } from '../board/find/index.ts';
import { createGoTo } from '../board/find/index.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { MARKS_BOARD } from './fixture.ts';
import { miniBoard } from './mini-board.ts';

/** The container drawn with the rings and the dim: three cards, two matching "an" ("annual", "change"). */
const REGION = 'flagged';
const SUFFIX = '-search';

/** A Go to card box searching the marks board; `marks` puts its rings and dim on a drawn board. */
function searchBox(fx: Fixture, show: (b: GoBox | null) => void, marks?: { world: Element; card(id: string): Element | undefined }): GoTo {
  const docs = boardSearchDocs(fx.ledger, MARKS_BOARD, fx.marks.view);
  const none = { toggleAttribute: () => false, setAttribute: () => {}, removeAttribute: () => {} };
  return createGoTo({
    find: () => ({ to: 'none' }), arrive: () => {}, past: async () => {}, show,
    search: { key: () => docs, docs: () => docs, reveal: () => {}, world: marks?.world ?? none, card: (id) => (marks ? marks.card(id) : none) },
  });
}

/** The box after `/`, typing `query` and stepping `steps` matches on. */
function state(fx: Fixture, query: string, steps = 0): GoBox {
  let box: GoBox | null = null;
  const go = searchBox(fx, (b) => { box = b; });
  go.open('/');
  if (query) go.edit(query);
  for (let i = 0; i < steps; i += 1) go.step(1);
  return box!;
}

function sample(box: GoBox): HTMLElement {
  const host = el('div', 'g-go');
  mount(GoToCard, { target: host, props: { box, placement: 'gallery', search: true } });
  return host;
}

/** The container with the search for "an" marked on it, as the board marks it. */
function board(fx: Fixture): HTMLElement {
  return miniBoard(fx.marks, REGION, {
    label: 'Cards found by "an"', suffix: SUFFIX,
    then: (host, drawing) => {
      const go = searchBox(fx, () => {}, { world: host.querySelector('.vb-world')!, card: (id) => drawing.cards.get(`${id}${SUFFIX}`) });
      go.open('/');
      go.edit('an');
    },
  });
}

export function searchSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'cardSearch';
  box.setAttribute('aria-labelledby', 'feature-cardSearch');
  const heading = el('h2', 'g-title', 'Search the board');
  heading.id = 'feature-cardSearch';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'GoToCard, data-search, data-found'), ' · feature flag cardSearch, on by default · off with ?flags=-cardSearch');
  box.append(heading,
    el('p', 'g-desc', '/ opens the box empty, headed Find a card; it takes a card number or words. Words ring the matching cards, best first, and dim the rest; '
      + '↓ and ↑ step through them, Enter goes to the current one, Esc clears.'),
    meta,
    group('Empty', 'Opened by /: the field says what it takes.', sample(state(fx, ''))),
    group('Matches', 'One sentence: the count, then the current match\'s card and the part that matched.', sample(state(fx, 'names'))),
    group('Stepped', 'After ↓: the second match is current.', sample(state(fx, 'plan', 1))),
    group('No matches', 'Nothing is ringed or dimmed.', sample(state(fx, 'zebra'))),
    group('On the board', 'The matches in a thin amber ring; the current one thicker, with a second ring outside it and a halo. The other cards, the container and its connectors dim.', board(fx)));
  return box;
}
