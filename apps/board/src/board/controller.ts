// The board controller: holds the project ledger state (live.ts), works the open board out from it
// (board-data.ts), draws what changed (draw.ts), and routes every person action through the action
// layer and the I/O module. Layout, formats and actions live in packages/; the modules beside this
// one wire them to the canvas: focus.ts (navigation), wiring.ts (input), access-flow.ts (agent
// access), notes.ts (note bubbles), selection.ts (the person's selection), places.ts (pins, modes
// and sizes). It is plain TypeScript (D-005): the Svelte shell mounts it on the stage element and
// reads what it reports through `shell`.
import type { View, ViewNode } from '../../../../packages/format/src/index.ts';
import type { ActionId } from '../../../../packages/format/src/index.ts';
import { flagOn } from '../../../../packages/format/src/index.ts';
import { ACTIONS, counts, DECIDED, ITEM_ACTIONS, replyText, statusOf } from '../../../../packages/actions/src/index.ts';
import type { LedgerEvent } from '../../../../packages/format/src/index.ts';
import { isPressed, offers } from '../../../../packages/ui/src/index.ts';
import type { ActFields, BoardData } from './io.ts';
import { ApiError, listBoards, sendAct } from './io.ts';
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
import { createNoteFlow, unsentNote } from './notes.ts';
import { createSelection } from './selection.ts';
import { exposeWork, work } from './work.ts';
import { pageFlags } from '../flags.ts';
import { shell, toast } from '../shell/shell.svelte.ts';

export type { BoardElements } from './draw.ts';

export interface Board {
  boot(): Promise<void>;
  switchTo(id: string): void;
  fit(): void;
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
    unwatch: null as (() => void) | null,
    /** A draw waiting for the next frame, so lines that land together draw once (approach 5). */
    frame: 0,
    /** The waiting draw starts from scratch (the state was read afresh). */
    fresh: false,
    /** The waiting draw shows lines in which the agent drew on this board. */
    drew: false,
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
  selection.onChange((c) => { drawing.restate(c.changed); shell.selection = c.text; });

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

