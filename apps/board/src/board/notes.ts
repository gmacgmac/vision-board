// Notes beside cards on the board page (2e_FE_01): C, the note pin and a click on a note open
// the note bubble beside the card instead of a modal. A card holds at most one note not yet sent:
// a press on a card that has one edits it (the press sets its kind), never adds a second. Comment
// on a selection of two or more opens one note on the group beside the selection's box, and any of
// its pins opens it again (3_FE_02 ruling 3). Comment on a container's title line opens one note on
// the whole container beside that line, by the same rules: one not yet sent, edit, Remove,
// read-only after Send (3_FE_04 rulings 2 and 3). A click, Enter or Space on a note or an agent's
// reply opens the exchange, the note then every reply to it, beside what was pressed (popovers-
// larger-thread ruling 2; what it says: note-views.ts). Every write goes through the controller's
// `attempt`, so through the action layer and the I/O module (rule 8); this module only opens, places
// and closes the bubble. Changed words are never lost silently: closing or replacing a bubble with
// changed text asks first (note-discard.ts).
import type { NoteKind } from '../../../../packages/format/src/index.ts';
import type { BoardLayout } from '../../../../packages/layout/src/index.ts';
import type { BoardState, ItemNote } from '../../../../packages/actions/src/index.ts';
import type { StageBox, VbNoteBubbleElement, VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { boxAround, partAnchor, placeBubble, readOnlyMode, saveIntent, titleAnchor } from '../../../../packages/ui/src/index.ts';
import type { NoteEventDetail } from '../../../../packages/ui/src/index.ts';
import type { ActFields } from './io.ts';
import type { AskDiscard } from './note-discard.ts';
import { bindDiscard, mayLeave } from './note-discard.ts';
import type { Viewport } from './viewport.ts';
import { footersNear } from './bubble-clear.ts';
import type { Open, ViewDeps } from './note-views.ts';
import { cardView, containerView } from './note-views.ts';

/** `region` and `frame`: a container on the board (3_FE_04): the bubble sits beside its title line. */
export interface NoteDeps extends ViewDeps {
  stage: HTMLElement;
  vp: Viewport;
  state(): BoardState;
  layout(): BoardLayout | null;
  card(id: string): HTMLElement | undefined;
  frame(id: string): VbRegionElement | undefined;
  /** The version the person was looking at, for a new note's act. */
  ver(id: string): number | undefined;
  /** Send one act; null when it was recorded, else what went wrong. */
  attempt(fields: ActFields): Promise<string | null>;
  /** After a recorded change: lay the board out again. */
  relayout(): void;
  toast(text: string): void;
  /** The bubble opened or closed (the selection bar hides while it is open, 3_FE_02 ruling 2). */
  changed(): void;
  /** "Discard your changes?" (step 4G ruling 4); true to discard. */
  discard: AskDiscard;
  /** Why the board can't change now (a locked board, lock-flow.ts): no bubble opens, the toast says why. */
  paused?(): string | null;
}

export interface NoteFlow {
  /** C on a card: edit its note not yet sent, or start a new one. */
  press(id: string, kind: NoteKind): void;
  /** Comment on two or more selected cards (3_FE_02 ruling 3): one note on the group, beside the
   *  selection's box; the group's own note not yet sent, if it has one, opens to edit. */
  group(ids: readonly string[]): void;
  /** The pin, or a note in the "Your note" block (`fromNote`: beside it): open that note
   *  (read-only once sent) with the agent's replies to it. */
  show(id: string, seq: number, fromNote?: boolean): void;
  /** An agent's reply on the card: the exchange of the note it answers, beside the reply; a reply
   *  naming no note of the card on its own. */
  reply(id: string, seq: number): void;
  /** Comment on a container's title line (3_FE_04): edit its note not yet sent, or start one
   *  (`kind` sets what it asks for; default: the note's own, else a comment). */
  container(region: string, kind?: NoteKind): void;
  /** Edit (or Open) in the container's note preview or block: its latest note, read-only once sent,
   *  with its replies; `part` ('note', or a reply's seq): opened from the block, beside that. */
  showContainer(region: string, part?: 'note' | number): void;
  /** Follow the card after a pan, a zoom or a relayout (ruling 6: the controller calls it on
   * every one); close if the card is gone. */
  place(): void;
  /** Close without saving (with changed words, after asking); focus goes back to the card. */
  close(): void;
  /** Whether the bubble is open (Esc closes it before it clears the selection, 3_FE_01). */
  readonly open: boolean;
  destroy(): void;
}

/** The card's own note not yet history (`locked`: sent or answered, ruling 5), if any. A note on a group of
 * cards is not the card's own (3_FE_02 ruling 3), so C on the card starts its own note. */
export const unsentNote = (s: BoardState, id: string): ItemNote | undefined =>
  s.items.get(id)?.notes.find((x) => !x.locked && !x.nodes);

/** The note not yet sent on exactly this group of cards, if there is one. */
const unsentGroupNote = (s: BoardState, ids: readonly string[]): ItemNote | undefined => {
  const key = [...ids].map(Number).sort((a, b) => a - b).join(',');
  return s.items.get(ids[0]!)?.notes.find((x) => !x.locked && x.nodes && [...x.nodes].sort((a, b) => a - b).join(',') === key);
};

/** The container's note not yet sent, if it has one (3_FE_04 ruling 2: at most one). */
const unsentRegionNote = (s: BoardState, region: string): ItemNote | undefined =>
  s.regionNotes.get(region)?.find((x) => !x.locked);

export function createNoteFlow(d: NoteDeps): NoteFlow {
  const bubble = document.createElement('vb-note-bubble') as VbNoteBubbleElement;
  bubble.hidden = true;
  d.stage.append(bubble);
  let open: Open | null = null;

  function mark(o: Open, on: boolean) {
    if (o.region) return d.frame(o.region)?.setNoteOpen(on);
    for (const id of o.anchor) {
      const card = d.card(id);
      card?.toggleAttribute('data-bubble', on);
      const pin = card?.querySelector<HTMLElement>('.vb-note-pin');
      if (pin && (!on || (o.note && pin.dataset.note === String(o.note.seq)))) pin.setAttribute('aria-expanded', String(on));
    }
  }

  /** Another bubble over one with changed words asks first (ruling 4); unchanged, it opens now. */
  function openWith(o: Open) {
    const was = open;
    if (!was || !bubble.dirty) return openNow(o);
    void mayLeave(bubble, d.discard).then((ok) => { if (ok && open === was) openNow(o); });
  }

  function openNow(o: Open) {
    const why = d.paused?.();
    if (why) return d.toast(why);
    const view = o.region ? containerView(d, o) : cardView(d, o);
    if (!view) return;
    // Focus goes back where it was in the frame (Comment, the pin, the grip, the note or a reply),
    // else to Comment; on a card, to the note or reply it opened from, else to the card.
    const at = document.activeElement;
    if (at instanceof HTMLElement && (o.region ? d.frame(o.region)?.contains(at) : o.at && at.matches(o.at))) o.back = at;
    if (open) mark(open, false);
    open = o;
    bubble.show(view.v, view.on);
    mark(o, true);
    place();
    bubble.focusText();
    d.changed();
  }

  function press(id: string, kind: NoteKind) {
    const note = unsentNote(d.state(), id);
    // A second press on the open bubble keeps what was typed; it only sets the kind.
    if (open?.id === id && !open.group && !open.region && !readOnlyMode(open.mode) && open.note?.seq === note?.seq) {
      open.kind = kind;
      return bubble.focusText();
    }
    openWith(note ? { id, anchor: [id], mode: 'edit', kind, note } : { id, anchor: [id], mode: 'new', kind });
  }

  function group(ids: readonly string[]) {
    const note = unsentGroupNote(d.state(), ids);
    const base = { id: ids[0]!, anchor: ids, group: ids };
    openWith(note ? { ...base, mode: 'edit', kind: note.kind, note } : { ...base, mode: 'new', kind: 'comment' });
  }

  /** The same exchange open again from another part: it moves beside that part and keeps its words. */
  const again = (at: string | undefined) => { open!.at = at; place(); bubble.focusText(); };

  function show(id: string, seq: number, fromNote = false, at = fromNote ? `.vb-node-note[data-note="${seq}"]` : undefined) {
    const note = d.state().items.get(id)?.notes.find((x) => x.seq === seq);
    if (!note) return;
    if (open?.id === id && !open.region && open.note?.seq === seq) return again(at);
    // From any pin of a note on a group, beside that card (3_FE_02 ruling 3).
    const groupOf = note.nodes && { group: note.nodes.map(String) };
    openWith({ id, anchor: [id], mode: note.locked ? 'sent' : 'edit', kind: note.kind, note, at, ...groupOf });
  }

  function reply(id: string, seq: number) {
    const r = d.replies(id).find((x) => x.seq === seq);
    if (!r) return;
    const at = `.vb-node-reply[data-reply="${seq}"]`;
    const note = r.to === undefined ? undefined : d.state().items.get(id)?.notes.find((x) => x.seq === r.to);
    if (note) return show(id, note.seq, false, at);
    if (open?.id === id && open.reply === seq) return again(at);
    openWith({ id, anchor: [id], mode: 'reply', kind: 'comment', reply: seq, at });
  }

  function container(region: string, kind?: NoteKind) {
    const note = unsentRegionNote(d.state(), region);
    // A second press on the open bubble keeps what was typed; it only sets the kind.
    if (open?.region === region && !readOnlyMode(open.mode) && open.note?.seq === note?.seq) {
      if (kind) open.kind = kind;
      return bubble.focusText();
    }
    const base = { id: region, anchor: [], region };
    openWith(note ? { ...base, mode: 'edit', kind: kind ?? note.kind, note } : { ...base, mode: 'new', kind: kind ?? 'comment' });
  }

  function showContainer(region: string, part?: 'note' | number) {
    const note = d.state().regionNotes.get(region)?.at(-1);
    if (!note) return;
    const at = part === undefined ? undefined : part === 'note' ? '.vb-nblock-text' : `.vb-nblock-reply[data-reply="${part}"]`;
    if (open?.region === region && open.note?.seq === note.seq) return again(at);
    openWith({ id: region, anchor: [], region, mode: note.locked ? 'sent' : 'edit', kind: note.kind, note, at });
  }

  /** The part `o.at` of `el` (a note or a reply it opened from), when it is drawn: its box. */
  const partOf = (o: Open, el?: HTMLElement) => {
    const r = o.at ? el?.querySelector(o.at)?.getBoundingClientRect() : undefined;
    return r?.height ? r : undefined;
  };

  /** The stage box the bubble is placed from: the title line of a container, or the cards, and
   *  beside the part it opened from (a note or a reply), its arrow on that part. Both come from
   *  the layout (where the frame or cards are going), not from a box mid-transition. */
  function anchorBox(o: Open): StageBox | undefined {
    const layout = d.layout();
    const { k, x, y } = d.vp;
    if (o.region) {
      const r = layout?.regions.find((g) => g.id === o.region);
      const el = d.frame(o.region);
      if (!r || !el?.isConnected) return undefined;
      // The line's (or the part's) offset inside its frame (both share the world's transform),
      // added to where the layout puts the frame.
      const [f, l] = [el.getBoundingClientRect(), el.titleLine().getBoundingClientRect()];
      const p = partOf(o, el) ?? l;
      return titleAnchor({ x: r.box.x * k + x + (l.left - f.left), y: r.box.y * k + y + (p.top - f.top), w: l.width, h: p.height });
    }
    const boxes = o.anchor.map((id) => layout?.nodes.get(id)).filter((b) => b !== undefined);
    if (!boxes.length) return undefined;
    const b = boxAround(boxes)!;
    const box = { x: b.x * k + x, y: b.y * k + y, w: b.w * k, h: b.h * k };
    const el = d.card(o.anchor[0]!);
    const p = partOf(o, el);
    return p && el ? partAnchor(box, { x: box.x, y: box.y + (p.top - el.getBoundingClientRect().top), w: box.w, h: p.height }) : box;
  }

  /** Whether the note the bubble is on still exists (Remove in the note block, or another tab). */
  function noteGone(o: Open): boolean {
    if (!o.note) return false;
    const notes = o.region ? d.state().regionNotes.get(o.region) : d.state().items.get(o.id)?.notes;
    return !notes?.some((x) => x.seq === o.note!.seq);
  }

  function place() {
    if (!open) return;
    // A removed note takes its bubble with it, changed words or not: there is nothing to save to.
    if (noteGone(open)) return close(false);
    const at = anchorBox(open);
    if (!at) return close(false);
    const size = { w: bubble.offsetWidth, h: bubble.offsetHeight };
    // Clear of the neighbouring cards' footer buttons where it can be (bubble-clear.ts).
    const avoid = footersNear(d.layout(), d.card, d.vp, at, size, open.anchor);
    bubble.place(placeBubble(at, size, { w: d.stage.clientWidth, h: d.stage.clientHeight }, avoid));
  }

  function close(focus = true) {
    if (!open) return;
    const o = open;
    mark(o, false);
    open = null;
    bubble.hidden = true;
    // The part it opened from, drawn again since (a new version of the card) is found afresh.
    const host = o.region ? d.frame(o.region) : d.card(o.anchor[0]!);
    const back = o.back?.isConnected ? o.back : o.back && o.at ? host?.querySelector<HTMLElement>(o.at) : undefined;
    if (focus && o.region) (back ?? host?.querySelector<HTMLElement>('.vb-region-comment'))?.focus({ preventScroll: true });
    else if (focus) (back ?? host)?.focus({ preventScroll: true });
    d.changed();
  }

  /** The act a choice sends, or null when there is nothing to write (ruling 6: empty text on
   * Save closes and keeps the note; only Remove removes it). A container note names its region in
   * place of the card (api.md 71); `sendAct` adds the board. */
  function actFor(o: Open, choice: NoteEventDetail['choice'], text: string): ActFields | null {
    const on = o.region ? { region: o.region } : { n: Number(o.id) };
    if (choice === 'remove' && o.note) return { action: 'note-remove', ...on, note: o.note.seq };
    if (choice !== 'save' || saveIntent(o.mode, o.kind, text) === 'skip') return null;
    const words = text.trim();
    if (o.mode === 'new' && o.group) return words ? { action: o.kind, nodes: o.group.map(Number), text: words } : null;
    if (o.mode === 'new') return { action: o.kind, ...on, ...(!o.region && { ver: d.ver(o.id) }), ...(words && { text: words }) };
    // The latest press sets the kind (ruling 1); a click on the pin keeps it.
    return { action: 'note-edit', ...on, note: o.note!.seq, text: words, ...(o.kind !== o.note!.kind && { kind: o.kind }) };
  }

  const DONE: Record<string, string> = { comment: 'added', 'note-edit': 'saved', 'note-remove': 'removed' };

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
    const on = o.region ? `container ${d.region(o.region)?.title ?? o.region}` : o.group ? `${o.group.length} cards` : d.node(o.id)?.n ?? o.id;
    d.toast(`Note on ${on} ${DONE[fields.action] ?? 'saved'}`);
  }

  bubble.addEventListener('vb-note', (e) => void onChoice(e));
  // Esc or Cancel with changed words: the bubble stays open and asks; OK closes it.
  bindDiscard(bubble, d.discard, () => close(), () => open);

  return {
    press, group, show: (id, seq, fromNote) => show(id, seq, fromNote), reply, container, showContainer, place, destroy: () => bubble.remove(),
    close: () => {
      if (!bubble.dirty) return close();
      const o = open;
      void mayLeave(bubble, d.discard).then((ok) => { if (ok && open === o) close(); });
    },
    get open() { return open !== null; },
  };
}
