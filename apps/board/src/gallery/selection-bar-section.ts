// Gallery entry for <vb-selection-bar> (3_FE_02): the selection bar over two selected cards, and
// the area bar a lasso leaves when it touched no card. Each sample is a small stage on the board's
// canvas; the bar is placed with `placeBar` exactly as the board places it. The cards are the
// gallery's own non-item samples (topic, note): the bar is what the sample is about, not a card's marks.
// With the selectionPill flag (stage5-follow-ups FE_02) the samples are the compact bar's: the
// pill, the open bar, its hover (drawn with data-look) and the area bar. With the selectionGrid flag
// too, the grid's samples follow: open upward and downward from a marked click on the pill (placed with
// `placeGrid` as the board places it), on a locked board with Remove off, and its focus and hover.
import type { ViewNode } from '#format';
import type { VbSelectionBarElement } from '#ui';
import { BAR_GAP, barView, pillGap, placeBar, placeGrid } from '#ui';
import type { CommandId } from '../board/input/index.ts';
import { AREA_COMMANDS, barButtons, COMMANDS, gridCells, SELECTION_COMMANDS, selectionButtons } from '../board/input/index.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { card } from './node-section.ts';

interface Sample {
  caption: string;
  titles: string[];
  area: boolean;
  /** Reset places has no moved card to act on: disabled. */
  none?: boolean;
  stage: { w: number; h: number };
  /** The compact bar (selectionPill): its pill open or closed. */
  pill?: { open: boolean };
  /** Every selected node is bookmarked: Bookmark all reads Remove bookmarks. */
  allBookmarked?: boolean;
  /** Buttons drawn hovered (data-look), by command id. */
  hover?: string[];
}

const SAMPLES: Sample[] = [
  { caption: 'Over two selected cards: Comment, Move to, Reset places (disabled: neither card has been moved), Remove, Bookmark all, Save for later, Width, Zoom',
    titles: ['Topic: a heading for a group of cards', 'Note: the agent remarks, nothing to answer'],
    area: false, none: true, stage: { w: 780, h: 220 } },
  { caption: 'Every selected node bookmarked: Bookmark all reads Remove bookmarks', titles: ['Topic: a heading for a group of cards', 'Note: the agent remarks, nothing to answer'],
    area: false, none: true, stage: { w: 780, h: 220 }, allBookmarked: true },
  { caption: 'A lasso that touched no card: only Zoom to this area', titles: ['Topic: a heading for a group of cards'],
    area: true, stage: { w: 400, h: 180 } },
];

const TWO = ['Topic: a heading for a group of cards', 'Note: the agent remarks, nothing to answer'];
const PILL_SAMPLES: Sample[] = [
  { caption: 'Two cards selected: the pill, closed. A click or Enter opens the bar', titles: TWO,
    area: false, none: true, stage: { w: 660, h: 200 }, pill: { open: false } },
  { caption: 'The pill open: the compact bar, the pill first. A press outside, a pan or Esc closes it', titles: TWO,
    area: false, none: true, stage: { w: 660, h: 200 }, pill: { open: true } },
  { caption: 'Hover: Comment (the primary) on its hover fill, Move to on the plain hover', titles: TWO,
    area: false, none: true, stage: { w: 660, h: 200 }, pill: { open: true }, hover: ['comment', 'move'] },
  { caption: 'A lasso that touched no card: the compact area bar', titles: ['Topic: a heading for a group of cards'],
    area: true, stage: { w: 400, h: 180 }, pill: { open: true } },
];

/** A sample's stage with its cards at `top`, selected unless `area`. */
function stageWith(s: Sample, fx: Fixture, top = 24): { stage: HTMLElement; list: HTMLElement; cards: HTMLElement[] } {
  const stage = el('div', 'g-bubble-stage vb-ground');
  stage.style.setProperty('width', `${s.stage.w}px`);
  stage.style.setProperty('height', `${s.stage.h}px`);
  const list = el('div', 'g-bubble-card');
  list.setAttribute('role', 'list');
  const nodes = s.titles.map((t) => fx.view.nodes.find((n: ViewNode) => n.title === t)!);
  const cards = nodes.map((n, i) => {
    const c = card(n, fx, fx.state);
    c.style.transform = `translate(${24 + i * 240}px, ${top}px)`;
    c.toggleAttribute('data-selected', !s.area);
    list.append(c);
    return c;
  });
  return { stage, list, cards };
}

/** The cards' screen box on the stage: they are placed by a transform, which offsetLeft ignores. */
function selectionBox(stage: HTMLElement, cards: HTMLElement[]) {
  const at = stage.getBoundingClientRect();
  const boxes = cards.map((c) => c.getBoundingClientRect()).map((r) => ({ x: r.left - at.left, y: r.top - at.top, w: r.width, h: r.height }));
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
}

