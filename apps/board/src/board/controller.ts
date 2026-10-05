// The board controller: holds the project ledger state (live.ts), works the open board out from it
// (board-data.ts), draws what changed (draw.ts), and routes every person action through the action
// layer and the I/O module. Layout, formats and actions live in packages/; the modules beside this
// one wire them to the canvas: focus.ts (navigation), wiring.ts (input), item-acts.ts (a card's
// review buttons), access-flow.ts (agent access), notes.ts (note bubbles), selection.ts and
// selection-flow.ts (the selection, the lasso, the bar and the view commands), places.ts (pins,
// modes, sizes), moves.ts (containers, Later, Move to) and sender.ts (sending acts). Plain
// TypeScript (D-005): the Svelte shell mounts it on the stage and reads what it reports via `shell`.
import type { View, ViewNode } from '../../../../packages/format/src/index.ts';
import { flagOn } from '../../../../packages/format/src/index.ts';
import { counts, placedView, replyText } from '../../../../packages/actions/src/index.ts';
import type { LedgerEvent } from '../../../../packages/format/src/index.ts';
import type { BoardData } from './io.ts';
import { ApiError } from './io.ts';
import { createBoards } from './boards.ts';
import { boardData, decidedIds, drewOn } from './board-data.ts';
import type { BoardElements } from './draw.ts';
import { createDrawing } from './draw.ts';
import { createLive } from './live.ts';
import { createFocus } from './focus.ts';
import { bindStage } from './wiring.ts';
import { Viewport } from './viewport.ts';
import { createPlaces } from './places.ts';
import { requestRows } from './access.ts';
import { createAccessFlow } from './access-flow.ts';
import { createNoteFlow } from './notes.ts';
import { createItemActs } from './item-acts.ts';
import { createSelection } from './selection.ts';
import { createSelectionFlow } from './selection-flow.ts';
import { createMoves } from './moves.ts';
import { createSender } from './sender.ts';
import type { CommandId } from './commands.ts';
import { exposeWork } from './work.ts';
import { pageFlags } from '../flags.ts';
import { shell, toast } from '../shell/shell.svelte.ts';

export type { BoardElements } from './draw.ts';

