// Node pattern, a card note's full-text tip (found-in-use FE_04, WCAG 1.4.13): a note cut at three
// lines shows itself in full in a box beside the card on hover and on keyboard focus. The open
// rules are the shared hover tip (tip/hover-tip.ts); node.css draws the box while `data-tip-open`
// is on the note. One tip per note. Behind the `notePreview` flag: the page marks its world with
// `data-note-preview` when the flag is on. A click still opens the note bubble, and the tip gives
// way. Browser only.
import type { HoverTip } from '../tip/hover-tip.ts';
import { bindHoverTip } from '../tip/hover-tip.ts';

export function bindNoteTip(note: HTMLElement): HoverTip {
  const text = note.querySelector<HTMLElement>('.vb-node-note-text')!;
  const tip = bindHoverTip(note, {
    anchor: ':host', tip: '.vb-note-tip', attr: 'data-tip-open',
    needed: () => note.closest('[data-note-preview]') !== null && text.scrollHeight > text.clientHeight,
  });
  // Pressing the tip (to select or scroll its text) is not a press on the note: it opens nothing.
  note.querySelector('.vb-note-tip')!.addEventListener('click', (e) => e.stopPropagation());
  note.addEventListener('click', () => tip.close());
  note.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target === note) note.click();
  });
  return tip;
}
