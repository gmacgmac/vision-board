// Notes beside cards on the board page (2e_FE_01): C, the note pin and a click on a note open
// the note bubble beside the card instead of a modal. A card holds at most one note not yet sent:
// a press on a card that has one edits it (the press sets its kind), never adds a second. Comment
// on a selection of two or more opens one note on the group (3_FE_02 ruling 3); Comment on a
// container's title line one on the whole container, by the same rules (3_FE_04 rulings 2 and 3).
// A click, Enter or Space on a note or an agent's reply opens the conversation, every note and reply
// on the card (or container) oldest first, beside what was pressed and scrolled to it (review polish
// ruling 6; what it says: note-views.ts); it closes with its ×, Esc or a click outside (ruling 7,
// note-outside.ts); Edit on the person's note still editable opens today's edit mode (decision 8).
// With the groupNoteOnce flag a note on a group is drawn once, as the group's pin (group-pins.ts),
// which opens it here. Every write goes through the controller's `attempt` (rule 8); this module only
// opens, places and closes the bubble. Changed words are never lost silently (note-discard.ts).
import type { NoteKind } from '#format';
import type { VbNoteBubbleElement } from '#ui';
import { placeBubble, readOnlyMode, saveIntent } from '#ui';
import type { NoteEventDetail } from '#ui';
import type { ActFields } from '../io.ts';
import { bindDiscard, createLeave, mayLeave } from './note-discard.ts';
import { footersNear } from './bubble-clear.ts';
import { bindOutside } from './note-outside.ts';
import { anchorBox } from './note-anchor.ts';
import type { Open } from './note-views.ts';
import { cardView, containerView } from './note-views.ts';
import { unsentGroupNote, unsentNote, unsentRegionNote } from './note-find.ts';
import { createGroupPins, groupPinOf } from './group-pins.ts';
import * as notesWords from '../words/notes.ts';
import type { NoteDeps, NoteFlow } from './note-flow-types.ts';

