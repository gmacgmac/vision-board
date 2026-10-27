// Gallery entry for changed cards (cardUpdates flag, FE_02, D-018): the "N updates" tab at rest, a
// card mid-step with its change chips and the stepper in its footer, and "You're up to date". Shown
// only with the flag on, so ?flags=-cardUpdates draws the gallery as it was. The cards are real
// <vb-node> elements updated with `nodeState` and the fixture ledger's unseen versions, read through
// the conditions table as the board reads them; each stepper state is the one the page passes in.
import type { ViewNode } from '#format';
import type { CardUpdates, VbNodeElement } from '#ui';
import { nodeState } from '#ui';
import { cardList, el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

function card(n: ViewNode, fx: Fixture, at?: (steps: number) => number): VbNodeElement {
  const { state, cards, rows } = fx.updates;
  const u = cards.get(n.n!)!;
  const updates: CardUpdates = at ? { count: u.count, steps: u.steps, at: at(u.steps.length) } : { count: u.count };
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n);
  node.update(nodeState(n, state, undefined, false, { updates, proposals: rows.filter((r) => r.n === n.n) }));
  return node;
}

/** A card the agent added after the person first opened the board (`item.new`, newCards flag): NEW only. */
function newCard(n: ViewNode, fx: Fixture): VbNodeElement {
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n);
  node.update(nodeState(n, fx.updates.state, undefined, false, { new: fx.updates.fresh.has(n.n!) }));
  return node;
}

/** `fresh`: the freshCards flag, whose pink tab the first group's words describe (words the length of the
 * old ones, so the sections below keep their place and their screenshots). */
export function updatesSection(fx: Fixture, newCards: boolean, fresh = false): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'card-updates';
  box.setAttribute('aria-labelledby', 'feature-card-updates');
  const heading = el('h2', 'g-title', 'Changed cards');
  heading.id = 'feature-card-updates';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'mark_seen { n, ver }'), ' · feature flag cardUpdates (D-018, api.md 94), on by default · off with ?flags=-cardUpdates');
  const [rest, stepping, done, added] = fx.updates.view.nodes as [ViewNode, ViewNode, ViewNode, ViewNode];
  box.append(heading,
    el('p', 'g-desc', 'A card the agent changed since the person last looked, past version 1, says how many times. Selecting the card, or any act on it, counts as looking; Send does not.'),
    meta,
    group('The tab', `"3 updates" on the bottom edge, ${fresh ? 'small, its outline and words pink' : 'small and quiet in the muted ink'}, after any other tab there (here an out-of-date proposal); hovered or open it takes the CHANGED amber.`
      + ' With two tabs the card\'s buttons rise a little to leave them room. The card never changes size for it.',
      cardList('A changed card', card(rest, fx))),
    group('The stepper', 'The tab opens the card in place, one step per unseen version: when and who, the change chips (+ added, ~ changed, - removed) and what the text gained. The footer becomes "Update 3 of 3 · Back · Next"; each step shown marks its version seen; Esc folds it.',
      cardList('A changed card at its last step', card(stepping, fx, (k) => k - 1))),
    group('Up to date', 'After the last step the tab goes; "You\'re up to date" fades and the card folds back.',
      cardList('A changed card after its last step', card(done, fx, (k) => k))));
  if (newCards) box.append(group('A new card', 'A card the agent added after the person first opened the board says NEW on its bottom edge, in the toolbar chip\'s colour. It is a label, not a button; it never says "N updates". Selecting the card or any act on it takes it away; a Send, or the agent drawing again, never does. Feature flag newCards, on by default.',
      cardList('A new card', newCard(added, fx))));
  return box;
}
