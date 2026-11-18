// Gallery entry for <vb-note-bubble> (2e_FE_01): the edit bubble beside a real card from the fixture's notes board,
// which Edit on a note still editable opens from the node's conversation box (decision 8), in every state; the
// bubble on a whole container (new, edit, sent and its conversation, review polish rulings 6 and 7); then the
// conversation box itself, a node's notes to read and to write (FE_03). Each sample is a small stage on the board's
// canvas; the bubble is placed with `placeBubble` exactly as the board places it, so right, left and below come from
// the stage's size, never from a hand-set side.
import type { ViewNode } from '#format';
import type { BoardState } from '#actions';
import type { BubbleInput, BubblePhase, VbNodeElement, VbNoteBubbleElement } from '#ui';
import { bubbleView, placeBubble } from '#ui';
import { el, group } from './dom.ts';
import { containerBubbleSample } from './container-bubble.ts';
import { conversationBoxSamples } from './conversation-box-samples.ts';
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
}

const SAMPLES: Sample[] = [
  { caption: 'Editing a node\'s note not yet sent, on the node\'s right, while you type', title: 'A note not yet sent', typing: true,
    bubble: { mode: 'edit' }, stage: { w: 760, h: 300, x: 24, y: 24 } },
  { caption: 'Flipped left at the board\'s right edge', title: 'A note not yet sent',
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
];

/** The note the bubble opens on: the card's note not yet sent. */
const noteOf = (n: ViewNode, state: BoardState) => (state.items.get(n.id)?.notes ?? []).find((x) => !x.sent);

function sample(s: Sample, fx: Fixture): HTMLElement {
  const n = fx.notes.view.nodes.find((x) => x.title === s.title)!;
  const c: VbNodeElement = card(n, fx, fx.notes.state);
  const note = noteOf(n, fx.notes.state);
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
  bubble.show(bubbleView({ ...s.bubble, kind, number: n.n!, text: note?.text }), { kind: n.kind, number: n.n! });
  if (s.phase) bubble.setPhase(s.phase, s.message);
  if (s.typing) bubble.toggleAttribute('data-typing', true);
  stage.append(list, bubble);
  // Placed once the page has laid it out, from the card's and the bubble's real sizes; then the
  // stage grows to hold both, so a tall card or a bubble below never runs into the caption.
  requestAnimationFrame(() => {
    const box = { x: s.stage.x, y: s.stage.y, w: c.offsetWidth, h: c.offsetHeight };
    const p = placeBubble(box, { w: bubble.offsetWidth, h: bubble.offsetHeight }, s.stage);
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
  row.append(...SAMPLES.map((s) => sample(s, fx)), ...(['new', 'edit', 'sent', 'thread'] as const).map((m) => containerBubbleSample(fx, m)));
  body.append(group('Every state', 'A node\'s note opened to edit from its conversation box (Edit), editing, saving and error, placed on the right, on the left and below the way the board places them; then a container\'s note beside its title line: new, editing, a sent note, and its conversation (every note and reply, oldest first) beside the part pressed. Read-only, an × in the corner closes it. The border and arrow wear the card\'s colour (the container\'s line colour), faint at rest and full while you type. Every size is a shared popover token (--vb-pop-*).', row));
  body.append(conversationBoxSamples(fx));
}
