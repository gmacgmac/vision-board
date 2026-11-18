// Node pattern, the element's half of the edge marks (D-099): apply the marks state (node-marks.ts) to
// the markup node-edges.ts built, in place, so focus on a mark survives an update. Each mark's name says its state; the
// number's stays put and aria-pressed says whether it is bookmarked. The tone is set through
// CSSOM, never a style attribute (the page's CSP refuses inline styles), from the checked value only. Browser only.
import type { NodeMarks } from './node-marks.ts';
import { toneView } from './node-marks.ts';

/** Set the node's tone (decision 17): `data-vb-tone` and `--vb-tone-h`, or neither (no tone, or not one). */
export function applyTone(el: HTMLElement, tone: unknown): void {
  const t = toneView(tone);
  if (t) {
    el.dataset.vbTone = t.attr;
    el.style.setProperty('--vb-tone-h', t.hue);
  } else {
    delete el.dataset.vbTone;
    el.style.removeProperty('--vb-tone-h');
  }
}

const text = (b: Element | null, s: string): void => {
  const t = b?.querySelector('.vb-mark-text');
  if (t && t.textContent !== s) t.textContent = s;
};

/** Apply the marks: the number's toggle, the answer, the badge, Awaiting and the notes mark. */
export function applyMarks(el: HTMLElement, m: NodeMarks): void {
  const num = el.querySelector<HTMLElement>('[data-mark="number"]');
  if (num) {
    num.setAttribute('aria-pressed', String(m.bookmarked));
    num.setAttribute('aria-label', m.numberLabel);
  }
  el.toggleAttribute('data-bookmarked', m.bookmarked);
  const disc = el.querySelector<HTMLElement>('[data-mark="answer"]');
  if (disc) {
    disc.dataset.answer = m.answer;
    disc.setAttribute('aria-label', m.answerLabel);
    if (m.proposed) disc.dataset.proposed = m.proposed;
    else delete disc.dataset.proposed;
  }
  for (const half of el.querySelectorAll<HTMLElement>('[data-mark="tick"], [data-mark="cross"]')) {
    const tick = half.dataset.mark === 'tick';
    half.setAttribute('aria-pressed', String(m.answer === (tick ? 'ticked' : 'crossed')));
    half.toggleAttribute('data-proposed', m.proposed === (tick ? 'ack' : 'drop'));
  }
  const chip = el.querySelector<HTMLElement>('[data-mark="proposal"]');
  if (chip) {
    chip.hidden = !m.proposed;
    if (m.proposed) chip.setAttribute('aria-label', m.proposalLabel);
  }
  const badge = el.querySelector<HTMLElement>('[data-mark="badge"]');
  if (badge) {
    badge.hidden = m.badge === 'none';
    badge.dataset.badge = m.badge;
    text(badge, m.badgeText);
    if (m.badgeLabel) badge.setAttribute('aria-label', m.badgeLabel);
  }
  const awaiting = el.querySelector<HTMLElement>('.vb-mark-awaiting');
  if (awaiting) awaiting.hidden = !m.awaiting;
  const notes = el.querySelector<HTMLElement>('[data-mark="notes"]');
  if (notes) {
    notes.dataset.notesMark = m.notes;
    notes.toggleAttribute('data-group', m.group);
    notes.setAttribute('aria-label', m.notesLabel);
    text(notes, m.notesText);
  }
}
