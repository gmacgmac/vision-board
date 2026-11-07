// The board controller: holds the project ledger state (live.ts), works the open board out from it
// (packages/actions board-data.ts), draws what changed (canvas/draw.ts), and routes every person action
// through the action layer and the I/O module. Layout, formats and actions live in packages/; the
// feature folders beside this one wire them to the canvas, each reached through its index.ts:
//   boards/ (boot, picker, kept view, versions, a locked board, New/Rename/Archive/Restore)
//   canvas/ (the draw, viewport, focus, places: pins, modes, widths, sizes)  links/ (connectors, labels)
//   cards/ (cards, images, attention, item acts, flag, proposals, updates, parking, remove, history)
//   notes/ (note bubbles, container notes, group pins)  selection/ (selection, lasso, bar, moves, drags)
//   input/ (commands, keys, pointer, the stage's wiring)  find/ (container finder, Go to card)
//   access/ (agent access)  apps/ (app cards: list_apps state, frames, Allow and Stop app)
// and, beside this file, sender.ts (sending acts), toolbar-counts.ts (the toolbar's numbers) and
// chat-side.ts (the board's side of its host's chat); controller/ holds the pieces split out of it.
// Everything outside the board comes from its host (host.ts): calls, change events, settings,
// notices and confirmations; what a host shows of the board goes out through its status (status.ts).
import type { FlagName, LedgerEvent, View, ViewNode } from '#format';
import { ROW_GAP } from '#layout';
import { acksRead, answeredIds, boardData, boardSearchDocs, emptyState, goTarget, numberOf, placedView, READ_ONLY_PERSON, retiredCounts, sendHead } from '#actions';
import { ApiError } from './io.ts';
import type { ConfirmList } from './host.ts';
import { alignOf, chatStatusOf, flagOf, markdownOf } from './host.ts';
import { bindChat, cardIds, chatSource } from './chat-side.ts';
import { finishAll, hearUntilStopped } from './teardown.ts';
import { createBoardEdit, createBoards, createLockFlow, createVersions } from './boards/index.ts';
import { numberedView } from './board-data.ts';
import { createAttention, createFlagFlow, createHistoryFlow, createItemActs, createParking, createProposalFlow, createRemoveFlow, createUpdateFlow } from './cards/index.ts';
import { type BoardElements, createDrawing, createFocus, createPlaces, Viewport, zoomPercent } from './canvas/index.ts';
import { createLive } from './live.ts';
import { bindStage } from './input/index.ts';
import { createAccessFlow } from './access/index.ts';
import { createNoteFlow, createNoteHide, createRegionNotes, DISCARD_ASK } from './notes/index.ts';
import { createContainerDrag, createMoves, createSelection, createSelectionFlow } from './selection/index.ts';
import { createSender, READ_ONLY } from './sender.ts';
import { createGoTo, focusContainer, GO_PAUSE, zoomToContainer } from './find/index.ts';
import { showCounts } from './toolbar-counts.ts';
import { createAppCards } from './apps/index.ts';
import type { Board, BoardDeps } from './controller/board-types.ts';
import { createBoardState } from './controller/board-state.ts';
import { stageHandlers } from './controller/stage-handlers.ts';
import * as boardWords from './words/board.ts';

export type { BoardElements } from './canvas/index.ts';
export type { Board, BoardDeps } from './controller/board-types.ts';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** The board: every module it wires, one statement each, reading the state they share (`S`, `drawing`,
 * `versions`). The input table (controller/stage-handlers.ts) and the held state (controller/board-state.ts)
 * are out already.
 * verify: long-function the composition root: each statement hands one module its dependencies as closures over this scope, and a split would pass that scope around, not shorten it */
