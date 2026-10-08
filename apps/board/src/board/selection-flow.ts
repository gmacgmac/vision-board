// The lasso, the selection bar and the view commands on the board page (3_FE_02 rulings 1, 2, 5
// and 7; Move to, 3_FE_03 ruling 8). A Shift+drag on a background draws the dashed lasso; on
// release the cards it touches
// replace the selection (Shift+Cmd/Ctrl adds them), through the same selection module a click
// uses, so only those cards are updated and none is laid out. A lasso that touches no card gets
// the area bar, whose one command zooms there; the area is kept here only, never stored (rule 9).
// The bar sits over the selection whenever it is not empty and no note bubble is open, and follows
// pan and zoom; it and the lasso are drawn on the stage, above the cards, and touch none of them.
// With the selectionPill flag (stage5-follow-ups FE_02) the bar over a selection starts as a pill
// that opens it (selection-pill.ts).
import type { BoardLayout, Box } from '../../../../packages/layout/src/index.ts';
import type { StageBox, VbSelectionBarElement } from '../../../../packages/ui/src/index.ts';
import type { CommandEventDetail, ToggleEventDetail } from '../../../../packages/ui/src/index.ts';
import { barView, boxAround, boxBetween, placeBar, touches } from '../../../../packages/ui/src/index.ts';
import type { CommandId } from './commands.ts';
import { AREA_COMMANDS, barButtons, COMMANDS, isCommand, SELECTION_COMMANDS } from './commands.ts';
import type { NoteFlow } from './notes.ts';
import type { Selection } from './selection.ts';
import { createPill } from './selection-pill.ts';
import type { Viewport } from './viewport.ts';

export interface SelectionFlowDeps {
  stage: HTMLElement;
  vp: Viewport;
  selection: Selection;
  layout(): BoardLayout | null;
  notes: NoteFlow;
  /** The card's item number; undefined for a card that is not an item (it takes no note). */
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
  /** A past version shows (versions.ts): the commands that act are off. */
  readOnly(): boolean;
  /** The selectionPill flag: the compact bar, a pill over a selection until it is opened. */
  pill: boolean;
}

export interface SelectionFlow {
  /** A lasso drag, in client pixels: draw it, or end it (`add`: Shift+Cmd/Ctrl), or drop it. */
  lassoMove(from: Point, to: Point): void;
  lassoEnd(from: Point, to: Point, add: boolean): void;
  lassoCancel(): void;
  /** Run a command; false when it does not apply now (so a key can mean something else). */
  command(id: CommandId, key?: string): boolean;
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
    if (d.notes.open || !world) return void (bar.hidden = true);
    const off = sel.some(d.pinned) ? [] : ['reset-places' as const];
    const compact = pill ? { open: pill.open } : undefined;
    bar.show(area ? barView(0, barButtons(AREA_COMMANDS), compact)
      : barView(sel.length, barButtons(SELECTION_COMMANDS, d.readOnly(), off), compact));
    const size = { w: bar.offsetWidth, h: bar.offsetHeight };
    bar.place(placeBar(toStage(world), size, { w: d.stage.clientWidth, h: d.stage.clientHeight }));
  }

  function dismissArea() {
    if (!area) return;
    area = null;
    place();
  }

  /** Comment: a note on the selected items as a group (two or more), or the one item's own note.
   *  C means this only with two or more selected; alone it is the focused card's comment. */
  function comment(key?: string): boolean {
    const items = d.selection.selected().filter((id) => d.item(id) !== undefined)
      .sort((a, b) => d.item(a)! - d.item(b)!);
    if (key === 'c' && items.length < 2) return false;
    if (items.length >= 2) d.notes.group(items);
    else if (items.length === 1) d.commentOn(items[0]!);
    else return false;
    return true;
  }

  function command(id: CommandId, key?: string): boolean {
    const layout = d.layout();
    if (COMMANDS[id].acts && d.readOnly()) return false;
    switch (id) {
      case 'zoom-in': d.vp.zoomCentre(1.2); return true;
      case 'zoom-out': d.vp.zoomCentre(1 / 1.2); return true;
      case 'fit': if (layout) d.vp.fit(layout.bounds); return true;
      case 'comment': return comment(key);
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
      case 'clear':
        if (!d.selection.selected().length) return false;
        d.selection.clear();
        return true;
      case 'zoom-selection': {
        // The selection's box with the margin Fit leaves round the board (viewport.ts `fit`).
        const b = worldBoxOf(layout, d.selection.selected());
        if (b) d.vp.fit(b);
        return b !== undefined;
      }
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
    }
  }

  bar.addEventListener('vb-command', (e) => {
    const id = (e as CustomEvent<CommandEventDetail>).detail.command;
    if (isCommand(id)) command(id);
  });
  bar.addEventListener('vb-toggle', (e) => pill?.set((e as CustomEvent<ToggleEventDetail>).detail.open));

  return {
    lassoMove, lassoEnd, lassoCancel: () => { lasso.hidden = true; }, command, place, dismissArea,
    collapse: () => pill?.collapse() ?? false,
    destroy() { pill?.destroy(); bar.remove(); lasso.remove(); },
  };
}
