// The lasso, the selection bar and the view commands on the board page (3_FE_02 rulings 1, 2, 5
// and 7; Move to, 3_FE_03 ruling 8). A Shift+drag on a background draws the dashed lasso; on
// release the cards it touches
// replace the selection (Shift+Cmd/Ctrl adds them), through the same selection module a click
// uses, so only those cards are updated and none is laid out. A lasso that touches no card gets
// the area bar, whose one command zooms there; the area is kept here only, never stored (rule 9).
// The bar sits over the selection whenever it is not empty and no note bubble is open, and follows
// pan and zoom; it and the lasso are drawn on the stage, above the cards, and touch none of them.
// With the selectionPill flag (stage5-follow-ups FE_02) the bar over a selection starts as a pill
// that opens it (selection-pill.ts). With the personRemove flag (N24) it offers Remove, as Delete and Backspace do
// (remove-flow.ts). The bar has no Clear: a click on empty board and Esc clear the selection.
import type { BoardLayout, Box } from '#layout';
import type { StageBox, VbSelectionBarElement } from '#ui';
import type { CommandEventDetail, ToggleEventDetail } from '#ui';
import { BAR_GAP, barView, boxAround, boxBetween, pillGap, placeBar, touches } from '#ui';
import type { CommandId } from '../input/index.ts';
import { AREA_COMMANDS, barButtons, COMMANDS, EDGE_COMMANDS, isCommand, SELECTION_COMMANDS, selectionButtons } from '../input/index.ts';
import type { BarActs } from './bar-acts.ts';
import type { NoteFlow } from '../notes/index.ts';
import type { Selection } from './selection.ts';
import { commentOnSelection } from './comment-key.ts';
import { createPill } from './selection-pill.ts';
import type { Viewport } from '../canvas/index.ts';
import { APP_FIT, SELECTION_FIT, ZOOM_RULES } from '../canvas/index.ts';

/** The selection's commands that change the board, which a locked board shows disabled. */
const ACTING_COMMANDS: readonly CommandId[] = [...SELECTION_COMMANDS, ...EDGE_COMMANDS].filter((id) => COMMANDS[id].acts && id !== 'bookmark-all');

export interface SelectionFlowDeps {
  stage: HTMLElement;
  vp: Viewport;
  selection: Selection;
  layout(): BoardLayout | null;
  notes: NoteFlow;
  /** The card's number; undefined for a card drawn with none (the everyNode flag off): it takes no note. */
  item(id: string): number | undefined;
  /** Comment with one card selected: that card's own note, as C on it (2e). */
  commentOn(id: string): void;
  /** Move to (3_FE_03 ruling 8): open the list of containers for the selection, under `anchor`
   *  (the bar, or the selection when the bar is hidden), in stage pixels. */
  openMove(ids: readonly string[], anchor: StageBox): void;
  /** Whether card `id` has been moved by hand (a pin). */
  pinned(id: string): boolean;
  /** Reset places (navigation FE_03): put these cards back where layout places them. */
  resetPlaces(ids: readonly string[]): void;
  /** Remove card (N24, remove-flow.ts): ask, then take these cards off the board; false when none.
   *  Absent with the personRemove flag off: no button, and Delete does nothing. */
  remove?(ids: readonly string[]): boolean;
  /** A past version shows (versions.ts): the commands that act are off. */
  readOnly(): boolean;
  /** Why the board can't change now (a locked board, lock-flow.ts): the commands that act show, disabled. */
  paused?(): string | null;
  /** With the node's edges (nodeEdges flag, FE_06): the bar's Bookmark all, Save for later and Width (bar-acts.ts), present
   *  when they are offered; `bookmark` says whether the cardBookmark flag is on. Absent, today's bar. */
  edges?: BarActs & { bookmark: boolean };
  /** Whether a menu or box of a node, or the Move to list, is open now (the bar steps aside for the node's own, never
   *  covering them, FE_06): called on every placing, and the flow places again when it changes. */
  covered?(): boolean;
  /** The selectionPill flag: the compact bar, a pill over a selection until it is opened. */
  pill: boolean;
  /** The focusLeads flag: C writes on the focused card unless the focus is in a selection of two or more. */
  focusLeads?: boolean;
  /** A digit typed on the board: the Go to card box opens holding it (go-to-card.ts); absent with
   *  the goToCard flag off, when digits do nothing. */
  goTo?(key: string): boolean;
}

