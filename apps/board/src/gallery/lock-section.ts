// Gallery entry for locking a board (lockBoard flag, N40 rulings 1-6, api.md 138-140): the "⋯" menu's
// Lock board and, on a locked board, Unlock board; the toolbar's "Locked" beside the board's name;
// then a locked board's cards and container, drawn by the real <vb-node> and <vb-region> from the
// fixture's marks board with `BoardState.locked` set, as the board draws them: every control that
// changes the board paused in place (aria-disabled, the quiet look), the flag still usable; and Send
// to agent paused with the reason as its title. Shown only with the flag on, so ?flags=-lockBoard
// draws the gallery as it was.
import { mount } from 'svelte';
import type { BoardState } from '#actions';
import { LOCKED_PERSON } from '#actions';
import type { VbNodeElement, VbRegionElement } from '#ui';
import { nodeState, regionState } from '#ui';
import { LockedChip } from '../board/chrome/index.ts';
import { SendButton } from '../board/chrome/index.ts';
import { ToolbarMenu } from '../board/chrome/index.ts';
import { chromeSample } from './chrome-sample.ts';
import { cardList, el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

const none = () => undefined;

/** The "⋯" menu, open, without the board's ids: Lock board, or Unlock board on a locked board. */
function menu(locked: boolean): HTMLElement {
  const host = el('div', 'g-toolbar g-archive-menu');
  host.toggleAttribute('data-menu-open', true);
  mount(ToolbarMenu, { target: host, context: chromeSample(), props: { onhide: none, onlock: none, locked, open: true, placement: 'gallery' } });
  return host;
}

/** The toolbar's title line on a locked board: the name, its version, then "Locked". */
function title(): HTMLElement {
  const host = el('div', 'g-toolbar g-lock-title');
  host.append(el('span', 'vb-title', 'Marks'), el('span', 'vb-chip', 'v41'));
  mount(LockedChip, { target: host, props: { locked: true } });
  return host;
}

/** The marks board's flag container, from `state`: its frame (the layout icons, the widths switch
 * absent here, the grip and Comment), then its cards. */
function board(fx: Fixture, state: BoardState): HTMLElement[] {
  const { view } = fx.marks;
  const region = view.regions.find((r) => r.id === 'flagged')!;
  const frame = document.createElement('vb-region') as VbRegionElement;
  frame.render(region);
  frame.update(regionState(region, view, state, new Set(view.nodes.map((n) => n.id))));
  const cards = view.nodes.filter((n) => n.region === 'flagged').map((n) => {
    const node = document.createElement('vb-node') as VbNodeElement;
    node.render(n, { flag: true, sizeControl: true });
    node.update(nodeState(n, state, 'm'));
    return node;
  });
  const frames = el('div', 'g-frames vb-ground');
  frames.append(frame);
  const canvas = el('div', 'g-sizes vb-ground');
  canvas.append(cardList('A locked board\'s cards', ...cards));
  return [frames, canvas];
}

function send(): HTMLElement {
  const host = el('div', 'g-toolbar');
  mount(SendButton, { target: host, props: { paused: LOCKED_PERSON, unsent: true } });
  return host;
}

export function lockSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'lockBoard';
  box.setAttribute('aria-labelledby', 'feature-lockBoard');
  const heading = el('h2', 'g-title', 'Lock a board');
  heading.id = 'feature-lockBoard';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'lock · unlock · LockedChip · paused'), ' · feature flag lockBoard, on by default · off with ?flags=-lockBoard');
  const [frame, cards] = board(fx, { ...fx.marks.state, locked: true });
  box.append(heading,
    el('p', 'g-desc', `The person makes a board read-only for everyone, agents included, until they unlock it. Every control that would change it is paused in place, saying "${LOCKED_PERSON}"; the flag, the person's private mark, still works.`),
    meta,
    group('Lock board', 'In the "⋯" menu; it acts on the open board, with no confirm (nothing is lost either way). Off while no board is open or a past version shows.', menu(false)),
    group('Unlock board', 'The same row on a locked board.', menu(true)),
    group('Locked', 'Beside the board\'s name and version while it is locked; its title says why the controls are paused.', title()),
    group('A locked board\'s container', 'The layout icons, the grip and Comment stay where they are, quiet and aria-disabled, and so do the widths switch and the cog menu\'s rows; a press says why. The checked layout keeps its colour; the cog still opens.', frame!),
    group('A locked board\'s cards', 'The review buttons, the size control and the note pin stay where they are, quiet and aria-disabled; a press says why. A pressed answer keeps its colour. The flag is not paused: the person still marks cards.', cards!),
    group('Send to agent', 'Paused too, with the reason as its title.', send()));
  return box;
}
