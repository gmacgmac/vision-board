// The board controller: loads a board, lays it out, and routes every person action through
// the action layer and the I/O module. Layout, formats and actions live in packages/; this file
// wires them to the canvas. It is plain TypeScript (D-005): the Svelte shell mounts it on the
// stage element and reads what it reports through `shell`.
import type { ActSize, Mode, View, ViewNode } from '../../../../packages/format/src/index.ts';
import type { ActionId } from '../../../../packages/format/src/index.ts';
import { flagOn, NODE_TYPES } from '../../../../packages/format/src/index.ts';
import type { BoardLayout, Box, Size } from '../../../../packages/layout/src/index.ts';
import { layoutBoard, routeLinks } from '../../../../packages/layout/src/index.ts';
import type { BoardState } from '../../../../packages/actions/src/index.ts';
import { ACTIONS, counts, DECIDED, ITEM_ACTIONS, replyText, statusOf } from '../../../../packages/actions/src/index.ts';
import type { VbNodeElement, VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { isPressed, offers } from '../../../../packages/ui/src/index.ts';
import type { ActFields, BoardData } from './io.ts';
import { ApiError, listBoards, loadBoard, sendAct, watchBoard } from './io.ts';
import {
  buildCards, buildRegions, drawWires, measure, placeCards, placeRegions, readingOrder, updateCard,
} from './render.ts';
import { Viewport } from './viewport.ts';
import { bindPointer } from './pointer.ts';
import { bindKeys } from './keys.ts';
import { bindSizeControl, isSizePick, sizeAct, tierOf } from './size.ts';
import { answerAct, answerWords, holdersOf, requestRows, revokeAct, revokeWords } from './access.ts';
import { pageFlags } from '../flags.ts';
import { askConfirm, askNote, shell, toast } from '../shell/shell.svelte.ts';

export interface BoardElements {
  stage: HTMLElement;
  world: HTMLElement;
  regions: HTMLElement;
  cards: HTMLElement;
  wires: SVGSVGElement;
}

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

export function createBoard(els: BoardElements): Board {
  const { stage, world, wires } = els;
  const vp = new Viewport(stage, world);
  /** Card size tiers and their control (D-030), behind the nodeSize flag (rule 12). */
  const sizing = flagOn('nodeSize', pageFlags());
  /** Grant requests, holders and Send (D-027), behind the agentAccess flag (rule 12). */
  const access = flagOn('agentAccess', pageFlags());
  shell.agentAccess = access;

  const S = {
    id: '',
    data: null as BoardData | null,
    state: { items: new Map(), pins: new Map(), modes: new Map(), sizes: new Map() } as BoardState,
    cards: new Map<string, VbNodeElement>(),
    regions: new Map<string, VbRegionElement>(),
    layout: null as BoardLayout | null,
    sizes: new Map<string, Size>(),
    focus: null as string | null,
    unwatch: null as (() => void) | null,
    settle: 0,
  };

  const view = (): View => S.data!.view;
  const nodeOf = (id: string): ViewNode | undefined => view().nodes.find((n) => n.id === id);
  /** A node act names the node by number and the version the person was looking at. */
  const target = (id: string) => ({ n: Number(id), ver: S.data!.versions[id] });
  /** The agent's drawing without the ledger position, which every person act also advances. */
  const drawing = (v: View) => JSON.stringify({ ...v, version: 0 });

  // ---- messages ------------------------------------------------------------------------------

  function showMessage(text: string | null) {
    shell.message = text;
  }

  function fail(err: unknown) {
    const e = err instanceof ApiError ? err : new ApiError(String(err));
    toast([e.message, ...e.problems].join(' · '), 'error');
  }

  // ---- drawing -------------------------------------------------------------------------------

  function hiddenSet(): Set<string> {
    if (!shell.hide) return new Set();
    return new Set(view().nodes.filter((n) => DECIDED.has(statusOf(S.state, n.id))).map((n) => n.id));
  }

  function build() {
    world.classList.add('no-anim');
    S.cards = buildCards(els.cards, view(), { sizeControl: sizing });
    S.regions = buildRegions(els.regions, view());
    shell.title = view().title;
    shell.version = view().version;
    shell.summary = view().summary ?? '';
    relayout();
    requestAnimationFrame(() => requestAnimationFrame(() => world.classList.remove('no-anim')));
  }

  function relayout() {
    for (const n of view().nodes) updateCard(S.cards.get(n.id)!, n, S.state, sizing ? tierOf(n, S.state) : undefined);
    S.sizes = measure(S.cards);
    S.layout = layoutBoard(view(), S.sizes, {
      pins: S.state.pins, modes: S.state.modes, hidden: hiddenSet(),
    });
    placeRegions(S.regions, S.layout, view(), S.state, access ? holdersOf(S.data!) : undefined);
    placeCards(S.cards, S.layout);
    wires.classList.add('settling');
    drawWires(wires, S.layout, S.focus);
    clearTimeout(S.settle);
    S.settle = window.setTimeout(() => wires.classList.remove('settling'), 380);
    renderCounts();
  }

  function renderCounts() {
    const c = counts(view(), S.state);
    shell.counts = { open: c.open, decided: c.decided, later: c.later };
    shell.replyText = replyText(view(), S.state);
    shell.answered = view().nodes.filter((n) => n.n !== undefined && S.state.items.has(n.id)).length;
    shell.requests = access ? requestRows(S.data!) : [];
  }

  // ---- actions -------------------------------------------------------------------------------

  /** Take a fresh load of board `id`. Rebuilds the cards only when the agent's drawing changed
   * (or another board is opening) and returns true then; otherwise the caller relayouts. */
  function take(id: string, data: BoardData): boolean {
    const update = S.id === id && S.data !== null;
    const redraw = !update || drawing(S.data!.view) !== drawing(data.view);
    S.id = id;
    S.data = data;
    S.state = data.state;
    shell.version = data.view.version;
    if (!redraw) return false;
    build();
    if (update) toast(`The agent drew v${data.view.version}`);
    return true;
  }

  /** Send one action; the server validates it, and its problems show in the error toast. */
  async function record(fields: ActFields): Promise<boolean> {
    try {
      await sendAct(S.id, fields);
      take(S.id, await loadBoard(S.id));
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  }

  async function act(id: string, requested: ActionId) {
    const n = nodeOf(id);
    if (!n || n.n === undefined) return;
    // The keyboard can't send what the card doesn't offer.
    if (ITEM_ACTIONS.includes(requested) && !offers(n).includes(requested)) return;
    // Pressing the button that matches the current status undoes it.
    const action: ActionId = isPressed(requested, statusOf(S.state, id)) ? 'reopen' : requested;
    const def = ACTIONS[action];
    let text: string | undefined;
    if (def.text) {
      const got = await askNote(
        action === 'context' ? 'Ask for more context' : 'Comment',
        `${n.n}. ${NODE_TYPES[n.kind].label}: ${n.title}`,
        def.text === 'required',
        action === 'context' ? 'Optional: what is unclear? e.g. "explain in plain terms"' : 'Your note for the agent',
      );
      if (got === null) return;
      text = got || undefined;
    }
    const next = shell.hide && def.status && DECIDED.has(def.status) ? neighbour(id, 1) : null;
    if (!(await record({ action, ...target(id), text }))) return;
    relayout();
    const focusId = next && hiddenSet().has(id) ? next : id;
    S.cards.get(focusId)?.focus({ preventScroll: true });
    if (def.reply) toast(`${n.n} ${action === 'reopen' ? 'reopened' : def.reply}`);
  }

  function regionOf(id: string) {
    const n = nodeOf(id);
    return S.layout?.regions.find((r) => r.id === n?.region);
  }

  async function pin(id: string, box: Box) {
    const r = regionOf(id);
    if (!r) return;
    const x = Math.round(box.x - r.origin.x);
    const y = Math.round(box.y - r.origin.y);
    await record({ action: 'pin', ...target(id), x, y });
    relayout(); // on failure this snaps the card back to its computed place
  }

  async function unpin(id: string) {
    if (!S.state.pins.has(id)) return;
    if (await record({ action: 'unpin', ...target(id) })) relayout();
  }

  async function setSize(id: string, size: ActSize) {
    if (await record(sizeAct(id, size))) relayout();
  }

  async function setMode(region: string, mode: Mode) {
    if (await record({ action: 'mode', region, mode })) {
      relayout();
      const r = S.layout?.regions.find((x) => x.id === region);
      if (r) vp.reveal(r.box);
    }
  }

  // ---- agent access (agentAccess flag) ---------------------------------------------------------

  async function answer(request: number, a: 'grant' | 'deny', text?: string): Promise<boolean> {
    const row = shell.requests.find((r) => r.seq === request);
    if (!(await record(answerAct(request, a, text)))) return false;
    relayout();
    toast(answerWords(row, a));
    return true;
  }

  async function revoke(region: string, holder: string) {
    const words = revokeWords(S.data!, region, holder);
    if (!(await askConfirm(words.heading, words.body, words.confirm))) return;
    if (!(await record(revokeAct(region, holder)))) return;
    relayout();
    toast(words.done);
    // The holder's button is gone; keep keyboard focus on the board.
    if (!document.activeElement || document.activeElement === document.body) stage.focus({ preventScroll: true });
  }

  async function send(): Promise<string | null> {
    try {
      await sendAct(S.id, { action: 'send' });
      return null;
    } catch (err) {
      fail(err);
      return err instanceof ApiError ? err.message : String(err);
    }
  }

  async function resetRegion(region: string) {
    const ids = view().nodes.filter((n) => n.region === region && S.state.pins.has(n.id)).map((n) => n.id);
    for (const id of ids) if (!(await record({ action: 'unpin', ...target(id) }))) break;
    relayout();
  }

  // ---- navigation and focus ------------------------------------------------------------------

  function visibleOrder(): string[] {
    return readingOrder(view()).map((n) => n.id).filter((id) => S.layout?.nodes.has(id));
  }

  function neighbour(id: string | null, dir: 1 | -1): string | null {
    const ids = visibleOrder();
    if (!ids.length) return null;
    const i = id ? ids.indexOf(id) : -1;
    return ids[(i + dir + ids.length) % ids.length] ?? null;
  }

  function setFocus(id: string | null) {
    if (S.focus === id) return;
    S.focus = id;
    if (S.layout) drawWires(wires, S.layout, S.focus);
    if (id) {
      const b = S.layout?.nodes.get(id);
      if (b) vp.reveal(b);
    }
  }

  els.cards.addEventListener('focusin', (e) => {
    setFocus((e.target as HTMLElement).closest<HTMLElement>('vb-node')?.dataset.id ?? null);
  });
  els.cards.addEventListener('focusout', (e) => {
    const to = (e as FocusEvent).relatedTarget as HTMLElement | null;
    if (!to?.closest('vb-node')) setFocus(null);
  });

  // ---- wiring --------------------------------------------------------------------------------

  stage.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const actBtn = t.closest<HTMLButtonElement>('button[data-act]');
    if (actBtn) {
      const id = actBtn.closest<HTMLElement>('vb-node')!.dataset.id!;
      void act(id, actBtn.dataset.act as ActionId);
      return;
    }
    const sizeBtn = t.closest<HTMLButtonElement>('button[data-size-pick]');
    const pick = sizeBtn?.dataset.sizePick;
    if (sizeBtn && isSizePick(pick)) return void setSize(sizeBtn.closest<HTMLElement>('vb-node')!.dataset.id!, pick);
    const modeBtn = t.closest<HTMLButtonElement>('button[data-mode]');
    if (modeBtn) return void setMode(modeBtn.dataset.region!, modeBtn.dataset.mode as Mode);
    const reset = t.closest<HTMLButtonElement>('button[data-reset]');
    if (reset) return void resetRegion(reset.dataset.reset!);
    const holder = t.closest<HTMLButtonElement>('button[data-revoke]');
    if (holder && access) return void revoke(holder.closest<HTMLElement>('vb-region')!.dataset.region!, holder.dataset.revoke!);
  });

  bindPointer(stage, vp, {
    box: (id) => S.layout?.nodes.get(id),
    dragMove: (id, box) => {
      // Live connectors while dragging: re-route with the moved box, no full relayout.
      if (!S.layout) return;
      const nodes = new Map(S.layout.nodes).set(id, box);
      drawWires(wires, { ...S.layout, nodes, routes: routeLinks(view().links, nodes) }, id);
    },
    dragEnd: (id, box) => void pin(id, box),
  });

  const unbindKeys = bindKeys({
    act: (id, a) => void act(id, a),
    nudge: (id, dx, dy) => {
      const b = S.layout?.nodes.get(id);
      if (b) void pin(id, { ...b, x: b.x + dx, y: b.y + dy });
    },
    unpin: (id) => void unpin(id),
    step: (from, dir) => {
      const next = neighbour(from, dir);
      if (next) S.cards.get(next)?.focus({ preventScroll: true });
    },
    fit: () => S.layout && vp.fit(S.layout.bounds),
    toggleHide,
    zoom: (f) => vp.zoomCentre(f),
    escape: () => { shell.replyOpen = false; },
  });

  function toggleHide() {
    shell.hide = !shell.hide;
    if (S.data) relayout();
  }

  const unbindSize = bindSizeControl(stage);

  const onResize = () => S.layout && vp.apply();
  window.addEventListener('resize', onResize);

  // ---- boards --------------------------------------------------------------------------------

  async function openBoard(id: string, fit = true) {
    try {
      if (!take(id, await loadBoard(id))) relayout();
      showMessage(null);
      if (fit && S.layout) vp.fit(S.layout.bounds, false);
      history.replaceState(null, '', `#${encodeURIComponent(id)}`);
    } catch (err) {
      fail(err);
      showMessage(err instanceof ApiError ? [err.message, ...err.problems].join('\n') : String(err));
    }
  }

  function watch(id: string) {
    S.unwatch?.();
    let pending = 0;
    S.unwatch = watchBoard(id, () => {
      clearTimeout(pending);
      pending = window.setTimeout(() => void openBoard(id, false), 150);
    });
  }

  async function boot() {
    try {
      const boards = await listBoards();
      shell.boards = boards;
      if (!boards.length) {
        showMessage('No boards yet. Run npm run dev to open the example boards.');
        return;
      }
      const wanted = decodeURIComponent(location.hash.slice(1));
      const id = boards.some((b) => b.id === wanted) ? wanted : boards[0]!.id;
      shell.boardId = id;
      await openBoard(id);
      watch(id);
    } catch (err) {
      fail(err);
      showMessage('Could not reach the board server. Start it with: npm run board');
    }
  }

  return {
    boot,
    switchTo(id) {
      shell.boardId = id;
      void openBoard(id);
      watch(id);
    },
    fit: () => { if (S.layout) vp.fit(S.layout.bounds); },
    toggleHide,
    answer,
    send,
    destroy() {
      S.unwatch?.();
      unbindKeys();
      unbindSize();
      window.removeEventListener('resize', onResize);
    },
  };
}
