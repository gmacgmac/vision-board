// The stage's input wiring: the click delegate for every button on cards and frames, the pointer
// (select, move by the kind tab, pan, lasso), the keyboard, the size control and how a card got
// focus (pointer-focus.ts). Each control calls one handler; what the handler does lives in the
// controller. Split out of controller.ts (N12_FE_01).
import type { ActionId, ActSize, Mode, Widths } from '#format';
import type { Box, Point } from '#layout';
import { routeLinks } from '#layout';
import type { View } from '#format';
import type { BoardLayout } from '#layout';
import type { KeyHandlers } from './keys.ts';
import { bindKeys } from './keys.ts';
import type { PointerHandlers } from './pointer.ts';
import { bindPointer } from './pointer.ts';
import { bindPointerFocus } from './pointer-focus.ts';
import { bindSizeControl, isSizePick } from './size.ts';
import type { Viewport } from './viewport.ts';

export interface StageHandlers extends Omit<KeyHandlers, 'nudge' | 'nudgeRegion'> {
  /** The pin: open its note, with the agent's replies to it. A note in the card's block
   *  (`fromNote`): the card's conversation, at that note (review polish ruling 6). */
  showNote(id: string, seq: number, fromNote?: boolean): void;
  /** An agent's reply on a card: the card's conversation, at that reply (review polish ruling 6). */
  showReply(id: string, seq: number): void;
  setSize(id: string, size: ActSize): void;
  setMode(region: string, mode: Mode): void;
  /** Match card widths in a container's mode row (widthsControl flag): the widths a press sets. */
  setWidths(region: string, widths: Widths): void;
  resetRegion(region: string): void;
  /** A container's title line (3_FE_04): Comment and the cog's "Put container back". The note
   *  preview and block report their own presses (vb-region-note, region-notes.ts). */
  regionComment(region: string): void;
  putBack(region: string): void;
  /** Remove container in a container's settings (personRemove flag, N24); absent without it. */
  removeRegion?(region: string): void;
  /** Remove access (agentAccess flag); absent without it. */
  revoke?(region: string, holder: string): void;
  /** A container's "N cards retired" marker (retiredMarker flag): show board version `seq`, with the
   *  person's answers as at line `until` when given (versions.ts, review polish ruling 10). */
  showVersion(seq: number, until?: number): void;
  /** Accept or Reject in a card's proposal box (the proposals flag, proposal-flow.ts). */
  answer(id: string, proposal: number, answer: 'accept' | 'reject'): void;
  /** A card nudged by keys to `box`: it becomes a pin. */
  pin(id: string, box: Box): void;
  /** A container nudged by keys (3_FE_04): its frame's top left to `at`, as a container pin. */
  pinRegion(region: string, at: Point): void;
  /** A drag on a container's grip (container-drag.ts): start, move by `d`, drop (null: lost). */
  frameStart: PointerHandlers['frameStart'];
  frameMove: PointerHandlers['frameMove'];
  frameEnd: PointerHandlers['frameEnd'];
  layout(): BoardLayout | null;
  view(): View;
  /** Connectors while cards are dragged: drawn from the moved boxes, no layout. */
  drawDrag(layout: BoardLayout, id: string): void;
  /** A drag on a kind tab (3_FE_03, moves.ts): the cards it carries, its start, the pointer over
   *  the board (the container under it lights up), and the drop (null: the pointer was lost). */
  carried(id: string): string[];
  dragStart(ids: readonly string[]): void;
  dragOver(at: Point): void;
  drop(boxes: ReadonlyMap<string, Box>, at: Point | null): void;
  /** A click on a card (3_FE_01 ruling 1): it alone, or with `add` into or out of the selection. */
  pick(id: string, add: boolean): void;
  /** A click on a background: the selection clears. */
  clear(): void;
  /** The lasso (3_FE_02): drawn while it moves, then ended or dropped (pointer.ts). */
  lassoMove: PointerHandlers['lassoMove'];
  lassoEnd: PointerHandlers['lassoEnd'];
  lassoCancel(): void;
}

const cardOf = (el: Element) => el.closest<HTMLElement>('vb-node')!.dataset.id!;
/** Text the person selected inside `el` by dragging (a note is text to copy, not only a link). */
const selectingIn = (el: Element) => {
  const s = document.getSelection();
  return !!s && !s.isCollapsed && !!s.anchorNode && el.contains(s.anchorNode);
};

