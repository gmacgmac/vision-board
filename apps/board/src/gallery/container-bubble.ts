// Gallery samples for the note bubble on a whole container (3_FE_04 ruling 3): a real <vb-region>
// from the fixture, a new note (`new`) or its note open (`edit`, the containers board) in the bubble beside its title
// line, its answered note shown, never edited (`sent`), or its conversation (`thread`, review polish ruling 6: the container notes board's answered note
// and the agent's reply, opened from the note block's note, the arrow on it). The bubble is placed
// with `placeBubble(titleAnchor(...))`, as the board places it, and wears the frame's line colour
// (show's `line`) in place of a card's kind and number.
import type { Region, View } from '#format';
import type { BoardState } from '#actions';
import type { BubbleView, CardReply, VbNoteBubbleElement, VbRegionElement } from '#ui';
import { bubbleView, conversation, placeBubble, regionColour, regionState, titleAnchor } from '#ui';
import { el, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';

// Wide enough (over 440px) that the frame's mode row does not collapse beside the bubble.
const STAGE = { w: 980, h: 240, x: 24, y: 40, fw: 560, fh: 150 };

/** The frame, the bubble's view and the part of the frame the bubble points at, for each sample. */
interface Shown { region: Region; frame: VbRegionElement; v: BubbleView; part?: string; caption: string }

/** The container's frame, drawn as the board draws it, under its own id (frame ids are unique). */
function frameOf(view: View, state: BoardState, id: string, owed?: ReadonlySet<string>, replies?: readonly CardReply[]) {
  const region = view.regions.find((r) => r.id === id)!;
  const frame = document.createElement('vb-region') as VbRegionElement;
  frame.render({ ...region, id: `bubble-${id}` }, ownIds());
  frame.update(regionState(region, view, state, new Set(view.nodes.map((n) => n.id)), undefined, owed, replies));
  return { region, frame };
}

/** The bubble's modes on a container (the board opens no other on one). */
export type ContainerBubble = 'new' | 'edit' | 'sent' | 'thread';

/** `new`: a new note on the containers board's container, while you type. `edit`: its open note, to edit. `sent`: the
 *  answered container note, read-only. `thread`: its conversation, its block shown, opened from the block's note. */
function shown(fx: Fixture, which: ContainerBubble): Shown {
  if (which === 'new' || which === 'edit') {
    const { view, state } = fx.containers;
    const { region, frame } = frameOf(view, state, 'c-open');
    const notes = state.regionNotes.get(region.id) ?? [];
    const note = notes.at(-1)!;
    const v = which === 'new' ? bubbleView({ mode: 'new', kind: 'comment', container: region.title })
      : bubbleView({ mode: 'edit', kind: note.kind, container: region.title, index: notes.length, text: note.text });
    return { region, frame, v, caption: which === 'new' ? 'A new note on a whole container, from Comment on its title line' : 'On a whole container: beside its title line, in the frame\'s line colour, no number chip' };
  }
  const { view, state, owed } = fx.containerNotes;
  const { region, frame } = frameOf(view, state, 'n-answered', owed, fx.parking.containerReplies);
  if (which === 'sent') {
    const notes = state.regionNotes.get(region.id) ?? [];
    const note = notes.at(-1)!;
    const v = bubbleView({ mode: 'sent', kind: note.kind, container: region.title, index: notes.length, text: note.text });
    return { region, frame, v, caption: 'A sent note: history, shown and never edited' };
  }
  frame.noteShown = true;
  const notes = state.regionNotes.get(region.id) ?? [];
  const replies = fx.parking.containerReplies.filter((r) => notes.some((x) => x.seq === r.to));
  const v = bubbleView({ mode: 'thread', kind: 'comment', container: region.title, entries: conversation(notes, replies) });
  return { region, frame, v, part: '.vb-nblock-text', caption: 'A container\'s conversation: its notes and the agent\'s replies, opened from the note in its block' };
}

export function containerBubbleSample(fx: Fixture, which: ContainerBubble): HTMLElement {
  const { region, frame: f, v, part, caption } = shown(fx, which);
  const stage = el('div', 'g-bubble-stage vb-ground');
  stage.style.setProperty('width', `${STAGE.w}px`);
  stage.style.setProperty('height', `${STAGE.h}px`);
  f.setNoteOpen(true);
  f.style.transform = `translate(${STAGE.x}px, ${STAGE.y}px)`;
  f.style.setProperty('width', `${STAGE.fw}px`);
  f.style.setProperty('height', `${part ? STAGE.fh + 60 : STAGE.fh}px`);
  const bubble = document.createElement('vb-note-bubble') as VbNoteBubbleElement;
  bubble.show(v, { line: regionColour(region) });
  stage.append(f, bubble);
  // Placed once laid out, from the title line's (or the part's) real box on the stage.
  requestAnimationFrame(() => {
    bubble.reveal();
    const s = stage.getBoundingClientRect();
    const l = f.titleLine().getBoundingClientRect();
    const p = (part && f.querySelector(part)?.getBoundingClientRect()) || l;
    const line = { x: l.left - s.left, y: p.top - s.top, w: l.width, h: p.height };
    const at = placeBubble(titleAnchor(line), { w: bubble.offsetWidth, h: bubble.offsetHeight }, STAGE);
    bubble.place(at);
    // Whole pixels, so the sections under it never sit at a fraction of a pixel.
    const bottom = Math.max(at.y + bubble.offsetHeight, f.getBoundingClientRect().bottom - s.top);
    stage.style.setProperty('height', `${Math.max(STAGE.h, Math.ceil(bottom + 24))}px`);
  });
  const fig = el('figure', 'g-bubble');
  fig.append(stage, el('figcaption', 'g-note', caption));
  return fig;
}
