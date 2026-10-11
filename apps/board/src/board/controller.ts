// The board controller: holds the project ledger state (live.ts), works the open board out from it
// (board-data.ts), draws what changed (draw.ts), and routes every person action through the action
// layer and the I/O module. Layout, formats and actions live in packages/; the modules beside this
// one wire them to the canvas: boards.ts (boot, picker, kept view), attention.ts (marks, badges,
// toast, board seen), focus.ts (navigation), wiring.ts (input), item-acts.ts (review buttons),
// access-flow.ts (agent access), notes.ts and region-notes.ts (note bubbles, container notes),
// selection.ts and selection-flow.ts (selection, lasso, bar, view commands), places.ts (pins, modes,
// sizes), moves.ts (containers, Later, Move to), sender.ts (sending acts), versions.ts (the version
// dropdown, the read-only past view), finder.ts (the container finder), board-edit.ts (New board,
// Rename board), proposal-flow.ts (proposals), update-flow.ts (changed cards), parking.ts (handover, replies),
// chat-bridge.ts (the chat panel's side of the board, chatPanel flag), flag-flow.ts (the person's flag,
// cardFlag flag), retired.ts (the "N cards retired" markers, retiredMarker flag) and toolbar-counts.ts
// (the toolbar's numbers). Plain TypeScript (D-005).
import { flagOn, type LedgerEvent, type View, type ViewNode } from '../../../../packages/format/src/index.ts';
import { placedView } from '../../../../packages/actions/src/index.ts';
import { ApiError, type BoardData } from './io.ts';
import { createBoards } from './boards.ts';
import { boardData, decidedIds, numberedView } from './board-data.ts';
import { createAttention } from './attention.ts';
import { type BoardElements, createDrawing } from './draw.ts';
import { createLive } from './live.ts';
import { createFocus } from './focus.ts';
import { bindStage } from './wiring.ts';
import { Viewport } from './viewport.ts';
import { createPlaces } from './places.ts';
import { type AccessFlow, createAccessFlow } from './access-flow.ts';
import { createNoteFlow } from './notes.ts';
import { DISCARD_ASK } from './note-discard.ts';
import { createRegionNotes } from './region-notes.ts';
import { createItemActs } from './item-acts.ts';
import { createSelection } from './selection.ts';
import { createSelectionFlow } from './selection-flow.ts';
import { createMoves } from './moves.ts';
import { createContainerDrag } from './container-drag.ts';
import { createSender } from './sender.ts';
import { type BoardEdit, createBoardEdit } from './board-edit.ts';
import { createVersions } from './versions.ts';
import { createProposalFlow, type ProposalFlow } from './proposal-flow.ts';
import { createUpdateFlow } from './update-flow.ts';
import { createParking } from './parking.ts';
import { zoomToContainer } from './finder.ts';
import { createFlagFlow } from './flag-flow.ts';
import { retiredCounts, type RetiredCount } from './retired.ts';
import { showCounts } from './toolbar-counts.ts';
import type { CommandId } from './commands.ts';
import type { ChatBridge } from './chat-bridge.ts';
import { exposeWork } from './work.ts';
import { pageFlags } from '../flags.ts';
import { askConfirm, shell, toast } from '../shell/shell.svelte.ts';

export type { BoardElements } from './draw.ts';

