// Notes beside cards on the board page (2e_FE_01): C, M, the note pin and a click on a note open
// the note bubble beside the card instead of a modal. A card holds at most one note not yet sent:
// a press on a card that has one edits it (the press sets its kind), never adds a second. Every
// write goes through the controller's `attempt`, so through the action layer and the I/O module
// (rule 8); this module only opens, places and closes the bubble.
import type { NoteKind, ViewNode } from '../../../../packages/format/src/index.ts';
import type { BoardLayout } from '../../../../packages/layout/src/index.ts';
import type { BoardState, ItemNote } from '../../../../packages/actions/src/index.ts';
import type { BubbleMode, VbNoteBubbleElement } from '../../../../packages/ui/src/index.ts';
import { bubbleView, placeBubble, saveIntent } from '../../../../packages/ui/src/index.ts';
import type { NoteEventDetail } from '../../../../packages/ui/src/index.ts';
import type { ActFields } from './io.ts';
import type { Viewport } from './viewport.ts';

export interface NoteDeps {
  stage: HTMLElement;
  vp: Viewport;
  node(id: string): ViewNode | undefined;
  state(): BoardState;
  layout(): BoardLayout | null;
  card(id: string): HTMLElement | undefined;
  /** The version the person was looking at, for a new note's act. */
  ver(id: string): number | undefined;
  /** Send one act; null when it was recorded, else what went wrong. */
  attempt(fields: ActFields): Promise<string | null>;
  /** After a recorded change: lay the board out again. */
  relayout(): void;
  toast(text: string): void;
}

export interface NoteFlow {
  /** C or M on a card: edit its note not yet sent, or start a new one of that kind. */
  press(id: string, kind: NoteKind): void;
  /** The pin, or a note in the "Your note" block: open that note (read-only once sent). */
  show(id: string, seq: number): void;
  /** Follow the card after a pan, a zoom or a relayout (ruling 6: the controller calls it on
   * every one); close if the card is gone. */
  place(): void;
  /** Close without saving; focus goes back to the card. */
  close(): void;
  destroy(): void;
}

/** The card's note not yet sent, if it has one (ruling 1: at most one). */
export const unsentNote = (s: BoardState, id: string): ItemNote | undefined =>
  s.items.get(id)?.notes.find((x) => !x.sent);

interface Open { id: string; mode: BubbleMode; kind: NoteKind; note?: ItemNote }

export function createNoteFlow(d: NoteDeps): NoteFlow {
  const bubble = document.createElement('vb-note-bubble') as VbNoteBubbleElement;
  bubble.hidden = true;
  d.stage.append(bubble);
  let open: Open | null = null;

  function mark(id: string, on: boolean) {
    const card = d.card(id);
    card?.toggleAttribute('data-bubble', on);
    card?.querySelector('.vb-note-pin')?.setAttribute('aria-expanded', String(on));
  }

  function openWith(o: Open) {
    const n = d.node(o.id);
    if (!n || n.n === undefined) return;
    if (open) mark(open.id, false);
    open = o;
    const notes = d.state().items.get(o.id)?.notes ?? [];
    const index = o.note ? notes.findIndex((x) => x.seq === o.note!.seq) + 1 : undefined;
    bubble.show(bubbleView({ mode: o.mode, kind: o.kind, number: n.n, index, text: o.note?.text }), { kind: n.kind, number: n.n });
    mark(o.id, true);
    place();
    bubble.focusText();
  }

  function press(id: string, kind: NoteKind) {
    const note = unsentNote(d.state(), id);
    // A second press on the open bubble keeps what was typed; it only sets the kind.
    if (open?.id === id && open.mode !== 'sent' && open.note?.seq === note?.seq) {
      open.kind = kind;
      return bubble.focusText();
    }
    openWith(note ? { id, mode: 'edit', kind, note } : { id, mode: 'new', kind });
  }

  function show(id: string, seq: number) {
    const note = d.state().items.get(id)?.notes.find((x) => x.seq === seq);
    if (!note) return;
    if (open?.id === id && open.note?.seq === seq) return bubble.focusText();
    openWith({ id, mode: note.sent ? 'sent' : 'edit', kind: note.kind, note });
  }

  function place() {
    if (!open) return;
    const box = d.layout()?.nodes.get(open.id);
    if (!box) return close(false);
    const { k, x, y } = d.vp;
    const card = { x: box.x * k + x, y: box.y * k + y, w: box.w * k, h: box.h * k };
    const size = { w: bubble.offsetWidth, h: bubble.offsetHeight };
    bubble.place(placeBubble(card, size, { w: d.stage.clientWidth, h: d.stage.clientHeight }));
  }

  function close(focus = true) {
    if (!open) return;
    const { id } = open;
    mark(id, false);
    open = null;
    bubble.hidden = true;
    if (focus) d.card(id)?.focus({ preventScroll: true });
  }

  /** The act a choice sends, or null when there is nothing to write (ruling 6: empty text on
   * Save closes and keeps the note; only Remove removes it). */
  function actFor(o: Open, choice: NoteEventDetail['choice'], text: string): ActFields | null {
    const n = Number(o.id);
    if (choice === 'remove' && o.note) return { action: 'note-remove', n, note: o.note.seq };
    if (choice !== 'save' || saveIntent(o.mode, o.kind, text) === 'skip') return null;
    const words = text.trim();
    if (o.mode === 'new') return { action: o.kind, n, ver: d.ver(o.id), ...(words && { text: words }) };
    // The latest press sets the kind (ruling 1); a click on the pin keeps it.
    return { action: 'note-edit', n, note: o.note!.seq, text: words, ...(o.kind !== o.note!.kind && { kind: o.kind }) };
  }

  const DONE: Record<string, string> = { comment: 'added', context: 'added', 'note-edit': 'saved', 'note-remove': 'removed' };

  async function onChoice(e: Event) {
    const o = open;
    if (!o) return;
    const { choice, text } = (e as CustomEvent<NoteEventDetail>).detail;
    const fields = choice === 'cancel' ? null : actFor(o, choice, text);
    if (!fields) return close();
    bubble.setPhase('saving');
    const problem = await d.attempt(fields);
    if (open !== o) return; // closed or replaced while it was on its way
    if (problem !== null) return bubble.setPhase('error', `Not saved: ${problem}`);
    close();
    d.relayout();
    d.toast(`Note on ${d.node(o.id)?.n ?? o.id} ${DONE[fields.action] ?? 'saved'}`);
  }

  bubble.addEventListener('vb-note', (e) => void onChoice(e));

  return { press, show, place, close: () => close(), destroy: () => bubble.remove() };
}