export interface SelectionFlow {
  /** A lasso drag, in client pixels: draw it, or end it (`add`: Shift+Cmd/Ctrl), or drop it. */
  lassoMove(from: Point, to: Point): void;
  lassoEnd(from: Point, to: Point, add: boolean): void;
  lassoCancel(): void;
  /** Run a command; false when it does not apply now (so a key can mean something else). */
  command(id: CommandId, key?: string, focused?: string | null): boolean;
  /** Zoom to these cards, whatever is selected (Zoom to selection's fit); false when none is drawn. */
  zoomTo(ids: readonly string[]): boolean;
  /** Show, hide or move the bar for the selection, the area and the view as they are now. */
  place(): void;
  /** Forget the lassoed area (a background click, Esc, a new selection). */
  dismissArea(): void;
  /** Esc: close the open bar back to its pill; false when there was none to close. */
  collapse(): boolean;
  destroy(): void;
}

interface Point { x: number; y: number }

/** The world box of the layout boxes `ids` have (hidden cards have none). */
const worldBoxOf = (layout: BoardLayout | null, ids: readonly string[]): Box | undefined =>
  boxAround(ids.map((id) => layout?.nodes.get(id)).filter((b): b is Box => b !== undefined));

/** Whether card `id` on the stage is an app card with its panel (the appCards flag on). */
const isAppCard = (stage: HTMLElement, id: string): boolean =>
  stage.querySelector(`vb-node[data-id="${CSS.escape(id)}"][data-kind="app"] > .vb-node-content > .vb-app`) !== null;

