// The container note on the page (3_FE_04 step 4G): the frame's `vb-region-note` presses (Edit
// opens the bubble, a press on the block's note or a reply opens the container's conversation beside
// that, review polish ruling 6; Remove writes note-remove, Show in container / Hide set the frame's
// noteShown), which containers show their note block (page state only, like zoom: not in the
// ledger, reset on reload, ruling 3), and each shown block's height as that container's head
// inset for the layout (`vb-region-note-resize`), so showing one note lays out that one
// container and those below make room. Every write goes through the controller's `attempt`.
import type { RegionNoteEventDetail, RegionNoteResizeDetail, VbRegionElement } from '#ui';
import { REGION_NOTE_EVENT, REGION_NOTE_RESIZE_EVENT } from '#ui';
import type { ActFields } from './io.ts';

export interface RegionNoteDeps {
  stage: HTMLElement;
  /** The open board: the page state is per board and starts empty on another one. */
  board(): string;
  title(region: string): string;
  /** Edit (Open for a sent note): the container's note bubble; `part`, opened from the block's
   *  note ('note') or a reply (its seq): the container's conversation, beside and scrolled to that. */
  edit(region: string, part?: 'note' | number): void;
  attempt(fields: ActFields): Promise<string | null>;
  /** A block's height changed, or a note was removed: lay the board out again. */
  relayout(): void;
  toast(text: string, tone?: 'info' | 'error'): void;
}

export interface RegionNotes {
  /** Region id -> its shown note block's height: `LayoutOptions.headInsets`. */
  insets(): Map<string, number>;
  /** After a draw: every frame shows its block as the page state says (a frame drawn anew). */
  apply(frames: ReadonlyMap<string, VbRegionElement>): void;
  destroy(): void;
}

export function createRegionNotes(d: RegionNoteDeps): RegionNotes {
  let board = '';
  const shown = new Set<string>();
  const heights = new Map<string, number>();

  /** Another board: nothing shown on it yet. */
  function sync() {
    if (board === d.board()) return;
    board = d.board();
    shown.clear();
    heights.clear();
  }

  async function remove(region: string, seq: number) {
    const problem = await d.attempt({ action: 'note-remove', region, note: seq });
    if (problem !== null) return d.toast(`Not removed: ${problem}`, 'error');
    d.relayout();
    d.toast(`Note on container ${d.title(region)} removed`);
  }

  function onNote(e: Event) {
    sync();
    const { region, action, seq, reply } = (e as CustomEvent<RegionNoteEventDetail>).detail;
    const frame = (e.target as Element).closest<VbRegionElement>('vb-region');
    if (action === 'edit') return d.edit(region);
    if (action === 'open') return d.edit(region, reply ?? 'note');
    if (action === 'remove') return void remove(region, seq);
    if (action === 'show') shown.add(region);
    else shown.delete(region);
    // The frame measures its block and reports the height (onResize below).
    if (frame) frame.noteShown = action === 'show';
  }

  /** Lay out again only on a real change of height (the frame reports only those too). */
  function onResize(e: Event) {
    sync();
    const { region, height } = (e as CustomEvent<RegionNoteResizeDetail>).detail;
    if ((heights.get(region) ?? 0) === Math.max(0, height)) return;
    if (height > 0) heights.set(region, height);
    else heights.delete(region);
    d.relayout();
  }

  d.stage.addEventListener(REGION_NOTE_EVENT, onNote);
  d.stage.addEventListener(REGION_NOTE_RESIZE_EVENT, onResize);

  return {
    insets() {
      sync();
      return heights;
    },
    apply(frames) {
      sync();
      for (const [id, frame] of frames) frame.noteShown = shown.has(id);
    },
    destroy() {
      d.stage.removeEventListener(REGION_NOTE_EVENT, onNote);
      d.stage.removeEventListener(REGION_NOTE_RESIZE_EVENT, onResize);
    },
  };
}