export interface Board {
  boot(): Promise<void>;
  switchTo(id: string): void;
  /** Show a past version of the open board, read-only, or now with null (versions.ts). */
  showVersion(seq: number | null): Promise<void>;
  /** A view command from the header (zoom out, Fit, zoom in; commands.ts), or the finder's zoom to a container. */
  command(id: CommandId): void;
  goToContainer(id: string): boolean;
  toggleHide(): void;
  /** Allow or Refuse a grant request, Remove access (agentAccess flag, access-flow.ts). */
  access: AccessFlow;
  /** The proposals notice's Review and Accept all (proposals flag, proposal-flow.ts). */
  proposals: Pick<ProposalFlow, 'review' | 'acceptAll'>;
  /** Send to agent; null when recorded, else the problem's detail. */
  send(): Promise<string | null>;
  /** New board or Rename board from the picker (board-edit.ts). */
  saveBoard: BoardEdit['save'];
  /** The toolbar's "N flagged" chip: the next flagged card (cardFlag flag, flag-flow.ts). */
  nextFlagged(): void;
  destroy(): void;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export function createBoard(els: BoardElements, chat?: ChatBridge): Board {
  const { stage, world } = els;
  const vp = new Viewport(stage, world, flagOn('hideControlsZoomedOut', pageFlags())); // N13, rule 12
  // Behind flags (rule 12): card size tiers and their control (nodeSize, D-030); grant requests,
  // holders and Send (agentAccess, D-027); connectors behind frames and cards (wireLayers, D-032);
  // the agent's proposals on cards and the bar (proposals, FE_01); changed cards and seen (cardUpdates, FE_02); NEW (newCards).
  const on = (f: Parameters<typeof flagOn>[0]) => flagOn(f, pageFlags());
  const [sizing, access, layers, finder, proposing, updating, newCards, everyNode, flagging, retiring] = [on('nodeSize'), on('agentAccess'), on('wireLayers'),
    on('containerFinder'), on('proposals'), on('cardUpdates'), on('newCards'), on('everyNode'), on('cardFlag'), on('retiredMarker')];
  shell.agentAccess = access;
  world.toggleAttribute('data-wire-layers', layers);
  for (const [attr, flag] of [['data-title-tip', 'titleTip'], ['data-note-preview', 'notePreview']] as const) world.toggleAttribute(attr, flagOn(flag, pageFlags())); // hover tips (FE_03, FE_04, rule 12)

  const S = {
    id: '',
    data: null as BoardData | null,
    /** A draw waiting for the next frame, so lines that land together draw once (approach 5). */
    frame: 0,
    /** The waiting draw starts from scratch (the state was read afresh). */
    fresh: false,
    /** The waiting draw shows lines in which the agent drew on this board (`board.drawn`). */
    drew: false,
    /** A card is being dragged: Later shows as a drop target although it holds none (3_FE_03). */
    later: false,
    /** The board as the agent drew it, before the person's moves (where Reopen sends a card). */
    drawn: null as View | null,
    /** Each container's "N cards retired" marker (retiredMarker flag). */
    retired: new Map() as ReadonlyMap<string, RetiredCount>,
  };

  const view = (): View => S.data!.view;
  const nodeOf = (id: string): ViewNode | undefined => view().nodes.find((n) => n.id === id);
  /** A node act names the node by number and the version the person was looking at. */
  const target = (id: string) => ({ n: Number(id), ver: S.data!.versions[id] });

  const hiddenSet = (): Set<string> => (shell.hide && S.data ? decidedIds(S.data, attention.owedCards()) : new Set()); // kept while owed (FE_01)

  const live = createLive(onLines);
  const attention = createAttention({ state: () => live.state, board: () => S.id, fail, readOnly: () => !!versions.state });
  /** The version dropdown and a past version, read-only (navigation FE_01), behind the versionView flag. */
  const versions = createVersions({
    world, on: (shell.versionView = on('versionView')), live: () => live.state, board: () => S.id, fail,
    redraw: () => { redraw(true); if (!versions.state) attention.batch([], true); },
  });
  /** The person's selection (3_FE_01): view state; a change updates only the cards it names. */
  const selection = createSelection();
  const drawing = createDrawing({
    els, vp, sizing, access, layers, data: () => S.data!, hidden: hiddenSet, focus: () => focus.id, selected: (id) => selection.has(id),
    insets: () => regionNotes.insets(), owed: () => attention.owed(), replies: () => parking.containers(), flag: flagging, retired: () => S.retired,
    facts: (n) => ({ ...proposals.card(n), ...updates.card(n), ...parking.card(n) }),
  });
  const focus = createFocus({ cards: els.cards, vp, view, layout: () => drawing.layout, changed: () => drawing.refocus() });
  selection.onChange((c) => { drawing.restate(c.changed); shell.selection = c.text; flow.dismissArea(); flow.place(); });

  // ---- messages and drawing ------------------------------------------------------------------

  function fail(err: unknown) {
    const e = err instanceof ApiError ? err : new ApiError(String(err));
    toast([e.message, ...e.problems].join(' · '), 'error');
  }

  /** Lines were applied to the held state: draw them in the next frame. */
  function onLines(lines: LedgerEvent[], full: boolean) {
    S.fresh ||= full;
    S.drew ||= attention.batch(lines, full);
    // A past version stays as it is; only the dropdown's "now" moves (versions.ts).
    if (!S.frame && !versions.state) S.frame = requestAnimationFrame(() => { S.frame = 0; redraw(); });
    boards.listed();
    versions.listed();
  }

  /** Work the open board out from the held state and draw what changed, now; while a batch of acts
   *  is on its way (sender.ts) the draw waits for its end. */
  function redraw(fresh = false) {
    cancelAnimationFrame(S.frame);
    S.frame = 0;
    S.fresh ||= fresh;
    const s = versions.state ?? live.state;
    if (!s || !s.boards.has(S.id) || sender.held) return;
    const full = S.fresh;
    const drew = S.drew && !full;
    S.fresh = S.drew = false;
    const d = boardData(s, S.id);
    if (!flagging) d.state.flags.clear(); // the person's flags show only with the flag on
    S.retired = retiring ? retiredCounts(s, S.id, shell.versionView) : new Map();
    S.drawn = d.view;
    // Each card in the container the person put it in, Later last (3_FE_03 rulings 2 and 5).
    S.data = { ...d, view: numberedView(placedView(d.view, d.state, { later: S.later }), everyNode) }; // numbers on every card (everyNode)
    // The selection survives a redraw; ids that left the board drop out of it (ruling 8).
    selection.keep(view().nodes.map((n) => n.id));
    proposals.refresh(); updates.refresh(); parking.refresh();
    Object.assign(shell, { title: view().title, summary: view().summary ?? '' }, !shell.versionView && { version: view().version });
    drawing.draw(full);
    regionNotes.apply(drawing.frames);
    renderCounts();
    notes.place();
    flow.place();
    chat?.drawn();
    if (drew) toast(`The agent drew v${shell.version}`);
  }

  const renderCounts = () => showCounts(S.data!, view(), drawing.layout, { finder, access }, flags.ids().length);

  // ---- actions -------------------------------------------------------------------------------

  /** Every act goes through here: the server validates it, its problems show in the error toast,
   * and the stored line comes back and is applied in place (sender.ts). */
  const sender = createSender({ board: () => S.id, own: (line, board) => live.own(line, board), redraw: () => redraw(), fail, readOnly: () => !!versions.state });
  const { attempt, record } = sender;
  const proposals = createProposalFlow({
    on: proposing, stage, state: () => live.state, found: () => attention.proposals(), readOnly: () => !!versions.state,
    ver: (n) => S.data?.versions[String(n)], card: (id) => drawing.cards.get(id), record, run: (steps) => sender.run(steps), toast,
  });
  const updates = createUpdateFlow({ on: updating, stage, selection, state: () => live.state, board: () => S.id, unseen: () => attention.unseen(), newCards, fresh: () => attention.fresh(),
    readOnly: () => !!versions.state, card: (id) => drawing.cards.get(id), seen: (marks) => sender.seen(marks), redraw: () => redraw(), source: (n) => chat?.source(n) });
  /** "Awaiting", the handover and the agent's replies under notes (parking.ts), from the state the board is drawn from. */
  const parking = createParking({ handover: on('handover'), replies: on('cardReplies'), state: () => versions.state ?? live.state, board: () => S.id,
    awaiting: () => attention.awaiting(), readOnly: () => !!versions.state });
  /** Notes beside cards (2e_FE_01): the bubble, opened by C, M, the pin or a note. */
  const notes = createNoteFlow({
    stage, vp, node: nodeOf, state: () => S.data!.state, layout: () => drawing.layout, card: (id) => drawing.cards.get(id),
    region: (id) => view().regions.find((r) => r.id === id), frame: (id) => drawing.frames.get(id),
    ver: (id) => S.data?.versions[id], attempt, relayout: () => redraw(), toast: (t) => toast(t), changed: () => flow.place(),
    discard: () => askConfirm(...DISCARD_ASK),
  });
  /** A container's note preview and block: Edit, Remove, Show in container (region-notes.ts). */
  const regionNotes = createRegionNotes({
    stage, board: () => S.id, title: (id) => view().regions.find((r) => r.id === id)?.title ?? id, edit: notes.showContainer,
    attempt, relayout: () => redraw(), toast,
  });
  /** Moving cards between containers, Later and the Move to list (3_FE_03, moves.ts). */
  const moves = createMoves({
    stage, vp, selection, layout: () => drawing.layout, view, drawn: () => S.drawn!, state: () => S.data!.state,
    frame: (region) => drawing.frames.get(region), target, run: (steps) => sender.run(steps),
    showLater: (on) => { S.later = on; }, redraw: () => redraw(), toast: (t) => toast(t),
  });
  /** The lasso, the selection bar and the view commands (3_FE_02, selection-flow.ts). */
  const flow = createSelectionFlow({
    stage, vp, selection, notes, layout: () => drawing.layout, pill: on('selectionPill'), // the pill (stage5-follow-ups FE_02)
    item: (id) => nodeOf(id)?.n, commentOn: (id) => void act(id, 'comment'), openMove: moves.openMenu, pinned: (id) => !!S.data?.state.pins.has(id), resetPlaces: (ids) => void places.resetCards(ids), readOnly: () => !!versions.state,
  });
  vp.onApply = () => { notes.place(); flow.place(); drawing.viewMoved(); boards.moved(); };

  const accessFlow = createAccessFlow({ stage, data: () => S.data!, record });
  /** The person's flag: the button, Shift+F and the toolbar's chip (flag-flow.ts). */
  const flags = createFlagFlow({ on: flagging, view: () => S.data?.view ?? null, state: () => S.data?.state ?? null, record, focused: () => focus.id,
    drawn: (id) => !!drawing.layout?.nodes.has(id), focusCard: (id) => drawing.cards.get(id)?.focus({ preventScroll: true }), toast: (t) => toast(t) });
  /** The chat panel's side of the board (chat-bridge.ts): chips from the notes and the selection, a change chip's zoom. */
  const unchat = chat?.board({ stage, data: () => S.data, id: () => S.id, selection, readOnly: () => !!versions.state, toast,
    zoom: () => void flow.command('zoom-selection'), switchTo: (id) => boards.switchTo(id), jump: (id) => boards.jump(id) });

  /** The review buttons and their keys on one card (item-acts.ts). */
  const act = createItemActs({ node: nodeOf, state: () => S.data!.state, notes, moves, record, target, hiding: () => shell.hide, hidden: hiddenSet,
    neighbour: (id, dir) => focus.neighbour(id, dir), focusCard: (id) => drawing.cards.get(id)?.focus({ preventScroll: true }), toast: (t) => toast(t) });

  /** Pins, Reset places, the layout mode and the size tier (places.ts). */
  const places = createPlaces({ vp, view, state: () => S.data!.state, layout: () => drawing.layout, target, record, redraw: () => redraw(),
    settle: () => drawing.settle(), run: (steps) => sender.run(steps) });
  /** Moving a whole container by its grip or Alt+arrows (3_FE_04, container-drag.ts). */
  const frames = createContainerDrag({ layout: () => drawing.layout, view, frame: (r) => drawing.frames.get(r), card: (id) => drawing.cards.get(id),
    drawDrag: (l) => drawing.wiresFor(l, focus.id), settle: () => drawing.settle(), record, redraw: () => redraw() });

  const toggleHide = () => { shell.hide = !shell.hide; if (S.data) redraw(); };

  // ---- wiring --------------------------------------------------------------------------------

  // While a past version shows, the handlers that act do nothing (versions.ts `guard`).
  const unbind = bindStage(stage, vp, versions.guard({
    act: (id, a) => void act(id, a), ...(flagging && { flag: (id: string) => void flags.toggle(id) }), showVersion: (seq) => void showVersion(seq),
    answer: (id, seq, a) => void proposals.answer(id, seq, a),
    showNote: (id, seq) => notes.show(id, seq), setSize: places.setSize,
    setMode: (region, mode) => void places.setMode(region, mode),
    resetRegion: (region) => void places.resetRegion(region), putBack: (region) => void places.putBack(region),
    regionComment: (region) => notes.container(region),
    ...(access && { revoke: (region: string, holder: string) => void accessFlow.revoke(region, holder) }),
    pin: (id, box) => void places.pin(id, box), pinRegion: (region, at) => void frames.pin(region, at),
    frameStart: frames.start, frameMove: frames.move, frameEnd: (d) => void frames.end(d),
    regionCommand: (_id, region) => notes.container(region, 'comment'), unpin: (id) => void places.unpin(id),
    layout: () => drawing.layout, view, drawDrag: (layout, id) => drawing.wiresFor(layout, id),
    carried: moves.carried, dragStart: moves.dragStart, dragOver: moves.dragOver,
    drop: (boxes, at) => void moves.drop(boxes, at),
    step: (from, dir) => { const next = focus.neighbour(from, dir); if (next) drawing.cards.get(next)?.focus({ preventScroll: true }); },
    command: (id, key) => flow.command(id, key), toggleHide, lassoMove: flow.lassoMove, lassoEnd: flow.lassoEnd, lassoCancel: flow.lassoCancel,
    pick: (id, add) => { selection.select([id], add ? 'toggle' : 'only'); updates.saw([id]); },
    toggle: (id) => selection.select([id], 'toggle'), clear: () => { selection.clear(); flow.dismissArea(); },
    // Esc closes an open bubble first, then the open selection bar (FE_02), then leaves a past version, else clears the selection (ruling 1).
    escape: () => {
      if (notes.open) return notes.close();
      if (flow.collapse()) return;
      if (versions.state) return void versions.show(null);
      shell.replyOpen = false;
      flow.dismissArea(); selection.clear();
    },
  }), () => { if (drawing.layout) vp.resized(); });

  // ---- boards --------------------------------------------------------------------------------

  /** Boot, and switching boards (boards.ts). */
  const boards = createBoards({
    live, vp, selection, id: () => S.id, setId: (id) => { const from = S.id; S.id = id; versions.reset(); attention.switched(from); }, redraw, layout: () => drawing.layout, fail,
    keepView: flagOn('keepView', pageFlags()), // the view kept across a reload (FE_02 ruling 5, rule 12)
  });

  exposeWork({
    async rebuild() { await live.load(); redraw(true); },
    async idle() { await sender.idle(); await live.sync(); while (S.frame) await nextFrame(); },
  });

  async function showVersion(seq: number | null) { if (notes.open) notes.close(); moves.menu.close(); await versions.show(seq); }
  return {
    boot: boards.boot,
    switchTo: boards.switchTo,
    showVersion,
    command: (id) => void flow.command(id),
    goToContainer: (id) => zoomToContainer({ vp, layout: () => drawing.layout, frames: () => drawing.frames }, id),
    toggleHide,
    access: accessFlow,
    proposals,
    send: () => attempt({ action: 'send' }), // it greys the notes it sent at once (2e_FE_01 ruling 7)
    saveBoard: createBoardEdit({ sender, state: () => live.state, id: () => S.id, switchTo: boards.switchTo }).save,
    nextFlagged: () => flags.next(),
    destroy: () => [boards.stop, attention.destroy, unbind, notes.destroy, regionNotes.destroy, flow.destroy, moves.menu.destroy, updates.destroy, unchat ?? (() => {})].forEach((f) => f()),
  };
}