export interface Board {
  boot(): Promise<void>;
  switchTo(id: string): void;
  /** A view command from the header (zoom out, Fit, zoom in; commands.ts). */
  command(id: CommandId): void;
  toggleHide(): void;
  /** Allow or Refuse a grant request (agentAccess flag); true when it was recorded. */
  answer(request: number, answer: 'grant' | 'deny', text?: string): Promise<boolean>;
  /** Send to agent; null when recorded, else the problem's detail. */
  send(): Promise<string | null>;
  destroy(): void;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export function createBoard(els: BoardElements): Board {
  const { stage, world } = els;
  const vp = new Viewport(stage, world, flagOn('hideControlsZoomedOut', pageFlags())); // N13, rule 12
  /** Card size tiers and their control (D-030), behind the nodeSize flag (rule 12). */
  const sizing = flagOn('nodeSize', pageFlags());
  /** Grant requests, holders and Send (D-027), behind the agentAccess flag (rule 12). */
  const access = flagOn('agentAccess', pageFlags());
  shell.agentAccess = access;

  const S = {
    id: '',
    data: null as BoardData | null,
    /** A draw waiting for the next frame, so lines that land together draw once (approach 5). */
    frame: 0,
    /** The waiting draw starts from scratch (the state was read afresh). */
    fresh: false,
    /** The waiting draw shows lines in which the agent drew on this board. */
    drew: false,
    /** A card is being dragged: Later shows as a drop target although it holds none (3_FE_03). */
    later: false,
    /** The board as the agent drew it, before the person's moves (where Reopen sends a card). */
    drawn: null as View | null,
  };

  const view = (): View => S.data!.view;
  const nodeOf = (id: string): ViewNode | undefined => view().nodes.find((n) => n.id === id);
  /** A node act names the node by number and the version the person was looking at. */
  const target = (id: string) => ({ n: Number(id), ver: S.data!.versions[id] });

  const hiddenSet = (): Set<string> => (shell.hide && S.data ? decidedIds(S.data) : new Set());

  const live = createLive(onLines);
  /** The person's selection (3_FE_01): view state; a change updates only the cards it names. */
  const selection = createSelection();
  const drawing = createDrawing({
    els, vp, sizing, access, data: () => S.data!, hidden: hiddenSet, focus: () => focus.id, selected: (id) => selection.has(id),
  });
  const focus = createFocus({ cards: els.cards, vp, view, layout: () => drawing.layout, changed: () => drawing.refocus() });
  selection.onChange((c) => {
    drawing.restate(c.changed);
    shell.selection = c.text;
    flow.dismissArea();
    flow.place();
  });

  // ---- messages and drawing ------------------------------------------------------------------

  function fail(err: unknown) {
    const e = err instanceof ApiError ? err : new ApiError(String(err));
    toast([e.message, ...e.problems].join(' · '), 'error');
  }

  /** Lines were applied to the held state: draw them in the next frame. */
  function onLines(lines: LedgerEvent[], full: boolean) {
    if (full) S.fresh = true;
    else if (S.id && drewOn(live.state!, lines, S.id)) S.drew = true;
    if (!S.frame) S.frame = requestAnimationFrame(() => { S.frame = 0; redraw(); });
  }

  /** Work the open board out from the held state and draw what changed, now; while a batch of acts
   *  is on its way (sender.ts) the draw waits for its end. */
  function redraw(fresh = false) {
    cancelAnimationFrame(S.frame);
    S.frame = 0;
    S.fresh ||= fresh;
    const s = live.state;
    if (!s || !s.boards.has(S.id) || sender.held) return;
    const full = S.fresh;
    const drew = S.drew && !full;
    S.fresh = S.drew = false;
    const d = boardData(s, S.id);
    S.drawn = d.view;
    // Each card in the container the person put it in, Later last (3_FE_03 rulings 2 and 5).
    S.data = { ...d, view: placedView(d.view, d.state, { later: S.later }) };
    // The selection survives a redraw; ids that left the board drop out of it (ruling 8).
    selection.keep(view().nodes.map((n) => n.id));
    Object.assign(shell, { title: view().title, version: view().version, summary: view().summary ?? '' });
    drawing.draw(full);
    renderCounts();
    notes.place();
    flow.place();
    if (drew) toast(`The agent drew v${view().version}`);
  }

  function renderCounts() {
    const st = S.data!.state;
    const c = counts(view(), st);
    shell.counts = { open: c.open, decided: c.decided, later: c.later };
    shell.replyText = replyText(view(), st);
    shell.answered = view().nodes.filter((n) => n.n !== undefined && st.items.has(n.id)).length;
    shell.requests = access ? requestRows(S.data!) : [];
  }

  // ---- actions -------------------------------------------------------------------------------

  /** Every act goes through here: the server validates it, its problems show in the error toast,
   * and the stored line comes back and is applied in place (sender.ts). */
  const sender = createSender({ board: () => S.id, own: (e) => live.own(e), redraw: () => redraw(), fail });
  const { attempt, record } = sender;

  /** Notes beside cards (2e_FE_01): the bubble, opened by C, M, the pin or a note. */
  const notes = createNoteFlow({
    stage, vp, node: nodeOf, state: () => S.data!.state, layout: () => drawing.layout, card: (id) => drawing.cards.get(id),
    region: (id) => view().regions.find((r) => r.id === id), frame: (id) => drawing.frames.get(id),
    ver: (id) => S.data?.versions[id], attempt, relayout: () => redraw(), toast: (t) => toast(t), changed: () => flow.place(),
  });
  /** Moving cards between containers, Later and the Move to list (3_FE_03, moves.ts). */
  const moves = createMoves({
    stage, vp, selection, layout: () => drawing.layout, view, drawn: () => S.drawn!, state: () => S.data!.state,
    frame: (region) => drawing.frames.get(region), target, run: (steps) => sender.run(steps),
    showLater: (on) => { S.later = on; }, redraw: () => redraw(), toast: (t) => toast(t),
  });
  /** The lasso, the selection bar and the view commands (3_FE_02, selection-flow.ts). */
  const flow = createSelectionFlow({
    stage, vp, selection, notes, layout: () => drawing.layout,
    item: (id) => nodeOf(id)?.n, commentOn: (id) => void act(id, 'comment'), openMove: moves.openMenu,
  });
  vp.onApply = () => {
    notes.place();
    flow.place();
    drawing.viewMoved();
  };

  const accessFlow = createAccessFlow({ stage, data: () => S.data!, record });

  /** The review buttons and their keys on one card (item-acts.ts). */
  const act = createItemActs({
    node: nodeOf, state: () => S.data!.state, notes, moves, record, target, hiding: () => shell.hide, hidden: hiddenSet,
    neighbour: (id, dir) => focus.neighbour(id, dir), focusCard: (id) => drawing.cards.get(id)?.focus({ preventScroll: true }),
    toast: (t) => toast(t),
  });

  /** Pins, Reset places, the layout mode and the size tier (places.ts). */
  const places = createPlaces({
    vp, view, state: () => S.data!.state, layout: () => drawing.layout, target, record, redraw: () => redraw(),
  });

  /** Send to agent; it greys the notes it sent at once (2e_FE_01 ruling 7). */
  const send = () => attempt({ action: 'send' });

  function toggleHide() {
    shell.hide = !shell.hide;
    if (S.data) redraw();
  }

  // ---- wiring --------------------------------------------------------------------------------

  const unbind = bindStage(stage, vp, {
    act: (id, a) => void act(id, a),
    showNote: (id, seq) => notes.show(id, seq),
    setSize: places.setSize,
    setMode: (region, mode) => void places.setMode(region, mode),
    resetRegion: (region) => void places.resetRegion(region),
    regionComment: (region) => notes.container(region),
    regionNote: (region) => notes.showContainer(region),
    putBack: (region) => void places.putBack(region),
    ...(access && { revoke: (region: string, holder: string) => void accessFlow.revoke(region, holder) }),
    pin: (id, box) => void places.pin(id, box),
    unpin: (id) => void places.unpin(id),
    layout: () => drawing.layout,
    view,
    drawDrag: (layout, id) => drawing.wiresFor(layout, id),
    carried: moves.carried,
    dragStart: moves.dragStart,
    dragOver: moves.dragOver,
    drop: (boxes, at) => void moves.drop(boxes, at),
    step: (from, dir) => {
      const next = focus.neighbour(from, dir);
      if (next) drawing.cards.get(next)?.focus({ preventScroll: true });
    },
    command: (id, key) => flow.command(id, key),
    toggleHide,
    lassoMove: flow.lassoMove,
    lassoEnd: flow.lassoEnd,
    lassoCancel: flow.lassoCancel,
    pick: (id, add) => selection.select([id], add ? 'toggle' : 'only'),
    toggle: (id) => selection.select([id], 'toggle'),
    clear: () => { selection.clear(); flow.dismissArea(); },
    // Esc closes an open bubble first, else clears the selection (ruling 1).
    escape: () => {
      if (notes.open) return notes.close();
      shell.replyOpen = false;
      flow.dismissArea();
      selection.clear();
    },
  }, () => { if (drawing.layout) vp.apply(); });

  // ---- boards --------------------------------------------------------------------------------

  /** Boot, and switching boards (boards.ts). */
  const boards = createBoards({
    live, vp, selection, id: () => S.id, setId: (id) => { S.id = id; }, redraw, layout: () => drawing.layout, fail,
  });

  exposeWork({
    async rebuild() {
      await live.load();
      redraw(true);
    },
    async idle() {
      await sender.idle();
      await live.sync();
      while (S.frame) await nextFrame();
    },
  });

  return {
    boot: boards.boot,
    switchTo: boards.switchTo,
    command: (id) => void flow.command(id),
    toggleHide,
    answer: (request, a, text) => accessFlow.answer(request, a, text),
    send,
    destroy() {
      boards.stop();
      unbind();
      notes.destroy();
      flow.destroy();
      moves.menu.destroy();
    },
  };
}