export function createBoard(els: BoardElements, b: BoardDeps): Board {
  const { stage, world } = els;
  const { host, io, status } = b;
  const on = (f: FlagName) => flagOf(host, f);
  const chatStatus = chatStatusOf(host); // no `agent` under singleAgent
  /** How this board's Markdown renders, on every surface that draws it. */
  const markdown = markdownOf(host);
  const vp = new Viewport(stage, world, on('hideControlsZoomedOut')); // N13, rule 12
  // Behind flags (rule 12): card size tiers and their control (nodeSize, D-030); grant requests, holders and Send (agentAccess, D-027);
  // connectors behind frames and cards (wireLayers, D-032); the agent's proposals (proposals, FE_01); changed cards and seen (cardUpdates,
  // FE_02); NEW (newCards); link labels, the viewer's alignment and the widths switch (linkLabels, alignSetting, widthsControl, batch 3).
  const [sizing, access, layers, finder, proposing, updating, newCards, everyNode, flagging, retiring, labels, aligning, widthsControl, removing, going, apping] = [on('nodeSize'), on('agentAccess'),
    on('wireLayers'), on('containerFinder'), on('proposals'), on('cardUpdates'), on('newCards'), on('everyNode'), on('cardFlag'), on('retiredMarker'), on('linkLabels'), on('alignSetting'), on('widthsControl'), on('personRemove'), on('goToCard'), on('appCards')];
  const versionView = on('versionView');
  const oneTab = on('oneChangeTab'); // one tab for updates and a proposal (point 444)
  status.set({ agentAccess: access, versionView });
  world.toggleAttribute('data-wire-layers', layers);
  for (const [attr, flag] of [['data-title-tip', 'titleTip'], ['data-note-preview', 'notePreview'], ['data-app-title', 'appTitle'], ['data-fresh-cards', 'freshCards'], ['data-update-signals', 'updateSignals'], ['data-big-titles', 'bigTitles']] as const) world.toggleAttribute(attr, on(flag)); // hover tips (FE_03, FE_04), an app card's title (card-polish FE_01), the updates tab (freshCards), updated in amber (updateSignals), a structured card's big title (bigTitles); rule 12
  const toast = (text: string, tone?: 'info' | 'error') => host.notify(text, tone);
  /** The modules' confirm, as the host asks it. */
  const ask = (heading: string, body: string, confirm: string, list?: ConfirmList) => host.confirm({ heading, body, confirm, ...(list && { list }) });

  const S = createBoardState();

  const view = (): View => S.data!.view;
  const nodeOf = (id: string): ViewNode | undefined => view().nodes.find((n) => n.id === id);
  /** A node act names the node by number and the version the person was looking at. */
  const target = (id: string) => ({ n: Number(id), ver: S.data!.versions[id] });

  const hiddenSet = (): Set<string> => (status.now.hide && S.data ? answeredIds(S.data, attention.owedCards()) : new Set()); // kept while owed (FE_01)

  const live = createLive({ readLedger: io.readLedger, events: (l) => host.events(l) }, onLines);
  /** Nothing may change the board: a past version shows, or the ledger is open read-only (D-085 3, its reads say so). */
  const readOnly = () => !!versions.state || live.readOnly;
  // Read-only, the board seen and card seen marks stay in the page (`quiet`): nothing is written.
  const attention = createAttention({ state: () => live.state, board: () => S.id, fail, readOnly: () => !!versions.state, quiet: () => live.readOnly, fresh: on('freshCards'), status, markBoardSeen: io.markBoardSeen, chat: on('sendCountsWhatWent') ? chatStatus : undefined });
  /** The version dropdown and a past version, read-only (navigation FE_01), behind the versionView flag. */
  const versions = createVersions({
    world, on: versionView, live: () => live.state, board: () => S.id, fail, status, readLedger: io.readLedger,
    redraw: () => { redraw(true); if (!versions.state) attention.batch([], true); },
  });
  const lock = createLockFlow({ world, state: () => live.state, board: () => S.id, say: (why) => fail(new ApiError(why)), status, readOnly: () => live.readOnly }); // a locked board (N40), a read-only ledger (D-085)
  /** The person's selection (3_FE_01): view state; a change updates only the cards it names. */
  const selection = createSelection();
  const drawing = createDrawing({
    els, vp, ids: b.ids, markdown, sizing, access, layers, labels, widthsControl, removing, align: () => (aligning ? alignOf(host) : 'start'), rowGap: on('updateSignals') ? ROW_GAP : undefined, data: () => S.data!, hidden: hiddenSet, focus: () => focus.id, selected: (id) => selection.has(id),
    insets: () => regionNotes.insets(), owed: () => attention.owed(), replies: () => parking.containers(), flag: flagging, history: on('cardHistory'), retired: () => S.retired, rail: on('toolRail'), railHover: on('railOnHover'), layoutTooltip: on('layoutTooltip'), fresh: () => attention.freshIn(),
    facts: (n) => ({ ...proposals.card(n), ...updates.card(n), ...parking.card(n), ...apps.card(n), ...(oneTab && { oneTab }) }), appCards: apping, placed: () => apps.place(),
  });
  const focus = createFocus({ cards: els.cards, vp, view, layout: () => drawing.layout, changed: () => drawing.refocus() });
  selection.onChange((c) => { drawing.restate(c.changed); status.set({ selection: c.text }); flow.dismissArea(); flow.place(); });

  // ---- messages and drawing ------------------------------------------------------------------
  function fail(err: unknown) {
    const e = err instanceof ApiError ? err : new ApiError(String(err));
    toast([e.message, ...e.problems].join(' · '), 'error');
  }

  /** Lines were applied to the held state: draw them in the next frame. */
  function onLines(lines: LedgerEvent[], full: boolean) {
    if (S.stopped) return; // a read that was on its way when the board stopped
    S.fresh ||= full;
    S.drew ||= attention.batch(lines, full);
    // A past version stays as it is; only the dropdown's "now" moves (versions.ts).
    if (!S.frame && !versions.state) S.frame = requestAnimationFrame(() => { S.frame = 0; redraw(); });
    boards.listed(); versions.listed(); lock.apply(); apps.lines(lines, full, live.state); history.refresh();
    if (status.now.readOnly !== live.readOnly) status.set({ readOnly: live.readOnly });
  }

  /** Work the open board out from the held state and draw what changed, now; while a batch of acts
   *  is on its way (sender.ts) the draw waits for its end. */
  function redraw(fresh = false) {
    cancelAnimationFrame(S.frame); S.frame = 0;
    S.fresh ||= fresh;
    const s = versions.state ?? live.state;
    if (!s || !s.boards.has(S.id) || sender.held) return;
    const full = S.fresh;
    const drew = S.drew && !full;
    S.fresh = S.drew = false;
    const d = boardData(s, S.id);
    if (!flagging) d.state.flags.clear(); // the person's flags show only with the flag on
    if (live.readOnly && !versions.state) d.state.readOnly = true; // the reads' word, for the elements (D-085)
    S.retired = retiring ? retiredCounts(s, S.id, versionView) : new Map();
    S.drawn = d.view;
    // Each card in the container the person put it in, Later last (3_FE_03 rulings 2 and 5).
    S.data = { ...d, view: numberedView(placedView(d.view, d.state, { later: S.later }), everyNode) }; // numbers on every card (everyNode)
    // The selection survives a redraw; ids that left the board drop out of it (ruling 8).
    selection.keep(view().nodes.map((n) => n.id));
    proposals.refresh(); updates.refresh(); parking.refresh();
    status.set({ title: view().title, summary: view().summary ?? '', ...(!versionView && { version: view().version }) });
    const held = stage.contains(document.activeElement);
    drawing.draw(full);
    // A card that held the focus went (hidden, removed): it stays in the stage, so the next key still reaches the board.
    const at = document.activeElement;
    if (held && (!at || at === document.body || !at.checkVisibility())) stage.focus({ preventScroll: true });
    regionNotes.apply(drawing.frames);
    renderCounts();
    notes.place();
    flow.place();
    go.refresh(); // a search showing marks the cards as drawn now (SEARCH_02)
    status.set({ drawn: status.now.drawn + 1 }); // a host's chat refreshes what it attaches
    if (drew) toast(boardWords.theAgentDrewV(status.now.version));
  }

  const renderCounts = () => showCounts(status, S.data!, view(), drawing.layout, { finder, access }, flags.ids().length);

  // ---- actions -------------------------------------------------------------------------------
  /** Every act goes through here: the server validates it, its problems show in the error toast,
   * and the stored line comes back and is applied in place (sender.ts). */
  const sender = createSender({ io, board: () => S.id, own: (line, board) => live.own(line, board), redraw: () => redraw(), fail,
    refusal: (board, line) => (versions.state ? READ_ONLY : live.readOnly ? READ_ONLY_PERSON : lock.refuse(board, line)) });
  const { attempt, record } = sender;
  const apps = createAppCards({ on: apping, fit: on('appFit'), stage, vp, board: () => S.id, selection, cards: () => drawing.cards, layout: () => drawing.layout, past: () => !!versions.state, act: attempt, confirm: ask, toast, fail, redraw: () => redraw(), io }); // app-cards.ts
  const removal = removing ? createRemoveFlow({ stage, state: () => live.state, board: () => S.id, title: (id) => view().regions.find((r) => r.id === id)?.title ?? id,
    retire: async (fields) => (await notes.leaveIf({ card: (id) => !!fields.cards?.includes(Number(id)) || (!!fields.region && nodeOf(id)?.region === fields.region), region: (r) => r === fields.region })) ? sender.retire(fields) : '',
    confirm: ask, toast: (t) => toast(t) }) : undefined; // Remove card, Remove container (N24); a note being written on what goes asks too (point 309)
  const proposals = createProposalFlow({
    on: proposing, list: on('reviewList'), stage, state: () => live.state, found: () => attention.proposals(), readOnly: () => !!versions.state, // read-only: shown, Accept and Reject refused by the sender
    vp, box: (id) => drawing.layout?.nodes.get(id), title: (n) => view().nodes.find((x) => x.n === n)?.title, go: (n) => go.to(n), // Review goes as Go to card does (`go`, below)
    ver: (n) => S.data?.versions[String(n)], card: (id) => drawing.cards.get(id), record, run: (steps) => sender.run(steps), toast, status, confirm: (a) => host.confirm(a),
  });
  const updates = createUpdateFlow({ on: updating, stage, selection, state: () => live.state, board: () => S.id, unseen: () => attention.unseen(), newCards, fresh: () => attention.fresh(),
    readOnly: () => !!versions.state, quiet: () => live.readOnly, card: (id) => drawing.cards.get(id), seen: (marks) => sender.seen(marks), redraw: () => redraw(), source: (n) => chatSource(host.chat, S.id, n) });
  /** "Awaiting", the handover and the agent's replies under notes (parking.ts), from the state the board is drawn from. */
  const parking = createParking({ handover: on('handover'), replies: on('cardReplies'), state: () => versions.state ?? live.state, board: () => S.id,
    awaiting: () => attention.awaiting(), readOnly: () => !!versions.state, apart: on('groupNoteOnce') });
  /** Notes beside cards (2e_FE_01): the bubble, opened by C, M, the pin or a note; a group's pin (groupNoteOnce flag, group-pins.ts). */
  const notes = createNoteFlow({
    stage, world, selection, groups: on('groupNoteOnce'), vp, node: nodeOf, state: () => S.data!.state, layout: () => drawing.layout, card: (id) => drawing.cards.get(id),
    region: (id) => view().regions.find((r) => r.id === id), frame: (id) => drawing.frames.get(id), regionReplies: () => parking.containers(),
    replies: (id) => { const n = nodeOf(id); return (n && parking.card(n).replies) ?? []; }, ver: (id) => S.data?.versions[id], attempt, relayout: () => redraw(), toast: (t) => toast(t), changed: () => flow.place(),
    markdown, discard: () => ask(...DISCARD_ASK), paused: lock.paused, unsaved: (on) => status.set({ unsaved: on }), // a host's leave guard (M11)
  });
  /** A container's note preview and block: Edit, Remove, Show in container (region-notes.ts). */
  const regionNotes = createRegionNotes({
    stage, board: () => S.id, title: (id) => view().regions.find((r) => r.id === id)?.title ?? id, edit: notes.showContainer,
    attempt, relayout: () => redraw(), toast });
  /** Moving cards between containers, Later and the Move to list (3_FE_03, moves.ts). */
  const moves = createMoves({
    stage, vp, selection, layout: () => drawing.layout, view, drawn: () => S.drawn!, state: () => S.data!.state,
    frame: (region) => drawing.frames.get(region), target, run: (steps) => sender.run(steps),
    showLater: (on) => { S.later = on; }, redraw: () => redraw(), toast: (t) => toast(t),
  });
  /** Go to a card by its number (go-to-card.ts), the one path every finder takes: select and focus it, a pan only by `revealPan`'s rule (`vp.reveal`), the zoom kept.
   *  A find marks nothing seen (findKeepsMarks flag, ruling 322): the selection says `find`, update-flow.ts `saw` reads it. */
  const go = createGoTo({ show: (box) => status.set({ go: box }), past: showVersion, ...(on('goAfterPause') && { pause: GO_PAUSE }), find: (n) => goTarget(versions.state ?? live.state, S.id, n, (id) => !!drawing.layout?.nodes.has(id), versionView),
    arrive: (id) => { selection.select([id], 'only', on('findKeepsMarks') ? 'find' : 'select'); drawing.cards.get(id)?.focus({ preventScroll: true }); const b = drawing.layout?.nodes.get(id); if (b) vp.reveal(b); },
    // Words too (cardSearch flag, SEARCH_02): the cards drawn, indexed once per draw (`S.data`), marked on the world. The box
    // is drawn inside `mount` (chrome/GoToCard.svelte).
    ...(on('cardSearch') && { search: { key: () => S.data, world, card: (id: string) => drawing.cards.get(id), reveal: (id: string) => { const b = drawing.layout?.nodes.get(id); if (b) vp.reveal(b); },
      docs: () => (S.data ? boardSearchDocs((versions.state ?? live.state)!, S.id, view()).filter((doc) => drawing.layout?.nodes.has(doc.id)) : []) } }) });
  /** The lasso, the selection bar and the view commands (3_FE_02, selection-flow.ts). */
  const flow = createSelectionFlow({
    stage, vp, selection, notes, layout: () => drawing.layout, pill: on('selectionPill'), focusLeads: on('focusLeads'), // the pill (stage5-follow-ups FE_02)
    item: (id) => nodeOf(id)?.n, commentOn: (id) => void act(id, 'comment'), openMove: moves.openMenu, pinned: (id) => !!S.data?.state.pins.has(id), resetPlaces: (ids) => void places.resetCards(ids), readOnly: () => !!versions.state, paused: lock.paused,
    ...(removal && { remove: removal.cards }), ...(going && { goTo: go.open }) });
  vp.onApply = () => { status.set({ zoom: zoomPercent(vp.k) }); notes.place(); flow.place(); drawing.viewMoved(); boards.moved(); };
  status.set({ zoom: zoomPercent(vp.k) });

  const accessFlow = createAccessFlow({ stage, data: () => S.data!, record, status, confirm: (a) => host.confirm(a), notify: (t) => toast(t) });
  /** The person's flag: the button, Shift+F and the toolbar's chip (flag-flow.ts). */
  const flags = createFlagFlow({ on: flagging, view: () => S.data?.view ?? null, state: () => S.data?.state ?? null, record, focused: () => focus.id,
    drawn: (id) => !!drawing.layout?.nodes.has(id), focusCard: (id) => drawing.cards.get(id)?.focus({ preventScroll: true }), toast: (t) => toast(t) });
  /** Hide and show a card's notes, and the note highlight the history box calls (note-hide.ts, card-polish FE_02). */
  const noteHide = createNoteHide({ stage, vp, state: () => S.data?.state ?? null, card: (id) => drawing.cards.get(id), layout: () => drawing.layout, record });
  const history = createHistoryFlow({ stage, state: () => versions.state ?? live.state, board: () => S.id, highlight: (id, part) => noteHide.highlight(id, part) }); // the ⓘ's box (history-flow.ts, card-polish FE_03)
  /** The board's side of its host's chat (chat-side.ts): the selection and the answers as chips, its status, the stepper's link. */
  const unchat = bindChat({ chat: host.chat, chatStatus, stage, selection, status, data: () => S.data, ledger: () => live.state, id: () => S.id, readOnly });

  /** The review buttons and their keys on one card (item-acts.ts). */
  const act = createItemActs({ node: nodeOf, state: () => S.data!.state, notes, moves, record, target, hiding: () => status.now.hide, hidden: hiddenSet,
    neighbour: (id, dir) => focus.neighbour(id, dir), focusCard: (id) => drawing.cards.get(id)?.focus({ preventScroll: true }), toast: (t) => toast(t),
    ...(on('focusLeads') && { focusLeft: (id: string) => { const at = document.activeElement; return !!at && at !== document.body && !drawing.cards.get(id)?.contains(at); } }) });

  /** Pins, Reset places, the layout mode and the size tier (places.ts). */
  const places = createPlaces({ vp, view, state: () => S.data!.state, layout: () => drawing.layout, target, record, redraw: () => redraw(),
    settle: () => drawing.settle(), run: (steps) => sender.run(steps) });
  /** Moving a whole container by its grip or Alt+arrows (3_FE_04, container-drag.ts). */
  const frames = createContainerDrag({ layout: () => drawing.layout, view, frame: (r) => drawing.frames.get(r), card: (id) => drawing.cards.get(id),
    drawDrag: (l) => drawing.wiresFor(l, focus.id), settle: () => drawing.settle(), record, redraw: () => redraw() });

  /** Hide answered (H, the toolbar): a note being written on a card it would hide asks first (point 309). */
  async function toggleHide() {
    const hiding = !status.now.hide && S.data ? answeredIds(S.data, attention.owedCards()) : null;
    if (hiding && !(await notes.leaveIf({ card: (id) => hiding.has(id) }))) return;
    status.set({ hide: !status.now.hide }); if (S.data) redraw();
  }

  // ---- wiring --------------------------------------------------------------------------------
  // While a past version shows, or the board is locked, the handlers that act do nothing (versions.ts, lock-flow.ts `guard`).
  /** What the container finder and Z on a container zoom with (find/finder.ts). */
  const finding = { vp, layout: () => drawing.layout, frames: () => drawing.frames };
  const handlers = stageHandlers({ act, flags: flagging ? flags : null, access: access ? accessFlow : null, removal, proposals, updates, notes, places, frames, moves, flow,
    versions, selection, drawing, focus, view, showVersion, toggleHide, status,
    ...(on('containerZoom') && { container: { zoom: (id: string) => zoomToContainer(finding, id), mark: (id: string) => focusContainer(finding, id) } }) });
  const unbind = bindStage(stage, vp, versions.guard(lock.guard(handlers)), () => { if (drawing.layout) vp.resized(); },
    { pageWide: !!host.page, wheelChaining: on('wheelChaining') });

  // ---- boards --------------------------------------------------------------------------------
  /** Boot, and switching boards (boards.ts). */
  const boards = createBoards({
    live, vp, selection, id: () => S.id, setId: (id) => { const from = S.id; S.id = id; versions.reset(); lock.apply(); attention.switched(from); }, redraw, layout: () => drawing.layout, fail,
    keepView: on('keepView'), store: b.store, archiving: on('archiveBoard'), // the view kept across a reload (FE_02 ruling 5); the Archived list (N39)
    status, say: b.say, page: b.page,
  });
  // The viewer's alignment changed (the standalone page's "⋯" menu, alignSetting flag): lay out again.
  let align = alignOf(host);
  const unsettle = hearUntilStopped((heard) => host.settings.on(heard), () => { if (alignOf(host) !== align) { align = alignOf(host); if (S.data) redraw(); } });

  /** Archive board takes the open board away: a note being written on it asks first (point 309); Cancel archives nothing. */
  async function archiving(id: string, fields: Parameters<typeof sender.actOn>[1]) {
    if (fields.action === 'archive' && id === S.id && !(await notes.leaveIf({ card: () => true, region: () => true }))) return null;
    return sender.actOn(id, fields);
  }
  /** Another board (the picker, a chat's link, a new or restored board): a note's unsaved words ask
   *  first, by the one path (`notes.leave`, `mayLeave`), and Cancel keeps this board (M11_01-R3).
   *  With nothing unsaved it switches at once. True once switched. */
  async function switchTo(id: string, go = () => boards.switchTo(id)): Promise<boolean> {
    if (id !== S.id && notes.unsaved && !(await notes.leave())) return false;
    go();
    return true;
  }
  /** A past version, or now: a note being written asks first and Cancel keeps what shows (point 309). */
  async function showVersion(seq: number | null, until?: number) {
    if (!(await notes.leave())) return;
    if (notes.open) notes.close();
    moves.menu.close(); await versions.show(seq, until);
  }
  return {
    boot: boards.boot, switchTo: (id) => switchTo(id), showVersion, command: (id) => void flow.command(id),
    goToContainer: (id) => zoomToContainer(finding, id),
    revealCard(n) {
      const why = go.why(n);
      if (why) toast(why); else go.to(n);
    },
    revealNote(seq) {
      const s = live.state;
      const ask = s?.asks.get(seq);
      if (!s || !ask) return toast(boardWords.thatNoteIsNoLonger);
      if (ask.region !== undefined) return; // a container's note: its board is enough
      const n = numberOf(s, ask.nodes?.[0] ?? ask.id);
      const why = go.why(n);
      if (why) return toast(why);
      go.to(n);
      notes.show(String(n), seq);
    },
    toggleHide, id: () => S.id, ledger: () => live.state,
    zoomToCards(cards) {
      if (!S.data) return;
      const ids = cardIds(S.data, cards);
      const drawn = ids.filter((id) => drawing.layout?.nodes.has(id));
      if (drawn.length) flow.zoomTo(drawn);
      else toast(ids.length ? boardWords.cardsAreHidden(ids.length) : boardWords.thoseCardsAreNoLonger);
    },
    jump: (id) => switchTo(id, () => boards.jump(id)),
    async rebuild() { await live.load(); redraw(true); }, async idle() { await sender.idle(); await live.sync(); while (S.frame) await nextFrame(); },
    access: accessFlow, proposals, go,
    send(id, acks) { // it greys the notes it sent at once (2e_FE_01 ruling 7); only what went counts (point 377)
      const fields = { action: 'send' as const, ...(on('sendCountsWhatWent') && sendHead(live.state ?? emptyState(), id, acksRead(acks, id))) };
      return id === S.id ? attempt(fields) : sender.actOn(id, fields);
    },
    boardEdit: createBoardEdit({ sender: { board: sender.board, actOn: archiving }, state: () => live.state, id: () => S.id, switchTo: (id) => void switchTo(id), confirm: ask, toast: (t) => toast(t) }),
    nextFlagged: () => flags.next(),
    unsaved: () => notes.unsaved, leave: () => notes.leave(),
    destroy: () => { S.stopped = true; cancelAnimationFrame(S.frame); finishAll([unchat, boards.stop, attention.destroy, unbind, notes.destroy, regionNotes.destroy, flow.destroy, moves.menu.destroy, updates.destroy, apps.destroy, drawing.destroy, unsettle]); },
  };
}