function sample(s: Sample, fx: Fixture, remove: boolean): HTMLElement {
  const { stage, list, cards } = stageWith(s, fx);
  const bar = document.createElement('vb-selection-bar') as VbSelectionBarElement;
  const view = s.area ? barView(0, barButtons(AREA_COMMANDS), s.pill)
    : barView(cards.length, selectionButtons(cards.length, remove, false, s.none ? ['reset-places'] : [], { bookmark: true, allBookmarked: s.allBookmarked === true }), s.pill);
  bar.show(view);
  for (const id of s.hover ?? []) bar.querySelector(`[data-command="${id}"]`)?.setAttribute('data-look', 'hover');
  stage.append(list, bar);
  requestAnimationFrame(() => {
    // The cards here are at zoom 1, so the bar clears their tabs as the board's does at 1.
    bar.place(placeBar(selectionBox(stage, cards), { w: bar.offsetWidth, h: bar.offsetHeight }, s.stage, s.area ? BAR_GAP : pillGap(1)));
  });
  const fig = el('figure', 'g-bubble');
  fig.append(stage, el('figcaption', 'g-note', s.caption));
  return fig;
}

interface GridSample extends Sample {
  /** Where the cards sit on the stage: low leaves room above, high sends the grid downward. */
  top: number;
  /** The click on the pill, as a share of its width (from the left). */
  click: number;
  /** A locked board: the acting commands off. */
  paused?: boolean;
  /** The personRemove flag off: no Remove, its cell kept empty. */
  noRemove?: boolean;
  /** Cells drawn focused (data-look), by command id. */
  focus?: string[];
}

const GRID_SAMPLES: GridSample[] = [
  { caption: 'Opened upward from a click on the pill (the ring): Comment is under it and focused, Remove the farthest cell', titles: TWO,
    area: false, none: true, stage: { w: 560, h: 280 }, top: 170, click: 0.3 },
  { caption: 'No room above: the rows reverse and it opens downward, Comment still under the click, Remove still farthest', titles: TWO,
    area: false, none: true, stage: { w: 560, h: 280 }, top: 60, click: 0.7 },
  { caption: 'A locked board with Remove off: the acting cells disabled, Remove\'s cell empty, the grid keeps its shape', titles: TWO,
    area: false, none: true, stage: { w: 560, h: 280 }, top: 170, click: 0.5, paused: true, noRemove: true },
  { caption: 'Focus on Comment (the ring inside the cell) and hover on Width', titles: TWO,
    area: false, none: false, stage: { w: 560, h: 280 }, top: 170, click: 0.5, focus: ['comment'], hover: ['width'] },
];

/** The commands a locked board shows disabled, as the board's flow lists them. */
const ACTING: readonly CommandId[] = SELECTION_COMMANDS.filter((id) => COMMANDS[id].acts && id !== 'bookmark-all');

function gridSample(s: GridSample, fx: Fixture, remove: boolean): HTMLElement {
  const { stage, list, cards } = stageWith(s, fx, s.top);
  const off = [...(s.none ? ['reset-places' as const] : []), ...(s.paused ? ACTING : [])];
  const buttons = selectionButtons(cards.length, remove && !s.noRemove, false, off, { bookmark: true, allBookmarked: false });
  const bar = document.createElement('vb-selection-bar') as VbSelectionBarElement;
  const pointer = el('span', 'g-pointer');
  pointer.setAttribute('aria-hidden', 'true');
  bar.show(barView(cards.length, buttons, { open: false, cells: gridCells(buttons) }));
  stage.append(list, bar, pointer);
  requestAnimationFrame(() => {
    // The pill as the board places it, then the grid opened from the click, as the board's flow does.
    const pill = placeBar(selectionBox(stage, cards), { w: bar.offsetWidth, h: bar.offsetHeight }, s.stage, pillGap(1));
    const at = { x: pill.x + bar.offsetWidth * s.click, y: pill.y + bar.offsetHeight / 2 };
    bar.show(barView(cards.length, buttons, { open: true, cells: gridCells(buttons) }));
    for (const id of s.hover ?? []) bar.querySelector(`[data-command="${id}"]`)?.setAttribute('data-look', 'hover');
    for (const id of s.focus ?? []) bar.querySelector(`[data-command="${id}"]`)?.setAttribute('data-look', 'focus');
    bar.place(placeGrid(at, { w: bar.offsetWidth, h: bar.offsetHeight }, bar.anchor()!, s.stage));
    Object.assign(pointer.style, { left: `${at.x}px`, top: `${at.y}px` });
    // The gallery shows it, not the person's focus: the grid's own focus goes back to the page.
    (document.activeElement as HTMLElement | null)?.blur();
  });
  const fig = el('figure', 'g-bubble');
  fig.append(stage, el('figcaption', 'g-note', s.caption));
  return fig;
}

/** `pill`: the selectionPill flag, `remove` the personRemove flag (Remove cards on the bar), `grid` the selectionGrid
 * flag (with the pill), read by the gallery's entry point. */
export function selectionBarSamples(body: HTMLElement, fx: Fixture, pill = false, remove = false, grid = false): void {
  const row = el('div', 'g-bubbles');
  row.append(...(pill ? PILL_SAMPLES : SAMPLES).map((s) => sample(s, fx, remove)));
  body.append(group('Every state', 'Centred above the selection, below it when there is no room; the lasso it follows is .vb-lasso. One command table drives the bar, the header buttons and the keys.', row));
  if (!pill || !grid) return;
  const grids = el('div', 'g-bubbles');
  grids.append(...GRID_SAMPLES.map((s) => gridSample(s, fx, remove)));
  body.append(group('The grid', 'The pill opens into three rows of three, Comment under the click; the arrow keys move between the cells. Off (selectionGrid), the one-row bar above.', grids));
}
