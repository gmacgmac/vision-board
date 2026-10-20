// The open cards list's samples in the toolbar's gallery section (toolbar-section.ts; openList flag,
// open-list FE_01): the toolbar's own "N open" chip (shell/OpenChip.svelte) over the fixture's main
// board, its open cards worked out as the board does (`openCards`), at rest, hovered, focused and
// pressed, on a narrow toolbar (the number only), and with nothing open (the plain chip). The list
// itself is the browser's native one. Shown only with the flag on, so ?flags=-openList draws the
// section as it was.
import { mount } from 'svelte';
import { openCards } from '../../../../packages/actions/src/index.ts';
import type { OpenCard } from '../../../../packages/actions/src/index.ts';
import OpenChip from '../shell/OpenChip.svelte';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

type Look = 'hover' | 'focus' | 'pressed';

function sample(id: string, cards: readonly OpenCard[], look?: Look, narrow = false): HTMLElement {
  const host = el('div', 'g-toolbar vb-counts');
  host.toggleAttribute('data-narrow', narrow);
  mount(OpenChip, { target: host, props: { id, count: cards.length, cards, onpick: () => undefined, ...(look && { look }) } });
  return host;
}

/** The open list's groups (its states, a narrow toolbar, and nothing open) in one box, `data-sample="openList"`. */
export function openListGroups(fx: Fixture): HTMLElement {
  const cards = openCards(fx.view, fx.state);
  const looks = el('div', 'g-row');
  looks.append(sample('g-open-rest', cards), ...(['hover', 'focus', 'pressed'] as const).map((l) => sample(`g-open-${l}`, cards, l)));
  const out = el('div');
  out.dataset.sample = 'openList';
  out.append(
    group('Open cards list', 'With the openList flag the "N open" chip opens a list of the open cards, "12 · title" in board order, a long title cut with "…" and whole in its tooltip; choosing one goes to it as Go to card does (selected and focused, the board panning only when it is off screen), in a past version too. At rest, hovered, focused (the chip draws the focus ring) and pressed; the list is the browser\'s own.', looks),
    group('Open cards list, narrow', 'At 1500px and below the chip shows its number only; screen readers still hear "open".', sample('g-open-narrow', cards, undefined, true)),
    group('Nothing open', 'The plain chip: nothing to list.', sample('g-open-none', [])));
  return out;
}
