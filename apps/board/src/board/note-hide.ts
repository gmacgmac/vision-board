// A card's notes put away and shown again on the page (card-polish FE_02, api.md 156): the toggle at
// the right of the thread's "N notes" line, Hide while it shows and Show while it is put away
// (`data-notes`, node-template.ts `notesHead`). Each press is one act, `notes-hide` or `notes-show`,
// naming the card by its board number and no version, the flag's pattern (flag-flow.ts): the person's private mark,
// kept out of every agent read, which a locked board still takes (lock.ts `passesLock`) and a past
// version refuses (sender.ts). The sender draws the card from the line that comes back; its size
// changes, so it is measured and only its container lays out again (cards.ts, layout-cache.ts).
// `highlight` brings one note or reply into view on its card, showing the thread first if it is
// put away, and rings it for a moment: the history box's rows call it (card-polish FE_03).
import type { BoardState } from '#actions';
import type { BoardLayout } from '#layout';
import type { ActFields } from './io.ts';
import type { Viewport } from './viewport.ts';

/** The act that turns card `id`'s notes over: `notes-show` while they are put away, else `notes-hide`. */
export const notesAct = (id: string, hidden: boolean): ActFields => ({ action: hidden ? 'notes-show' : 'notes-hide', n: Number(id) });

/** A note on a card, by its `seq`, or an agent's reply on it, by its `seq`. */
export type NotePart = { note: number } | { reply: number };

/** Where `part` is drawn on its card. */
export const partSelector = (p: NotePart): string =>
  ('note' in p ? `.vb-node-note[data-note="${p.note}"]` : `.vb-node-reply[data-reply="${p.reply}"]`);

/** How long a highlighted note keeps its ring, in ms, before it fades (node-notes.css `data-flash`). */
export const FLASH_MS = 1600;

/** The frames to wait for a card drawn again after a recorded act (the page draws on the next frame). */
const DRAW_FRAMES = 10;

export interface NoteHideDeps {
  stage: HTMLElement;
  vp: Viewport;
  state(): BoardState | null;
  card(id: string): HTMLElement | undefined;
  layout(): BoardLayout | null;
  record(fields: ActFields): Promise<boolean>;
}

export interface NoteHide {
  /** Bring `part` on card `id` into view (a pan by `revealPan`'s rule, `vp.reveal`), showing the
   *  thread first if it is put away (`notes-show`), then focus it and ring it for `FLASH_MS`; false
   *  when the card is not drawn or holds no such part. */
  highlight(id: string, part: NotePart): Promise<boolean>;
}

const frame = () => new Promise<void>((done) => requestAnimationFrame(() => done()));

export function createNoteHide(d: NoteHideDeps): NoteHide {
  d.stage.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('vb-node button[data-notes]');
    if (b) void d.record(notesAct(b.closest<HTMLElement>('vb-node')!.dataset.id!, b.dataset.notes === 'show'));
  });

  /** `part` on card `id`, once the card draws it. */
  async function find(id: string, part: NotePart): Promise<HTMLElement | null> {
    for (let i = 0; i < DRAW_FRAMES; i += 1) {
      const el = d.card(id)?.querySelector<HTMLElement>(partSelector(part));
      if (el) return el;
      await frame();
    }
    return null;
  }

  return {
    async highlight(id, part) {
      if (d.state()?.notesHidden?.has(id) && !(await d.record(notesAct(id, true)))) return false;
      const [el, card, box] = [await find(id, part), d.card(id), d.layout()?.nodes.get(id)];
      if (!el || !card || !box) return false;
      // The part's box in world units: its offset in the card, which moves with the card, so a card
      // still gliding to its place gives the same answer.
      const [c, r, k] = [card.getBoundingClientRect(), el.getBoundingClientRect(), d.vp.k];
      d.vp.reveal({ x: box.x + (r.left - c.left) / k, y: box.y + (r.top - c.top) / k, w: r.width / k, h: r.height / k });
      el.focus({ preventScroll: true });
      el.toggleAttribute('data-flash', true);
      setTimeout(() => el.removeAttribute('data-flash'), FLASH_MS);
      return true;
    },
  };
}
