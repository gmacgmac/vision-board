// Gallery entry for a note on a group of cards drawn once (groupNoteOnce flag; cortex-tasks/board/
// 2026-10-25_board-ui_group-note-once.md, maintainer ruling point 103): the fixture's groups board, two
// notes on two groups that share card 1: the first group's pin sits on card 1, the second's on its own
// next card, 2, since 1 already has one. At rest, the pins alone;
// hovered, the dashed ring round each card of the group in the accent (a note still editable); open, the
// answered note's bubble with the agent's reply shown once and its cards ringed in the subtle ink. Drawn
// by the board's own drawing (mini-board.ts) and the board's own pins (group-pins.ts), from the fixture
// ledger; the hover is the pin's own pointerenter. Each sample takes a suffix of its own, so no id is on
// the page twice. Shown only with the flag on, so ?flags=-groupNoteOnce draws the gallery as it was.
import type { BoardState } from '#actions';
import { boardState } from '#actions';
import { boardView } from '#format';
import type { BoardLayout } from '#layout';
import type { VbNoteBubbleElement } from '#ui';
import { bubbleView, placeBubble, replyEntry } from '#ui';
import type { Drawing } from '../board/draw.ts';
import { createGroupPins } from '../board/group-pins.ts';
import { createParking } from '../board/parking.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { miniBoard } from './mini-board.ts';

/** The fixture's board of group notes: the answered one on cards 1 and 3, one still editable on 1 and 2. */
export const GROUPS_BOARD = 'groups';
const ANSWERED = 351;
const EDITABLE = '1,2';

type Look = 'rest' | 'hover' | 'open';

/** `state` with every card's id taking `suffix`, as the sample's drawn cards do (mini-board.ts). */
const keyed = (state: BoardState, suffix: string): BoardState =>
  ({ ...state, items: new Map([...state.items].map(([id, item]) => [`${id}${suffix}`, item])) });

/** The layout with the sample's suffix taken off its card ids, as the pins read them (board numbers). */
const plain = (l: BoardLayout, suffix: string): BoardLayout =>
  ({ ...l, nodes: new Map([...l.nodes].map(([id, box]) => [suffix ? id.slice(0, -suffix.length) : id, box])) });

/** The answered note's bubble beside card 1, with the agent's reply once, placed as the board places it. */
function openBubble(fx: Fixture, stage: HTMLElement, card: HTMLElement): void {
  const note = boardState(fx.ledger, GROUPS_BOARD).items.get('1')!.notes.find((x) => x.seq === ANSWERED)!;
  const parking = createParking({ handover: false, replies: true, state: () => fx.ledger, board: () => GROUPS_BOARD, awaiting: () => new Set(), readOnly: () => false });
  parking.refresh();
  const n = boardView(fx.ledger, GROUPS_BOARD).nodes.find((x) => x.n === 1)!;
  const replies = (parking.card(n).replies ?? []).filter((r) => r.to === note.seq).map(replyEntry);
  const bubble = document.createElement('vb-note-bubble') as VbNoteBubbleElement;
  bubble.show(bubbleView({ mode: 'sent', kind: note.kind, number: 1, numbers: note.nodes!, index: 1, text: note.text, replies, answered: true }), {});
  stage.style.width = `${stage.offsetWidth + 420}px`;
  stage.append(bubble);
  requestAnimationFrame(() => {
    const [s, c] = [stage.getBoundingClientRect(), card.getBoundingClientRect()];
    const at = { x: c.left - s.left, y: c.top - s.top, w: c.width, h: c.height };
    const p = placeBubble(at, { w: bubble.offsetWidth, h: bubble.offsetHeight }, { w: stage.clientWidth, h: stage.clientHeight + 400 });
    bubble.place(p);
    stage.style.height = `${Math.ceil(Math.max(stage.clientHeight, p.y + bubble.offsetHeight + 24))}px`;
  });
}

/** The groups board drawn as the board draws it, with its group pins in `look`. */
function sample(fx: Fixture, look: Look): HTMLElement {
  const suffix = look === 'rest' ? '' : `-${look}`;
  const state = boardState(fx.ledger, GROUPS_BOARD);
  const parking = createParking({ handover: false, replies: true, apart: true, state: () => fx.ledger, board: () => GROUPS_BOARD, awaiting: () => new Set(), readOnly: () => false });
  parking.refresh();
  const then = (stage: HTMLElement, drawing: Drawing) => {
    const pins = createGroupPins({
      world: stage.querySelector<HTMLElement>('.vb-world')!, state: () => state, layout: () => plain(drawing.layout!, suffix),
      card: (id) => drawing.cards.get(`${id}${suffix}`), open: () => {},
    });
    pins.draw();
    if (look === 'hover') stage.querySelector(`.vb-group-pin[data-group="${EDITABLE}"]`)!.dispatchEvent(new PointerEvent('pointerenter'));
    if (look === 'open') {
      pins.mark(ANSWERED);
      openBubble(fx, stage, drawing.cards.get(`1${suffix}`)!);
    }
  };
  return miniBoard({ view: boardView(fx.ledger, GROUPS_BOARD), state: keyed(state, suffix) }, 'groups', {
    label: `Cards with notes on groups, ${look}`, suffix, facts: (n) => parking.card(n), then,
  });
}

export function groupNotesSection(fx: Fixture): HTMLElement {
  const box = el('section', 'g-section');
  box.dataset.feature = 'groupNoteOnce';
  box.setAttribute('aria-labelledby', 'feature-groupNoteOnce');
  const heading = el('h2', 'g-title', 'Notes on groups of cards');
  heading.id = 'feature-groupNoteOnce';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, '.vb-group-notes > .vb-note-pin.vb-group-pin · vb-node[data-group-ring]'), ' · feature flag groupNoteOnce, on by default · off with ?flags=-groupNoteOnce');
  const figure = (look: Look, caption: string) => {
    const fig = el('figure', 'g-bubble');
    fig.append(sample(fx, look), el('figcaption', 'g-note', caption));
    return fig;
  };
  box.append(heading,
    el('p', 'g-desc', 'A note made on a selection of cards is one note, drawn once: one pin per group, on the right edge of the '
      + 'group\'s lowest-numbered card just under that card\'s own pin, so the two never meet. No card repeats the note or the '
      + 'agent\'s reply to it. Pressing the pin selects the group\'s cards and opens the note, to edit or remove it.'),
    meta,
    group('At rest, hovered and open', 'Two groups share card 1: the first group\'s pin sits on it, the second\'s on its next card. '
      + 'Hovering or focusing a pin, and its bubble '
      + 'being open, rings each card of its group with a dashed line, never a box: the accent while the note can be edited, the '
      + 'subtle ink once it is history. The reply shows once, in the bubble.',
    figure('rest', 'At rest: the pins alone'), figure('hover', 'Hovered: the editable note\'s cards ringed'),
    figure('open', 'Open: the answered note, its reply once, its cards ringed')));
  return box;
}
