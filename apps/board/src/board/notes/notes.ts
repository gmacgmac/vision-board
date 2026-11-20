// Notes on the board page. A node's notes are one conversation box beside it (D-099 3, FE_03; note-box.ts): C, the
// notes mark, Comment, a history row or a chat link open it, to read and to write, with Ask now; Comment on a selection
// of two or more opens it beside the selection on a note for the group (FE_06); an app window's conversation is its
// drawer (app-drawer.ts). A container's note is the note bubble beside its title line (3_FE_04 rulings 2 and 3): one
// note not yet sent per container, edited by a second press; its conversation, every note and reply oldest first,
// opens from its note block (review polish ruling 6; note-views.ts) and closes with its ×, Esc or a click outside
// (ruling 7, note-outside.ts). Edit on the person's note still editable opens the edit bubble (decision 8), and from
// the box goes back to it. Every write goes through the controller's `attempt` (rule 8); this module only opens,
// places and closes. Changed words are never lost silently (note-discard.ts).
import type { NoteKind } from '#format';
import type { VbNoteBubbleElement } from '#ui';
import { boxAround, loadConversation, placeBubble, readOnlyMode, returnFocus, saveIntent } from '#ui';
import type { NoteEventDetail } from '#ui';
import type { ActFields } from '../io.ts';
import { bindDiscard, createLeave, mayLeave } from './note-discard.ts';
import { bindOutside } from './note-outside.ts';
import { anchorBox } from './note-anchor.ts';
import type { Open } from './note-views.ts';
import { cardView, containerView } from './note-views.ts';
import { noteWrite, unsentRegionNote } from './note-find.ts';
import { boxScale } from '../canvas/index.ts';
import { nodeReach, placeBeside, stageBoxOf } from '../cards/index.ts';
import type * as NoteBox from './note-box.ts';
import * as notesWords from '../words/notes.ts';
import type { NoteDeps, NoteFlow } from './note-flow-types.ts';
import { createDrawers } from './app-drawer.ts';