  /** Work the open board out from the held state and draw what changed, now. */
  function redraw(fresh = false) {
    cancelAnimationFrame(S.frame);
    S.frame = 0;
    const s = live.state;
    if (!s || !s.boards.has(S.id)) return;
    const full = fresh || S.fresh;
    const drew = S.drew && !full;
    S.fresh = S.drew = false;
    S.data = boardData(s, S.id);
    // The selection survives a redraw; ids that left the board drop out of it (ruling 8).
    selection.keep(view().nodes.map((n) => n.id));
    Object.assign(shell, { title: view().title, version: view().version, summary: view().summary ?? '' });
    drawing.draw(full);
    renderCounts();
    notes.place();
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

  /** Send one action; the server validates it, and its problems show in the error toast. The
   * stored line comes back and is applied in place. Null when it was recorded, else the detail. */
  async function attempt(fields: ActFields): Promise<string | null> {
    const on = sendAct(S.id, fields).then((e) => live.own(e));
    sending.add(on);
    try {
      await on;
      redraw();
      return null;
    } catch (err) {
      fail(err);
      return err instanceof ApiError ? err.message : String(err);
    } finally {
      sending.delete(on);
    }
  }
  /** Acts on their way, so the test hook's `idle` waits for them too. */
  const sending = new Set<Promise<void>>();
  const record = async (fields: ActFields) => (await attempt(fields)) === null;

  /** Notes beside cards (2e_FE_01): the bubble, opened by C, M, the pin or a note. */
  const notes = createNoteFlow({
    stage, vp, node: nodeOf, state: () => S.data!.state, layout: () => drawing.layout, card: (id) => drawing.cards.get(id),
    ver: (id) => S.data?.versions[id], attempt, relayout: () => redraw(), toast: (t) => toast(t),
  });
  vp.onApply = () => {
    notes.place();
    drawing.viewMoved();
  };

  const accessFlow = createAccessFlow({ stage, data: () => S.data!, record });

  async function act(id: string, requested: ActionId) {
    const n = nodeOf(id);
    if (!n || n.n === undefined) return;
    // The keyboard can't send what the card doesn't offer.
    if (ITEM_ACTIONS.includes(requested) && !offers(n).includes(requested)) return;
    // Pressing the button that matches the current status undoes it, unless the card has a note
    // not yet sent: C and M then open it to edit (ruling 1).
    const pressed = isPressed(requested, statusOf(S.data!.state, id));
    if ((requested === 'comment' || requested === 'context') && (!pressed || unsentNote(S.data!.state, id)))
      return notes.press(id, requested);
    const action: ActionId = pressed ? 'reopen' : requested;
    const def = ACTIONS[action];
    const next = shell.hide && def.status && DECIDED.has(def.status) ? focus.neighbour(id, 1) : null;
    if (!(await record({ action, ...target(id) }))) return;
    const focusId = next && hiddenSet().has(id) ? next : id;
    drawing.cards.get(focusId)?.focus({ preventScroll: true });
    if (def.reply) toast(`${n.n} ${action === 'reopen' ? 'reopened' : def.reply}`);
  }

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
    ...(access && { revoke: (region: string, holder: string) => void accessFlow.revoke(region, holder) }),
    pin: (id, box) => void places.pin(id, box),
    unpin: (id) => void places.unpin(id),
    layout: () => drawing.layout,
    view,
    drawDrag: (layout, id) => drawing.wiresFor(layout, id),
    step: (from, dir) => {
      const next = focus.neighbour(from, dir);
      if (next) drawing.cards.get(next)?.focus({ preventScroll: true });
    },
    fit: () => { if (drawing.layout) vp.fit(drawing.layout.bounds); },
    toggleHide,
    zoom: (f) => vp.zoomCentre(f),
    pick: (id, add) => selection.select([id], add ? 'toggle' : 'only'),
    toggle: (id) => selection.select([id], 'toggle'),
    clear: () => selection.clear(),
    // Esc closes an open bubble first, else clears the selection (ruling 1).
    escape: () => {
      if (notes.open) return notes.close();
      shell.replyOpen = false;
      selection.clear();
    },
  }, () => { if (drawing.layout) vp.apply(); });

  // ---- boards --------------------------------------------------------------------------------

  /** Draw board `id` from the held state; no fetch, the state holds every board. */
  function openBoard(id: string, fit = true) {
    if (!live.state?.boards.has(id)) {
      shell.message = `There is no board "${id}".`;
      return;
    }
    if (S.id !== id) selection.clear();
    S.id = id;
    redraw(true);
    shell.message = null;
    if (fit && drawing.layout) vp.fit(drawing.layout.bounds, false);
    history.replaceState(null, '', `#${encodeURIComponent(id)}`);
  }

  function watch(id: string) {
    S.unwatch?.();
    S.unwatch = live.watch(id);
  }

  async function boot() {
    try {
      const [boards] = await Promise.all([listBoards(), live.load()]);
      shell.boards = boards;
      if (!boards.length) {
        shell.message = 'No boards yet. Run npm run dev to open the example boards.';
        return;
      }
      const wanted = decodeURIComponent(location.hash.slice(1));
      const id = boards.some((b) => b.id === wanted) ? wanted : boards[0]!.id;
      shell.boardId = id;
      openBoard(id);
      watch(id);
      // The first draw ends once the frame it was drawn for has been shown.
      requestAnimationFrame(() => requestAnimationFrame(() => { work.firstDrawMs = performance.now(); }));
    } catch (err) {
      fail(err);
      shell.message = 'Could not reach the board server. Start it with: npm run board';
    }
  }

  exposeWork({
    async rebuild() {
      await live.load();
      redraw(true);
    },
    async idle() {
      while (sending.size) await Promise.allSettled([...sending]);
      await live.sync();
      while (S.frame) await nextFrame();
    },
  });

  return {
    boot,
    switchTo(id) {
      shell.boardId = id;
      openBoard(id);
      watch(id);
    },
    fit: () => { if (drawing.layout) vp.fit(drawing.layout.bounds); },
    toggleHide,
    answer: (request, a, text) => accessFlow.answer(request, a, text),
    send,
    destroy() {
      S.unwatch?.();
      unbind();
      notes.destroy();
    },
  };
}
