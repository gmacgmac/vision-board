// Gallery entry for <vb-note-bubble> (2e_FE_01): every state of the note bubble beside a real
// card from the fixture's notes board, and the conversation (review polish rulings 6 and 7): every
// note and reply on a card of the parking board as the page reads them (parking.ts), oldest first,
// with Edit on the note not yet sent and the × in the corner, opened at the latest and at an older
// reply. Each sample is a small stage on the board's canvas; the bubble is placed with `placeBubble`
// exactly as the board places it, so right, left and below come from the stage's size, never from
// a hand-set side; the conversation from `partAnchor`, its arrow on the part pressed.
import type { ViewNode } from '../../../../packages/format/src/index.ts';
import type { BoardState } from '../../../../packages/actions/src/index.ts';
import type { BubbleInput, BubblePhase, NotesEntry, StageBox, VbNodeElement, VbNoteBubbleElement } from '../../../../packages/ui/src/index.ts';
import { bubbleView, conversation, isNoteEntry, nodeState, partAnchor, placeBubble } from '../../../../packages/ui/src/index.ts';
import { el, group } from './dom.ts';
import { containerBubbleSample } from './container-bubble.ts';
import type { Fixture } from './fixture.ts';
import { card } from './node-section.ts';

interface Sample {
  caption: string;
  /** Which card of the notes board, by title. */
  title: string;
  bubble: Omit<BubbleInput, 'number' | 'kind'> & { kind?: BubbleInput['kind'] };
  /** The stage's size and where the card sits on it. */
  stage: { w: number; h: number; x: number; y: number };
  phase?: BubblePhase;
  message?: string;
  /** Drawn as if you were typing in it (its :focus-within look, `data-typing`), since only one
   * element can hold focus. */
  typing?: boolean;
  /** A card of the parking board with the agent's replies: its conversation, opened at the latest
   *  entry or at the first (an older one). */
  talk?: 'latest' | 'first';
}

const SAMPLES: Sample[] = [
  { caption: 'New, on the card\'s right, while you type', title: 'A sent note', typing: true,
    bubble: { mode: 'new', kind: 'comment' }, stage: { w: 760, h: 300, x: 24, y: 24 } },
  { caption: 'Editing, flipped left at the board\'s right edge', title: 'A note not yet sent',
    bubble: { mode: 'edit' }, stage: { w: 760, h: 300, x: 420, y: 24 } },
  { caption: 'Below, when neither side fits', title: 'An old More context, read as a note',
    bubble: { mode: 'edit' }, stage: { w: 400, h: 300, x: 24, y: 24 } },
  { caption: 'Saving', title: 'Two sent notes and one not yet sent', phase: 'saving',
    bubble: { mode: 'edit' }, stage: { w: 760, h: 300, x: 24, y: 24 } },
  { caption: 'Error: the board refused it, the text is kept', title: 'A note not yet sent', phase: 'error',
    message: 'Not saved: The board server is not reachable. Is it running?',
    bubble: { mode: 'edit' }, stage: { w: 760, h: 300, x: 24, y: 24 } },
  { caption: 'Long text: the box grows with the words up to its maximum height, then scrolls', title: 'A note longer than its preview',
    bubble: { mode: 'edit' }, stage: { w: 760, h: 300, x: 24, y: 24 } },
  { caption: 'A sent note: history, shown and never edited', title: 'A sent note',
    bubble: { mode: 'sent', index: 1 }, stage: { w: 760, h: 300, x: 24, y: 24 } },
  { caption: 'The conversation: a click on a note or a reply opens every note and reply, oldest first, scrolled to the latest; Edit on the note not yet sent; the × closes it',
    title: 'Who signs off the price change?', talk: 'latest', bubble: { mode: 'thread' }, stage: { w: 760, h: 300, x: 24, y: 24 } },
  { caption: 'Opened from an older one (here note 1): scrolled to it; a reply that names no note sits by time among the notes',
    title: 'Who signs off the price change?', talk: 'first', bubble: { mode: 'thread' }, stage: { w: 760, h: 300, x: 24, y: 24 } },
];

/** The note the bubble opens on: the card's note not yet sent, or (for a sent bubble) its latest. */
function noteOf(n: ViewNode, state: BoardState, mode: BubbleInput['mode']) {
  const notes = state.items.get(n.id)?.notes ?? [];
  return mode === 'sent' ? notes.filter((x) => x.sent).at(-1) : mode === 'edit' ? notes.find((x) => !x.sent) : undefined;
}

/** The card a sample sits beside: from the notes board, or a parking card with its conversation
 *  and the entry it opened at (`at`: the selector of that part on the card, `seq`: the entry). */
