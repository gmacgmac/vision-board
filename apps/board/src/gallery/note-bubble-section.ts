// Gallery entry for <vb-note-bubble> (2e_FE_01): every state of the note bubble beside a real
// card from the fixture's notes board. Each sample is a small stage on the board's canvas; the
// bubble is placed with `placeBubble` exactly as the board places it, so right, left and below
// come from the stage's size, never from a hand-set side.
import type { ViewNode } from '../../../../packages/format/src/index.ts';
import type { BubbleInput, BubblePhase, VbNoteBubbleElement } from '../../../../packages/ui/src/index.ts';
import { bubbleView, placeBubble } from '../../../../packages/ui/src/index.ts';
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
}

const SAMPLES: Sample[] = [
  { caption: 'New, on the card\'s right, while you type', title: 'A sent note', typing: true,
    bubble: { mode: 'new', kind: 'comment' }, stage: { w: 680, h: 300, x: 24, y: 24 } },
  { caption: 'Editing, flipped left at the board\'s right edge', title: 'A note not yet sent',
    bubble: { mode: 'edit' }, stage: { w: 680, h: 300, x: 380, y: 24 } },
  { caption: 'Below, when neither side fits', title: 'More context, not yet sent',
    bubble: { mode: 'edit' }, stage: { w: 400, h: 300, x: 24, y: 24 } },
  { caption: 'Saving', title: 'Two sent notes and one not yet sent', phase: 'saving',
    bubble: { mode: 'edit' }, stage: { w: 680, h: 300, x: 24, y: 24 } },
  { caption: 'Error: the board refused it, the text is kept', title: 'A note not yet sent', phase: 'error',
    message: 'Not saved: The board server is not reachable. Is it running?',
    bubble: { mode: 'edit' }, stage: { w: 680, h: 300, x: 24, y: 24 } },
  { caption: 'Long text: the box grows with the words up to its maximum height, then scrolls', title: 'A note longer than its preview',
    bubble: { mode: 'edit' }, stage: { w: 680, h: 300, x: 24, y: 24 } },
  { caption: 'A sent note: history, shown and never edited', title: 'A sent note',
    bubble: { mode: 'sent', index: 1 }, stage: { w: 680, h: 300, x: 24, y: 24 } },
];

/** The note the bubble opens on: the card's note not yet sent, or (for a sent bubble) its latest. */
function noteOf(n: ViewNode, fx: Fixture, mode: BubbleInput['mode']) {
  const notes = fx.notes.state.items.get(n.id)?.notes ?? [];
  return mode === 'sent' ? notes.filter((x) => x.sent).at(-1) : mode === 'edit' ? notes.find((x) => !x.sent) : undefined;
}

function sample(s: Sample, fx: Fixture): HTMLElement {
  const n = fx.notes.view.nodes.find((x) => x.title === s.title)!;
  const note = noteOf(n, fx, s.bubble.mode);
  const stage = el('div', 'g-bubble-stage vb-ground');
  stage.style.setProperty('width', `${s.stage.w}px`);
  stage.style.setProperty('height', `${s.stage.h}px`);
  const list = el('div', 'g-bubble-card');
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', `Card ${n.n}`);
  const c = card(n, fx, fx.notes.state);
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
    const bottom = Math.max(box.y + box.h, p.y + bubble.offsetHeight) + 24;
    stage.style.setProperty('height', `${Math.max(s.stage.h, bottom)}px`);
  });
  const fig = el('figure', 'g-bubble');
  fig.append(stage, el('figcaption', 'g-note', s.caption));
  return fig;
}

export function noteBubbleSamples(body: HTMLElement, fx: Fixture): void {
  const row = el('div', 'g-bubbles');
  row.append(...SAMPLES.map((s) => sample(s, fx)), containerBubbleSample(fx));
  body.append(group('Every state', 'New, editing, saving, error and a sent note, placed on the right, on the left and below the way the board places them, and a note on a whole container beside its title line. The border and arrow wear the card\'s colour (the container\'s line colour), faint at rest and full while you type.', row));
}
