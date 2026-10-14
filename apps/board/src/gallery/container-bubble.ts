// Gallery sample for the note bubble on a whole container (3_FE_04 ruling 3): a real <vb-region>
// from the fixture's containers board, its note open in the bubble beside its title line. The
// bubble is placed with `placeBubble(titleAnchor(line))`, as the board places it, and wears the
// frame's line colour (show's `line`) in place of a card's kind and number.
import type { VbNoteBubbleElement, VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { bubbleView, placeBubble, regionColour, regionState, titleAnchor } from '../../../../packages/ui/src/index.ts';
import { el } from './dom.ts';
import type { Fixture } from './fixture.ts';

/** The container whose note is open, and the id its copy takes here (frame ids are unique). */
const REGION = 'c-open';
const COPY = 'bubble-c-open';
// Wide enough (over 440px) that the frame's mode row does not collapse beside the bubble.
const STAGE = { w: 980, h: 240, x: 24, y: 40, fw: 560, fh: 150 };

export function containerBubbleSample(fx: Fixture): HTMLElement {
  const { view, state } = fx.containers;
  const region = view.regions.find((r) => r.id === REGION)!;
  const notes = state.regionNotes.get(REGION) ?? [];
  const note = notes.at(-1)!;
  const stage = el('div', 'g-bubble-stage vb-ground');
  stage.style.setProperty('width', `${STAGE.w}px`);
  stage.style.setProperty('height', `${STAGE.h}px`);
  const f = document.createElement('vb-region') as VbRegionElement;
  f.render({ ...region, id: COPY });
  f.update(regionState(region, view, state, new Set(view.nodes.map((n) => n.id))));
  f.setNoteOpen(true);
  f.style.transform = `translate(${STAGE.x}px, ${STAGE.y}px)`;
  f.style.setProperty('width', `${STAGE.fw}px`);
  f.style.setProperty('height', `${STAGE.fh}px`);
  const bubble = document.createElement('vb-note-bubble') as VbNoteBubbleElement;
  bubble.show(bubbleView({ mode: 'edit', kind: note.kind, container: region.title, index: notes.length, text: note.text }),
    { line: regionColour(region) });
  stage.append(f, bubble);
  // Placed once laid out, from the title line's real box on the stage.
  requestAnimationFrame(() => {
    const [s, l] = [stage.getBoundingClientRect(), f.titleLine().getBoundingClientRect()];
    const line = { x: l.left - s.left, y: l.top - s.top, w: l.width, h: l.height };
    const p = placeBubble(titleAnchor(line), { w: bubble.offsetWidth, h: bubble.offsetHeight }, STAGE);
    bubble.place(p);
    // Whole pixels, so the sections under it never sit at a fraction of a pixel.
    stage.style.setProperty('height', `${Math.max(STAGE.h, Math.ceil(p.y + bubble.offsetHeight + 24))}px`);
  });
  const fig = el('figure', 'g-bubble');
  fig.append(stage, el('figcaption', 'g-note', 'On a whole container: beside its title line, in the frame\'s line colour, no number chip'));
  return fig;
}
