// Gallery entry for the person's Remove card and Remove container (personRemove flag, N24 rulings
// 1-4, api.md 141): a container's settings menu, open, ending with Remove container, and the same on a
// locked board, paused in place; then the confirm, as the shell's dialog shows it, with the words the
// board works out from the fixture ledger (remove-words.ts): one card, several cards still owed an
// answer, and a whole container. Remove card on the selection bar is drawn in the selection bar's own
// samples. Shown only with the flag on, so ?flags=-personRemove draws the gallery as it was.
import { mount } from 'svelte';
import type { BoardState } from '../../../../packages/actions/src/index.ts';
import type { VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { regionState } from '../../../../packages/ui/src/index.ts';
import ConfirmList from '../shell/ConfirmList.svelte';
import type { RemoveWords } from '../board/remove-words.ts';
import { cardsWords, containerWords } from '../board/remove-words.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { BOARD } from './fixture.ts';

/** The container whose menu is drawn open (the marks board's flagged cards). */
const REGION = 'flagged';
/** The main board's container of other node states, and three of its cards still owed an answer. */
const OTHER = 'other';
const OWED = [33, 34, 35];

/** The marks board's flagged container, its settings menu open, from `state`. */
function frame(fx: Fixture, state: BoardState): HTMLElement {
  const { view } = fx.marks;
  const region = view.regions.find((r) => r.id === REGION)!;
  const f = document.createElement('vb-region') as VbRegionElement;
  f.render(region, { remove: true });
  f.update(regionState(region, view, state, new Set(view.nodes.map((n) => n.id))));
  const frames = el('div', 'g-frames g-remove-frames vb-ground');
  frames.append(f);
  f.showPanel('menu', { focus: false });
  return frames;
}

/** The confirm, as the shell's dialog shows it: Cancel first, so Enter never removes. */
function confirm(w: RemoveWords): HTMLElement {
  const host = el('div', 'g-confirm vb-dialog');
  host.append(el('p', 'g-confirm-head', w.heading), el('p', 'vb-dialog-item', w.body));
  if (w.list) mount(ConfirmList, { target: host, props: { list: w.list } });
  const actions = el('div', 'vb-dialog-actions');
  const button = (text: string, primary = false) => {
    const b = el('button', primary ? 'vb-btn vb-btn-primary' : 'vb-btn', text);
    b.type = 'button';
    return b;
  };
  actions.append(button('Cancel'), button(w.confirm, true));
  host.append(actions);
  return host;
}

export function removeSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'personRemove';
  box.setAttribute('aria-labelledby', 'feature-personRemove');
  const heading = el('h2', 'g-title', 'Remove cards and containers');
  heading.id = 'feature-personRemove';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'retire_cards { cards | region }'), ' · feature flag personRemove (api.md 141), on by default · off with ?flags=-personRemove');
  const title = fx.view.regions.find((r) => r.id === OTHER)!.title;
  box.append(heading,
    el('p', 'g-desc', 'The person takes cards, or a whole container, off the board, as an agent retires them: they leave the board and keep their history and numbers in the ledger. Remove card is on the selection bar (Delete or Backspace); Remove container ends a container\'s settings menu. Each asks first.'),
    meta,
    group('Remove container', 'The last row of the cog\'s menu. It asks first, naming the container and how many cards go with it.', frame(fx, fx.marks.state)),
    group('On a locked board', 'Paused in place with the other rows that change the board; a press says why.', frame(fx, { ...fx.marks.state, locked: true as const })),
    group('The confirm: one card', 'Its number and title, and a warning when the agent still owes it an answer. Cancel is focused first.', confirm(cardsWords(fx.ledger, BOARD, [OWED[0]!]))),
    group('Several cards', 'Counted and listed in number order; each card still owed an answer is named.', confirm(cardsWords(fx.ledger, BOARD, OWED))),
    group('A container', 'Its title and how many cards go with it, the cards listed, and every warning.', confirm(containerWords(fx.ledger, BOARD, OTHER, title))));
  return box;
}