/** Bind everything; returns the function that unbinds what outlives the stage (document, window). */
export function bindStage(stage: HTMLElement, vp: Viewport, h: StageHandlers, onResize: () => void): () => void {
  stage.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const actBtn = t.closest<HTMLButtonElement>('button[data-act]');
    if (actBtn) return h.act(cardOf(actBtn), actBtn.dataset.act as ActionId);
    const flagBtn = t.closest<HTMLButtonElement>('button[data-flag]');
    if (flagBtn) return h.flag?.(cardOf(flagBtn));
    const retired = t.closest<HTMLButtonElement>('button.vb-region-retired');
    const until = retired?.dataset.until;
    if (retired) return retired.dataset.version ? h.showVersion(Number(retired.dataset.version), until ? Number(until) : undefined) : undefined;
    // An out-of-date Accept is aria-disabled: it says why, and does nothing.
    const answer = t.closest<HTMLButtonElement>('button[data-answer]');
    if (answer?.getAttribute('aria-disabled') === 'true') return;
    if (answer) return h.answer(cardOf(answer), Number(answer.dataset.proposal), answer.dataset.answer === 'accept' ? 'accept' : 'reject');
    // A reply on a card (a sibling of its note, so not inside it); a container's are the frame's own.
    const reply = t.closest<HTMLElement>('.vb-node-reply[data-reply]');
    if (reply && !t.closest('a') && !selectingIn(reply)) return h.showReply(cardOf(reply), Number(reply.dataset.reply));
    const note = t.closest<HTMLElement>('[data-note]');
    if (note && !t.closest('a') && !selectingIn(note)) return h.showNote(cardOf(note), Number(note.dataset.note), note.matches('.vb-node-note'));
    const sizeBtn = t.closest<HTMLButtonElement>('button[data-size-pick]');
    const pick = sizeBtn?.dataset.sizePick;
    if (sizeBtn && isSizePick(pick)) return h.setSize(cardOf(sizeBtn), pick);
    // A layout icon (data-mode) or a tile of the layout popover (data-tile): the one action.
    const modeBtn = t.closest<HTMLButtonElement>('button[data-mode], button[data-tile]');
    if (modeBtn) return h.setMode(modeBtn.dataset.region!, (modeBtn.dataset.mode ?? modeBtn.dataset.tile) as Mode);
    const widthsBtn = t.closest<HTMLButtonElement>('button.vb-widths[data-widths]');
    if (widthsBtn) return h.setWidths(widthsBtn.dataset.region!, widthsBtn.dataset.widths as Widths);
    const reset = t.closest<HTMLButtonElement>('button[data-reset]');
    if (reset) return h.resetRegion(reset.dataset.reset!);
    const back = t.closest<HTMLButtonElement>('button[data-put-back]');
    if (back) return h.putBack(back.dataset.putBack!);
    const removeRegion = t.closest<HTMLButtonElement>('button[data-remove-region]');
    if (removeRegion) return h.removeRegion?.(removeRegion.dataset.removeRegion!);
    const regionComment = t.closest<HTMLButtonElement>('button[data-region-comment]');
    if (regionComment) return h.regionComment(regionComment.dataset.regionComment!);
    const holder = t.closest<HTMLButtonElement>('button[data-revoke]');
    if (holder && h.revoke) return h.revoke(holder.closest<HTMLElement>('vb-region')!.dataset.region!, holder.dataset.revoke!);
  });

  bindPointer(stage, vp, {
    box: (id) => h.layout()?.nodes.get(id),
    carried: (id) => h.carried(id),
    dragStart: (ids) => h.dragStart(ids),
    dragMove: (boxes, at) => {
      const layout = h.layout();
      if (!layout) return;
      const nodes = new Map(layout.nodes);
      for (const [id, box] of boxes) nodes.set(id, box);
      // Routed as the settled board routes them: round the cards of each container (groups).
      h.drawDrag({ ...layout, nodes, routes: routeLinks(h.view().links, nodes, layout.groups) }, boxes.keys().next().value!);
      h.dragOver(at);
    },
    dragEnd: (boxes, at) => h.drop(boxes, at),
    pick: (id, add) => h.pick(id, add),
    clear: () => h.clear(),
    lassoMove: h.lassoMove,
    lassoEnd: h.lassoEnd,
    lassoCancel: () => h.lassoCancel(),
    frameStart: h.frameStart,
    frameMove: h.frameMove,
    frameEnd: h.frameEnd,
  });

  const unbindKeys = bindKeys({
    ...h,
    nudge: (id, dx, dy) => {
      const b = h.layout()?.nodes.get(id);
      if (b) h.pin(id, { ...b, x: b.x + dx, y: b.y + dy });
    },
    // The same step on a container: from where the layout has its frame now.
    nudgeRegion: (region, dx, dy) => {
      const b = h.layout()?.regions.find((r) => r.id === region)?.box;
      if (b) h.pinRegion(region, { x: b.x + dx, y: b.y + dy });
    },
  });
  const unbindSize = bindSizeControl(stage);
  // A card a pointer focused draws no focus ring until the keyboard moves focus (pointer-focus.ts).
  const unbindFocus = bindPointerFocus(stage);
  // The stage's own size, not the window's: the chat sidebar (chatPanel flag) and the strips change it too.
  const sized = new ResizeObserver(() => onResize());
  sized.observe(stage);
  return () => {
    unbindKeys();
    unbindSize();
    unbindFocus();
    sized.disconnect();
  };
}