export function createNoteFlow(d: NoteDeps): NoteFlow {
  const bubble = document.createElement('vb-note-bubble') as VbNoteBubbleElement;
  bubble.hidden = true;
  d.stage.append(bubble);
  const guard = createLeave(bubble, d.discard, d.unsaved, () => close(false));
  /** The bubble opened or closed: the flow's own deps hear it, and the host hears a turn of `unsaved`. */
  const changed = () => { guard.check(); d.changed(); };
  let open: Open | null = null;
  // The groupNoteOnce flag: a note on a group of cards is drawn once, as the group's pin.
  const pins = d.groups ? createGroupPins({ ...d, open: (cards, anchor, seq) => { d.selection.select(cards, 'only'); show(anchor, seq); } }) : undefined;

  function mark(o: Open, on: boolean) {
    if (o.region) return d.frame(o.region)?.setNoteOpen(on);
    if (o.group && o.note) pins?.mark(on ? o.note.seq : undefined);
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
    if (o.mode === 'thread') bubble.reveal(o.part);
    mark(o, true);
    place();
    bubble.focusText();
    changed();
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

  /** Open again from another part: it moves beside that part and keeps its words; the conversation
   *  scrolls to `part`, and focus goes back there on close. */
  const again = (at: string | undefined, part?: number) => {
    const o = open!;
    o.at = at;
    const now = document.activeElement;
    if (at && now instanceof HTMLElement && now.matches(at)) o.back = now;
    if (part !== undefined) {
      o.part = part;
      bubble.reveal(part);
    }
    place();
    bubble.focusText();
  };

  /** The card's conversation at the note or reply `part` (`at` selects it on the card). */
  function talk(id: string, part: number, at: string) {
    if (open?.id === id && !open.region && open.mode === 'thread') return again(at, part);
    openWith({ id, anchor: [id], mode: 'thread', kind: 'comment', part, at });
  }

  function show(id: string, seq: number, fromNote = false) {
    const note = d.state().items.get(id)?.notes.find((x) => x.seq === seq);
    if (!note) return;
    if (fromNote) return talk(id, seq, `.vb-node-note[data-note="${seq}"]`);
    if (open?.id === id && !open.region && open.mode !== 'thread' && open.note?.seq === seq) return again(undefined);
    // From any pin of a note on a group, beside that card (3_FE_02 ruling 3).
    const groupOf = note.nodes && { group: note.nodes.map(String), ...(pins && { at: groupPinOf(seq) }) };
    openWith({ id, anchor: [id], mode: note.locked ? 'sent' : 'edit', kind: note.kind, note, ...groupOf });
  }

  function reply(id: string, seq: number) {
    if (d.replies(id).some((x) => x.seq === seq)) talk(id, seq, `.vb-node-reply[data-reply="${seq}"]`);
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
    if (part !== undefined) {
      // The block shows the latest note: its text opens the conversation there.
      const [at, seq] = part === 'note' ? ['.vb-nblock-text', note.seq] : [`.vb-nblock-reply[data-reply="${part}"]`, part];
      if (open?.region === region && open.mode === 'thread') return again(at, seq);
      return openWith({ id: region, anchor: [], region, mode: 'thread', kind: 'comment', part: seq, at });
    }
    if (open?.region === region && open.mode !== 'thread' && open.note?.seq === note.seq) return again(undefined);
    openWith({ id: region, anchor: [], region, mode: note.locked ? 'sent' : 'edit', kind: note.kind, note });
  }

  /** Whether the note the bubble is on still exists (Remove in the note block, or another tab). */
  function noteGone(o: Open): boolean {
    if (!o.note) return false;
    const notes = o.region ? d.state().regionNotes.get(o.region) : d.state().items.get(o.id)?.notes;
    return !notes?.some((x) => x.seq === o.note!.seq);
  }

  function place() {
    pins?.draw();
    if (!open) return;
    // A removed note takes its bubble with it, changed words or not: there is nothing to save to.
    if (noteGone(open)) return close(false);
    const at = anchorBox(d, open);
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
    changed();
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

  /** Edit on a note in the conversation (decision 8): the window turns into today's edit mode for
   *  it, beside it; focus still goes back where the conversation opened from. */
  function edit(o: Open, seq: number | undefined) {
    const notes = o.region ? d.state().regionNotes.get(o.region) : d.state().items.get(o.id)?.notes;
    const note = notes?.find((x) => x.seq === seq && !x.locked);
    if (!note) return;
    const base = o.region ? { id: o.region, anchor: [], region: o.region, at: o.at }
      : { id: o.id, anchor: [o.id], at: `.vb-node-note[data-note="${note.seq}"]`, ...(note.nodes && { group: note.nodes.map(String) }) };
    openNow({ ...base, mode: 'edit', kind: note.kind, note, ...(o.back && { back: o.back }) });
  }

  async function onChoice(e: Event) {
    const o = open;
    if (!o) return;
    const { choice, text, note } = (e as CustomEvent<NoteEventDetail>).detail;
    if (choice === 'edit') return edit(o, note);
    const fields = choice === 'cancel' ? null : actFor(o, choice, text);
    if (!fields) return close();
    bubble.setPhase('saving');
    const problem = await d.attempt(fields);
    if (open !== o) return; // closed or replaced while it was on its way
    if (problem !== null) return bubble.setPhase('error', notesWords.notSaved(problem));
    close();
    d.relayout();
    const on = o.region ? notesWords.container(d.region(o.region)?.title ?? o.region) : o.group ? notesWords.cards(o.group.length) : d.node(o.id)?.n ?? o.id;
    d.toast(notesWords.noteOn(on, fields.action));
  }

  bubble.addEventListener('vb-note', (e) => void onChoice(e));
  // Esc or Cancel with changed words: the bubble stays open and asks; OK closes it.
  bindDiscard(bubble, d.discard, () => close(), () => open);
  // A click outside the read-only bubble closes it (ruling 7); one being written keeps it (decision 9).
  const unbindOutside = bindOutside(bubble, d.stage, () => !!open && readOnlyMode(open.mode), (focus) => close(focus));

  return {
    press, group, show: (id, seq, fromNote) => show(id, seq, fromNote), reply, container, showContainer, place,
    destroy: () => { unbindOutside(); bubble.remove(); pins?.destroy(); },
    close: () => {
      if (!bubble.dirty) return close();
      const o = open;
      void mayLeave(bubble, d.discard).then((ok) => { if (ok && open === o) close(); });
    },
    get open() { return open !== null; },
    get unsaved() { return guard.unsaved; },
    leave: guard.leave,
  };
}