export function createNoteFlow(d: NoteDeps): NoteFlow {
  const bubble = document.createElement('vb-note-bubble') as VbNoteBubbleElement;
  bubble.hidden = true;
  d.stage.append(bubble);
  const guard = createLeave(bubble, d.discard, d.unsaved, () => close(false));
  /** The bubble opened or closed: the flow's own deps hear it, and the host hears a turn of `unsaved`. */
  const changed = () => { guard.check(); d.changed(); };
  let open: Open | null = null;
  /** The box's code, once loaded (out of the start weight); what it showed last (redrawn only when that changed). */
  let box: typeof NoteBox | null = null;
  let boxShown = '';

  function mark(o: Open, on: boolean) {
    if (o.region) return d.frame(o.region)?.setNoteOpen(on);
    for (const id of o.anchor) d.card(id)?.toggleAttribute('data-bubble', on);
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
    // The box's template loads on its first open (out of the page's start weight); the open waits for it.
    if (o.mode === 'conversation' && !box) {
      const was = open;
      return void Promise.all([import('./note-box.ts'), loadConversation()])
        .then(([m]) => { box = m; if (open === was) openNow(o); }, () => undefined);
    }
    const view = o.mode === 'conversation' ? box!.boxView(d, d.box, o) : o.region ? containerView(d, o) : cardView(d, o);
    if (!view) return;
    // Focus goes back where it was in the frame (Comment, the grip, the note or a reply), else to Comment; on a node,
    // to the mark it opened from, else to the node.
    const at = document.activeElement;
    if (at instanceof HTMLElement && (o.region ? d.frame(o.region)?.contains(at) : o.at && at.matches(o.at))) o.back = at;
    if (open) mark(open, false);
    open = o;
    bubble.show(view.v, view.on, d.markdown);
    if (o.mode === 'thread' || o.mode === 'conversation') bubble.reveal(o.part);
    if (o.mode === 'conversation') shown(o, view.v);
    mark(o, true);
    place();
    bubble.focusText();
    changed();
  }

  /** The box shows `v` for `o`: its replies are read (the notes mark goes back to its count). */
  function shown(o: Open, v: { entries: unknown; box?: unknown }) {
    boxShown = JSON.stringify([v.entries, v.box]);
    d.box.looked(o.id);
  }

  /** The open box drawn again when what it says changed (a reply came, a note went): the field, its words and the
   *  focus stay. */
  function refreshBox(o: Open) {
    const view = box!.boxView(d, d.box, o);
    if (!view || JSON.stringify([view.v.entries, view.v.box]) === boxShown) return;
    bubble.show(view.v, view.on, d.markdown, true);
    shown(o, view.v);
  }

  function press(id: string) {
    if (drawers.isWindow(id)) return drawers.show(id); // an app window's conversation is its drawer (FE_08)
    if (open?.id === id && open.mode === 'conversation' && !open.region) return bubble.focusText();
    // From the notes mark, Esc gives the focus back to it (FIX_01); from C on the node, to the node.
    openWith({ id, anchor: [id], mode: 'conversation', kind: 'comment', at: '[data-mark="notes"]' });
  }

  /** A note on the selection is the conversation box too (FE_06): beside the selection, Ask now by Add note. */
  const group = (ids: readonly string[]) => openWith({ id: ids[0]!, anchor: ids, mode: 'conversation', kind: 'comment', group: ids });

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

  /** Node `id`'s conversation at the note or reply `part`: in the box, on the tab the note is on (a note on several
   *  nodes has its own); an app window's in its drawer. Nothing for a note or reply the node does not hold. */
  function show(id: string, part: number) {
    if (drawers.isWindow(id)) return drawers.show(id, part);
    const notes = d.state().items.get(id)?.notes ?? [];
    const note = notes.find((x) => x.seq === part || d.replies(id).some((r) => r.seq === part && r.to === x.seq));
    if (!note && !d.replies(id).some((r) => r.seq === part)) return;
    openWith({ id, anchor: [id], mode: 'conversation', kind: 'comment', part, ...(note?.nodes && { group: note.nodes.map(String) }) });
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
    drawers.place();
    if (!open) return;
    // A removed note takes its bubble with it, changed words or not: there is nothing to save to. An edit opened from a
    // node's box goes back to the box.
    if (noteGone(open)) return open.then ? openNow(open.then) : close(false);
    if (open.mode === 'conversation') refreshBox(open);
    const at = anchorBox(d, open.mode === 'conversation' ? { ...open, at: undefined } : open);
    if (!at) return close(false);
    // The box beside a node, as every such box: top aligned, right or below, its pointer fixed on it (FIX_04). It is the one
    // box that scales with the board (D-101) only from 80% to 120% (`boxScale`, zoom-rules.ts; points 444, 445).
    const cards = open.mode === 'conversation' ? open.anchor.flatMap((id) => d.card(id) ?? []) : [];
    const card = cards[0];
    const s = card ? boxScale(d.vp.k) : 1;
    bubble.style.setProperty('--vb-box-scale', String(s));
    const size = { w: bubble.offsetWidth * s, h: bubble.offsetHeight * s };
    // One node: beside it. A selection: beside all of them, centred on them when below.
    if (card) {
      const p = placeBeside(boxAround(cards.map((c) => nodeReach(c, d.stage)))!, size, { w: d.stage.clientWidth, h: d.stage.clientHeight },
        boxAround(cards.map((c) => stageBoxOf(c, d.stage)))!);
      return bubble.place({ ...p, arrow: p.arrow / s });
    }
    bubble.place(placeBubble(at, size, { w: d.stage.clientWidth, h: d.stage.clientHeight }));
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
    if (focus && o.region) returnFocus(back ?? host?.querySelector<HTMLElement>('.vb-region-comment'));
    else if (focus) returnFocus(back ?? host);
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
      : { id: o.id, anchor: [o.id], ...(note.nodes && { group: note.nodes.map(String) }) };
    openNow({ ...base, mode: 'edit', kind: note.kind, note, ...(o.back && { back: o.back }), ...(o.mode === 'conversation' && { then: o }) });
  }

  /** What the box's own choices do (note-box.ts); `again` draws it afresh, its field empty. */
  const boxChoices = () => ({ ...d, box: d.box!, bubble, still: (o: Open) => open === o,
    again: (o: Open) => { const { draft: _, ...rest } = o; openNow(rest); },
    done: (o: Open) => { if (open === o) close(); } });

  async function onChoice(e: Event) {
    const o = open;
    if (!o) return;
    const detail = (e as CustomEvent<NoteEventDetail>).detail;
    const { choice, text, note, tab } = detail;
    if (choice === 'edit') return edit(o, note);
    if (o.mode === 'conversation' && choice === 'tab') return openNow({ ...o, group: tab ? tab.split(',') : undefined, part: undefined, draft: bubble.text });
    if (o.mode === 'conversation' && (choice === 'ask' || choice === 'save')) return box!.choose(boxChoices(), o, detail);
    const fields = choice === 'cancel' ? null : actFor(o, choice, text);
    // An edit opened from the box goes back to it, saved or not.
    if (!fields) return o.then ? openNow(o.then) : close();
    bubble.setPhase('saving');
    const problem = await d.attempt(fields);
    if (open !== o) return; // closed or replaced while it was on its way
    if (problem !== null) return bubble.setPhase('error', notesWords.notSaved(problem));
    if (o.then) return openNow(o.then);
    close();
    d.relayout();
    const on = o.region ? notesWords.container(d.region(o.region)?.title ?? o.region) : o.group ? notesWords.cards(o.group.length) : d.node(o.id)?.n ?? o.id;
    d.toast(notesWords.noteOn(on, fields.action));
  }

  bubble.addEventListener('vb-note', (e) => void onChoice(e));
  /** App windows' drawers (FE_08): their own boxes, docked in their windows; Edit opens today's edit bubble. */
  const drawers = createDrawers({ ...d, load: async () => { const [m] = await Promise.all([import('./note-box.ts'), loadConversation()]); return (box = m); },
    edit: (id, seq) => { const note = d.state().items.get(id)?.notes.find((x) => x.seq === seq && !x.locked); if (note) openWith({ id, anchor: [id], mode: 'edit', kind: note.kind, note }); } });
  // Esc or Cancel with changed words: the bubble stays open and asks; OK closes it.
  bindDiscard(bubble, d.discard, () => close(), () => open);
  // A click outside the read-only bubble closes it (ruling 7); one being written keeps it (decision 9).
  // The box with nothing typed in it closes too.
  const unbindOutside = bindOutside(bubble, d.stage, () => !!open && (readOnlyMode(open.mode) || (open.mode === 'conversation' && !bubble.dirty)), (focus) => close(focus));

  return {
    press, group, show, container, showContainer, place,
    destroy: () => { unbindOutside(); bubble.remove(); drawers.destroy(); },
    drawer: (id) => drawers.isOpen(id),
    write: (id, text) => d.attempt(noteWrite(d.state(), id, text, d.ver(id))),
    close: () => {
      if (!bubble.dirty) return close();
      const o = open;
      void mayLeave(bubble, d.discard).then((ok) => { if (ok && open === o) close(); });
    },
    get open() { return open !== null; },
    get unsaved() { return guard.unsaved; },
    leave: guard.leave,
    leaveIf(gone) {
      const o = open;
      const lost = !!o && (o.region ? !!gone.region?.(o.region) : o.anchor.every((id) => !!gone.card?.(id)));
      return lost && guard.unsaved ? guard.leave() : Promise.resolve(true);
    },
  };
}
