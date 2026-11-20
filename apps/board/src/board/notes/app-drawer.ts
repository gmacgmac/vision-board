// An app window's drawer (D-099 5, FE_08): the node's conversation docked on the window's right, the
// same box as any node's (FE_03's `<vb-note-bubble>` in conversation mode, note-box.ts: its tabs, Add note and Ask
// now), one per open drawer, so a window's conversation stays open while other boxes come and go. The arrow in the bar
// (`data-drawer`) shows and hides it; C, a note or a reply on the node show it. Open or closed is remembered per node
// for the page's session. The card's conditions carry it open (app-cards.ts `drawer`), so the board measures the
// window wide with it and its neighbours move aside; then `place`, after every draw, docks each box in its window's
// pane (moving it never reloads the panel beside it). Words typed are never lost: hiding a drawer that holds them asks
// first, and the box rides through a new version of the node (vb-node `keepingDrawer`). Browser only.
import type { VbNoteBubbleElement } from '#ui';
import { NOTE_DISCARD_EVENT, returnFocus } from '#ui';
import type { NoteEventDetail } from '#ui';
import type * as NoteBox from './note-box.ts';
import type { Open } from './note-views.ts';
import type { NoteDeps } from './note-flow-types.ts';

export interface DrawerDeps extends NoteDeps {
  /** The box's code, loaded on first use (notes.ts, out of the page's start weight). */
  load(): Promise<typeof NoteBox>;
  /** Edit on a note in the drawer: today's edit bubble beside the node (notes.ts). */
  edit(id: string, seq: number): void;
}

export interface Drawers {
  /** Node `id` is drawn as an app window (it has a drawer). */
  isWindow(id: string): boolean;
  /** Its drawer is open (app-cards.ts reads it into the card's conditions). */
  isOpen(id: string): boolean;
  /** Show the drawer, focus in its field, scrolled to `part` (a note's or a reply's seq) when given. */
  show(id: string, part?: number): void;
  /** Dock each open drawer's box in its window and draw what it says now; after every draw. */
  place(): void;
  destroy(): void;
}

interface Entry { id: string; bubble: VbNoteBubbleElement; o: Open; shown: string; focus: boolean; part?: number }

export function createDrawers(d: DrawerDeps): Drawers {
  /** The drawers open, by board and node, for the page's session. */
  const open = new Set<string>();
  const entries = new Map<string, Entry>();
  let box: typeof NoteBox | null = null;
  const key = (id: string) => `${d.board?.() ?? ''}\n${id}`;
  const isWindow = (id: string) => d.card(id)?.hasAttribute('data-window') === true;

  /** What the box says for `e`, drawn afresh (`fresh`: the field empty) or kept (the words typed and the focus stay). */
  function draw(e: Entry, fresh: boolean) {
    const view = box!.boxView(d, d.box!, e.o);
    if (!view) return;
    const shown = JSON.stringify([view.v.entries, view.v.box]);
    if (!fresh && shown === e.shown) return;
    e.bubble.show(view.v, view.on, d.markdown, !fresh && e.shown !== '');
    e.shown = shown;
    d.box!.looked(e.id);
  }

  const choices = (e: Entry): NoteBox.BoxChoiceDeps => ({
    ...d, box: d.box!, bubble: e.bubble, still: (o) => entries.get(e.id) === e && e.o === o,
    again: (o) => { const { draft: _, ...rest } = o; e.o = rest; draw(e, true); e.bubble.reveal(); e.bubble.focusText(); },
    // The drawer is the app window's own pane: after Add note it stays, cleared for the next (point 659 closes the box).
    done: (o) => choices(e).again(o),
  });

  function onChoice(e: Entry, detail: NoteEventDetail) {
    const { choice, note, tab } = detail;
    if (choice === 'save' || choice === 'ask') return void box!.choose(choices(e), e.o, detail);
    if (choice === 'edit' && note !== undefined) return d.edit(e.id, note);
    if (choice === 'tab') {
      e.o = { ...e.o, group: tab ? tab.split(',') : undefined, draft: e.bubble.text };
      draw(e, true);
      return e.bubble.focusText();
    }
    if (choice === 'cancel') hide(e.id);
  }

  function entry(id: string): Entry {
    const bubble = document.createElement('vb-note-bubble') as VbNoteBubbleElement;
    const e: Entry = { id, bubble, o: { id, anchor: [id], mode: 'conversation', kind: 'comment' }, shown: '', focus: false };
    bubble.addEventListener('vb-note', (ev) => { ev.stopPropagation(); onChoice(e, (ev as CustomEvent<NoteEventDetail>).detail); });
    // Esc or × with words typed: asks, then hides.
    bubble.addEventListener(NOTE_DISCARD_EVENT, (ev) => { ev.stopPropagation(); void d.discard().then((ok) => { if (ok) hide(id, true); }); });
    entries.set(id, e);
    return e;
  }

  /** Hide node `id`'s drawer; words typed in it ask first (`asked`: they already did). Focus in it goes to the arrow. */
  function hide(id: string, asked = false) {
    const e = entries.get(id);
    if (e && !asked && e.bubble.dirty) return void d.discard().then((ok) => { if (ok) hide(id, true); });
    const card = d.card(id);
    const back = e?.bubble.contains(document.activeElement) ? card?.querySelector<HTMLElement>('[data-drawer]') : null;
    open.delete(key(id));
    e?.bubble.remove();
    entries.delete(id);
    d.relayout();
    returnFocus(back);
  }

  function show(id: string, part?: number) {
    const why = d.paused?.();
    if (why) return d.toast(why);
    open.add(key(id));
    const e = entries.get(id) ?? entry(id);
    e.focus = true;
    if (part !== undefined) e.part = part;
    if (e.bubble.isConnected) return place();
    d.relayout(); // the window is measured wide with its drawer, then `place` docks the box
  }

  function place() {
    if (!d.box) return;
    if (!box) return void d.load().then((m) => { box = m; place(); }, () => undefined);
    for (const [id, e] of entries) {
      const pane = open.has(key(id)) ? d.card(id)?.querySelector<HTMLElement>('.vb-win-drawer-pane') : null;
      if (!pane) { e.bubble.remove(); if (!open.has(key(id))) entries.delete(id); continue; }
      if (e.bubble.parentElement !== pane) pane.append(e.bubble);
      draw(e, e.shown === '');
      if (e.part !== undefined) e.bubble.reveal(e.part);
      if (e.focus) e.bubble.focusText();
      e.focus = false;
      e.part = undefined;
    }
    // A drawer remembered open on a window drawn afresh (a board opened again) gets its box back.
    for (const k of open) {
      const [board, id] = k.split('\n') as [string, string];
      if (board === (d.board?.() ?? '') && !entries.has(id) && isWindow(id)) { entry(id); return place(); }
    }
  }

  // The arrow in the window's bar shows and hides the drawer.
  const onClick = (ev: MouseEvent) => {
    const arrow = (ev.target as Element).closest<HTMLElement>('vb-node[data-window] [data-drawer]');
    const id = arrow?.closest<HTMLElement>('vb-node')?.dataset.id;
    if (id === undefined) return;
    if (open.has(key(id))) hide(id);
    else show(id);
  };
  d.stage.addEventListener('click', onClick);

  return {
    isWindow,
    isOpen: (id) => open.has(key(id)),
    show,
    place,
    destroy() {
      d.stage.removeEventListener('click', onClick);
      for (const e of entries.values()) e.bubble.remove();
      entries.clear();
    },
  };
}