function cardOf(s: Sample, fx: Fixture): { n: ViewNode; c: VbNodeElement; state: BoardState; entries?: NotesEntry[]; at?: { sel: string; seq: number } } {
  if (!s.talk) {
    const n = fx.notes.view.nodes.find((x) => x.title === s.title)!;
    return { n, c: card(n, fx, fx.notes.state), state: fx.notes.state };
  }
  const { view, state, cards } = fx.parking;
  const n = view.nodes.find((x) => x.title === s.title)!;
  const c = document.createElement('vb-node') as VbNodeElement;
  c.render(n);
  c.update(nodeState(n, state, undefined, false, cards.get(n.n!)));
  const entries = conversation(state.items.get(n.id)?.notes ?? [], cards.get(n.n!)?.replies ?? []);
  const e = s.talk === 'latest' ? entries.at(-1)! : entries[0]!;
  const sel = isNoteEntry(e) ? `.vb-node-note[data-note="${e.seq}"]` : `.vb-node-reply[data-reply="${e.seq}"]`;
  return { n, c, state, entries, at: { sel, seq: e.seq } };
}

/** Where the bubble is placed from: the card, or beside the part it opened from (the conversation). */
function anchor(s: Sample, c: HTMLElement, at?: string): StageBox {
  const box = { x: s.stage.x, y: s.stage.y, w: c.offsetWidth, h: c.offsetHeight };
  const part = at ? c.querySelector<HTMLElement>(at) : null;
  if (!part) return box;
  const [p, top] = [part.getBoundingClientRect(), c.getBoundingClientRect().top];
  return partAnchor(box, { x: box.x, y: box.y + p.top - top, w: box.w, h: p.height });
}

function sample(s: Sample, fx: Fixture): HTMLElement {
  const { n, c, state, entries, at } = cardOf(s, fx);
  const note = noteOf(n, state, s.bubble.mode);
  const stage = el('div', 'g-bubble-stage vb-ground');
  stage.style.setProperty('width', `${s.stage.w}px`);
  stage.style.setProperty('height', `${s.stage.h}px`);
  const list = el('div', 'g-bubble-card');
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', `Card ${n.n}`);
  c.style.transform = `translate(${s.stage.x}px, ${s.stage.y}px)`;
  c.toggleAttribute('data-bubble', true);
  list.append(c);
  const bubble = document.createElement('vb-note-bubble') as VbNoteBubbleElement;
  const kind = s.bubble.kind ?? note?.kind ?? 'comment';
  bubble.show(bubbleView({ ...s.bubble, kind, number: n.n!, text: note?.text, ...(entries && { entries }) }), { kind: n.kind, number: n.n! });
  if (s.phase) bubble.setPhase(s.phase, s.message);
  if (s.typing) bubble.toggleAttribute('data-typing', true);
  stage.append(list, bubble);
  // Placed once the page has laid it out, from the card's and the bubble's real sizes; then the
  // stage grows to hold both, so a tall card or a bubble below never runs into the caption.
  requestAnimationFrame(() => {
    const box = { x: s.stage.x, y: s.stage.y, w: c.offsetWidth, h: c.offsetHeight };
    if (at) bubble.reveal(at.seq);
    const p = placeBubble(anchor(s, c, at?.sel), { w: bubble.offsetWidth, h: bubble.offsetHeight }, s.stage);
    bubble.place(p);
    // Whole pixels, so the sections under it never sit at a fraction of a pixel.
    const bottom = Math.ceil(Math.max(box.y + box.h, p.y + bubble.offsetHeight) + 24);
    stage.style.setProperty('height', `${Math.max(s.stage.h, bottom)}px`);
  });
  const fig = el('figure', 'g-bubble');
  fig.append(stage, el('figcaption', 'g-note', s.caption));
  return fig;
}

export function noteBubbleSamples(body: HTMLElement, fx: Fixture): void {
  const row = el('div', 'g-bubbles');
  row.append(...SAMPLES.map((s) => sample(s, fx)), containerBubbleSample(fx, 'edit'), containerBubbleSample(fx, 'thread'));
  body.append(group('Every state', 'New, editing, saving, error and a sent note, placed on the right, on the left and below the way the board places them, the conversation (every note and reply on the card, oldest first) beside the part pressed and scrolled to it, and a note and the conversation on a whole container beside its title line. Read-only, an × in the corner closes it. The border and arrow wear the card\'s colour (the container\'s line colour), faint at rest and full while you type. Every size is a shared popover token (--vb-pop-*).', row));
}
