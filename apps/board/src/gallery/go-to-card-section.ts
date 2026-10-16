// Gallery entry for the Go to card box (goToCard flag; cortex-tasks/board/2026-10-15_board-app_go-to-card-number.md):
// the board's own Svelte component, mounted in the page flow in each state the box has: digits
// typed, a number with no card, and a retired card with the version to open. Its states come from
// the same state code the board uses (go-to-card.ts `createGoTo`), over fixed targets. Shown only
// with the flag on, so ?flags=-goToCard draws the gallery as it was.
import { mount } from 'svelte';
import GoToCard from '../shell/GoToCard.svelte';
import type { GoBox, GoTarget } from '../board/go-to-card.ts';
import { createGoTo } from '../board/go-to-card.ts';
import { el, group } from './dom.ts';

/** The box after typing `digits` on a board where they name `target`, and Enter when `enter`. */
function state(digits: string, target: GoTarget, enter: boolean): GoBox {
  let box: GoBox | null = null;
  const go = createGoTo({ find: () => target, arrive: () => {}, past: async () => {}, show: (b) => { box = b; } });
  go.open(digits[0]!);
  go.edit(digits);
  if (enter) go.enter();
  return box!;
}

function sample(box: GoBox): HTMLElement {
  const host = el('div', 'g-go');
  mount(GoToCard, { target: host, props: { box, placement: 'gallery' } });
  return host;
}

export function goToCardSection(): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'goToCard';
  box.setAttribute('aria-labelledby', 'feature-goToCard');
  const heading = el('h2', 'g-title', 'Go to card');
  heading.id = 'feature-goToCard';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'GoToCard'), ' · feature flag goToCard, on by default · off with ?flags=-goToCard · goAfterPause (off) also goes after a pause');
  box.append(heading,
    el('p', 'g-desc', 'A digit typed on the board opens this box at the board\'s bottom right, holding it. Enter selects and focuses the card, panning only when it is off screen; Backspace edits; Esc closes.'),
    meta,
    group('Typing', 'The digits so far; nothing goes until Enter.', sample(state('12', { to: 'card', id: '12' }, false))),
    group('No such card', 'A number the board never gave: the box says so and stays open.', sample(state('99', { to: 'none' }, true))),
    group('Removed', 'A retired card: it offers the version where the card last appeared, as the container\'s retired marker does.',
      sample(state('7', { to: 'retired', version: 42, until: 45 }, true))));
  return box;
}