export function createSelectionFlow(d: SelectionFlowDeps): SelectionFlow {
  const bar = document.createElement('vb-selection-bar') as VbSelectionBarElement;
  bar.hidden = true;
  const lasso = document.createElement('div');
  lasso.className = 'vb-lasso';
  lasso.hidden = true;
  lasso.setAttribute('aria-hidden', 'true');
  d.stage.append(lasso, bar);
  /** The world box a lasso drew round no card, while its area bar is up. */
  let area: Box | null = null;
  /** A menu or box of a node was open at the last placing: the bar was hidden for it. */
  let covering = false;
  const pill = d.pill ? createPill({ stage: d.stage, bar, selection: d.selection, changed: () => place() }) : null;

  const onStage = (p: Point): Point => {
    const r = d.stage.getBoundingClientRect();
    return { x: p.x - r.left, y: p.y - r.top };
  };
  const toStage = (b: Box): StageBox => {
    const { k, x, y } = d.vp;
    return { x: b.x * k + x, y: b.y * k + y, w: b.w * k, h: b.h * k };
  };

  function lassoMove(from: Point, to: Point) {
    const b = boxBetween(onStage(from), onStage(to));
    // CSSOM, not a style attribute: the page's CSP refuses inline styles.
    Object.assign(lasso.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
    lasso.hidden = false;
    if (area) dismissArea();
  }

  function lassoEnd(from: Point, to: Point, add: boolean) {
    lasso.hidden = true;
    const world = boxBetween(d.vp.toWorld(from.x, from.y), d.vp.toWorld(to.x, to.y));
    const hits = [...(d.layout()?.nodes ?? [])].filter(([, b]) => touches(world, b)).map(([id]) => id);
    // The cards it touches replace the selection, or join it; touching none, it offers the area.
    if (hits.length || !add) d.selection.select(hits, add ? 'add' : 'only');
    if (!hits.length) area = world;
    place();
  }

  function place() {
    const sel = d.selection.selected();
    const world = area ?? worldBoxOf(d.layout(), sel);
    covering = d.covered?.() ?? false;
    if (d.notes.open || !world || covering) return void (bar.hidden = true);
    const off = [...(sel.some(d.pinned) ? [] : ['reset-places' as const]), ...(d.paused?.() ? ACTING_COMMANDS : [])];
    const compact = pill ? { open: pill.open } : undefined;
    bar.show(area ? barView(0, barButtons(AREA_COMMANDS), compact)
      : barView(sel.length, selectionButtons(sel.length, !!d.remove, d.readOnly(), off, d.edges && { bookmark: d.edges.bookmark, allBookmarked: d.edges.allBookmarked(sel) }), compact));
    const size = { w: bar.offsetWidth, h: bar.offsetHeight };
    // Over cards it clears their tabs at any zoom (pillGap); the area bar has no tabs under it.
    const gap = area ? BAR_GAP : pillGap(d.vp.k);
    bar.place(placeBar(toStage(world), size, { w: d.stage.clientWidth, h: d.stage.clientHeight }, gap, titleLines()));
  }

  /** Each container's title line (its Move grip, title and count) on the stage: the bar never covers one. */
  function titleLines(): StageBox[] {
    const s = d.stage.getBoundingClientRect();
    return [...d.stage.querySelectorAll<HTMLElement>('vb-region .vb-region-label')]
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }));
  }

  function dismissArea() {
    if (!area) return;
    area = null;
    place();
  }

  /** Comment: one note on exactly the selected cards, any kinds (every-node ruling 4), two or more,
   *  or the one card's own note. C means this only with two or more selected and the focus in
   *  them (comment-key.ts); otherwise it is the focused card's comment. A card with no number
   *  (the everyNode flag off) takes no note. */
  function comment(key?: string, focused?: string | null): boolean {
    const items = d.selection.selected().filter((id) => d.item(id) !== undefined)
      .sort((a, b) => d.item(a)! - d.item(b)!);
    if (!commentOnSelection(items, key, focused, !!d.focusLeads)) return false;
    if (items.length >= 2) d.notes.group(items);
    else d.commentOn(items[0]!);
    return true;
  }

  /** The cards fill 75% of the stage, above 110% when small (review-polish ruling 12); one app card
   *  fills 95% of it, so its app is big enough to use (card-polish FE_01). */
  function zoomTo(ids: readonly string[]): boolean {
    const b = worldBoxOf(d.layout(), ids);
    if (b) d.vp.fit(b, true, ids.length === 1 && isAppCard(d.stage, ids[0]!) ? APP_FIT : SELECTION_FIT);
    return b !== undefined;
  }

  /** One of the edges' commands: it applies only with the node's edges and a selection; true once started. */
  function acted(run: () => Promise<void>, offered = true): boolean {
    if (!d.edges || !offered || !d.selection.selected().length) return false;
    void run();
    return true;
  }

  function command(id: CommandId, key?: string, focused?: string | null): boolean {
    const layout = d.layout();
    if (COMMANDS[id].acts && (d.readOnly() || d.paused?.())) return false;
    switch (id) {
      case 'zoom-in': d.vp.zoomCentre(ZOOM_RULES.steps.numbers.button); return true;
      case 'zoom-out': d.vp.zoomCentre(1 / ZOOM_RULES.steps.numbers.button); return true;
      case 'fit': if (layout) d.vp.fit(layout.bounds); return true;
      case 'comment': return comment(key, focused);
      case 'move': {
        const sel = d.selection.selected();
        const world = worldBoxOf(layout, sel);
        if (!world) return false;
        const s = d.stage.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        d.openMove(sel, bar.hidden ? toStage(world) : { x: b.left - s.left, y: b.top - s.top, w: b.width, h: b.height });
        return true;
      }
      // Every selected card at once; with no selection, R is the focused card's own reset.
      case 'reset-places': {
        const sel = d.selection.selected();
        if (sel.length) d.resetPlaces(sel.filter(d.pinned));
        return sel.length > 0;
      }
      case 'remove': return d.remove?.(d.selection.selected()) ?? false;
      case 'bookmark-all': return acted(() => d.edges!.bookmarkAll(d.selection.selected()), d.edges?.bookmark);
      case 'save-for-later': return acted(() => d.edges!.saveForLater(d.selection.selected()));
      case 'width': {
        const sel = d.selection.selected();
        const world = worldBoxOf(layout, sel);
        if (!d.edges || !world) return false;
        const s = d.stage.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        d.edges.width(sel, bar.hidden ? toStage(world) : { x: b.left - s.left, y: b.top - s.top, w: b.width, h: b.height });
        return true;
      }
      case 'zoom-selection': return zoomTo(d.selection.selected());
      case 'zoom-area': {
        const a = area;
        if (!a) return false;
        area = null;
        d.vp.fit(a);
        place();
        return true;
      }
      // A container's note needs the container (keys.ts finds it from focus).
      case 'container-note': return false;
      case 'go-to-card': return key !== undefined && (d.goTo?.(key) ?? false);
    }
  }

  // A menu or box of a node opening or closing changes whether the bar steps aside; nothing else in the stage matters here.
  const watch = d.covered && new MutationObserver(() => { if ((d.covered?.() ?? false) !== covering) place(); });
  watch?.observe(d.stage, { childList: true, attributes: true, attributeFilter: ['data-open'], subtree: true });

  bar.addEventListener('vb-command', (e) => {
    const id = (e as CustomEvent<CommandEventDetail>).detail.command;
    if (isCommand(id)) command(id);
  });
  bar.addEventListener('vb-toggle', (e) => pill?.set((e as CustomEvent<ToggleEventDetail>).detail.open));

  return {
    lassoMove, lassoEnd, lassoCancel: () => { lasso.hidden = true; }, command, zoomTo, place, dismissArea,
    collapse: () => pill?.collapse() ?? false,
    destroy() { watch?.disconnect(); pill?.destroy(); bar.remove(); lasso.remove(); },
  };
}
