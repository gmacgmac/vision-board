// Gallery entry for changed cards (cardUpdates flag, FE_02, D-018): "N updates" on the change badge at rest, a
// card mid-step with its change chips and the stepper in its history box (planner's call 9), and "You're up to date". Shown
// only with the flag on, so ?flags=-cardUpdates draws the gallery as it was. The cards are real
// <vb-node> elements updated with `nodeState` and the fixture ledger's unseen versions, read through
// the conditions table as the board reads them; each stepper state is the one the page passes in.
import type { ViewNode } from '#format';
import type { CardUpdates, VbNodeElement } from '#ui';
import { nodeState } from '#ui';
import { cardList, el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';

function card(n: ViewNode, fx: Fixture, at?: (steps: number) => number): VbNodeElement {
  const { state, cards, rows } = fx.updates;
  const u = cards.get(n.n!)!;
  const updates: CardUpdates = at ? { count: u.count, steps: u.steps, at: at(u.steps.length) } : { count: u.count };
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, ownIds());
  node.update(nodeState(n, state, undefined, false, { updates, proposals: rows.filter((r) => r.n === n.n) }));
  if (at) {
    // The stepper lives in the history box the badge opens, drawn open as the page opens it (mark-boxes.ts).
    const box = node.querySelector<HTMLElement>('[data-pop="history"]')!;
    box.toggleAttribute('data-open', true);
    box.dataset.side = 'right';
    node.querySelector('[data-mark="badge"]')?.setAttribute('aria-expanded', 'true');
  }
  return node;
}

/** A card the agent added after the person first opened the board (`item.new`, newCards flag): NEW only. */
function newCard(n: ViewNode, fx: Fixture): VbNodeElement {
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, ownIds());
  node.update(nodeState(n, fx.updates.state, undefined, false, { new: fx.updates.fresh.has(n.n!) }));
  return node;
}

/** `fresh`: the freshCards flag, whose pink tab (amber with updateSignals, read from the page's flags) the first group's words describe (words the length of the
 * old ones, so the sections below keep their place and their screenshots). */
export function updatesSection(fx: Fixture, newCards: boolean): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'card-updates';
  box.setAttribute('aria-labelledby', 'feature-card-updates');
  const heading = el('h2', 'g-title', 'Changed cards');
  heading.id = 'feature-card-updates';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'mark_seen { n, ver }'), ' · feature flag cardUpdates (D-018, api.md 94), on by default · off with ?flags=-cardUpdates');
  const [rest, stepping, done, added] = fx.updates.view.nodes as [ViewNode, ViewNode, ViewNode, ViewNode];
  const open = (label: string, ...cards: VbNodeElement[]) => {
    const list = cardList(label, ...cards);
    list.classList.add('g-tips', 'g-tips-stack');
    return list;
  };
  box.append(heading,
    el('p', 'g-desc', 'A card the agent changed since the person last looked, past version 1, says how many times. Selecting the card, or any act on it, counts as looking; Send does not.'),
    meta,
    group('The badge', '"3 updates" on the change badge at the bottom left; once seen it settles to a quiet "vN". A node that never changed has no badge. The node never changes size for it.',
      cardList('A changed card', card(rest, fx))),
    group('The stepper', 'The badge (or H) opens the history box with the stepper on top, one step per unseen version: when and who, the change chips (+ added, ~ changed, - removed) and what the text gained, then "Update 3 of 3 · Back · Next"; each step shown marks its version seen; Esc closes the box.',
      open('A changed card at its last step', card(stepping, fx, (k) => k - 1))),
    group('Up to date', 'After the last step "You\'re up to date" shows, then the stepper folds away.',
      open('A changed card after its last step', card(done, fx, (k) => k))));
  if (newCards) box.append(group('A new card', 'A card the agent added after the person first opened the board says "New" on its badge. It never says "N updates". Selecting the card or any act on it takes it away; a Send, or the agent drawing again, never does. Feature flag newCards, on by default.',
    cardList('A new card', newCard(added, fx))));
  return box;
}
