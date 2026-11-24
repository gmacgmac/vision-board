// Selection bar pattern, layer 2 (template): one pure function from the bar's view to its markup.
// Tokens only, no inline styles (the page's CSP refuses them). Architect `.selbar`: the count, then
// the buttons on one line; the first primary button wears the accent fill. With the pill
// (stage5-follow-ups FE_02) the count is a button with a chevron; open or closed draws the same
// markup, the element sets `aria-expanded` and `data-open`, so the pill keeps focus as it opens.
// With the grid (`cells`, selection-grid task) the pill is the first of nine cells, each with its row
// (`data-row`, which the styles place, reversed when it opens downward), a divider after the first row,
// the anchor cell marked (`data-anchor`), and each button's icon and danger look.
import type { BarButton, BarView, GridCell } from './selection-bar-core.ts';
import { GRID_ANCHOR, GRID_COLUMNS } from './selection-bar-core.ts';
import { esc } from '../markdown/inline.ts';
import { icon } from '../icons/icon.ts';

const pillButton = (count: string, extra = '') =>
  `<button type="button" class="vb-sb-pill" aria-expanded="false"${extra}>${esc(count)}<span class="vb-sb-chevron" aria-hidden="true"></span></button>`;

function button(b: BarButton, grid = '', look = ''): string {
  const words = grid && b.icon ? `${icon(b.icon, 'vb-sb-icon')}<span>${esc(b.label)}</span>` : esc(b.label);
  return `<button type="button" class="vb-sb-btn${b.primary ? ' vb-sb-primary' : ''}${look}" data-command="${esc(b.id)}"${grid}${b.title ? ` title="${esc(b.title)}" aria-label="${esc(b.title)}"` : ''}${b.disabled ? ' disabled' : ''}>${words}</button>`;
}

/** Cell `at` of the grid (the pill is cell 0): its row, and whether it is the anchor. */
const where = (at: number) => ` data-row="${Math.floor(at / GRID_COLUMNS) + 1}"${at === GRID_ANCHOR ? ' data-anchor' : ''}`;

function cell(b: GridCell, at: number): string {
  if (!b) return `<span class="vb-sb-gap"${where(at)} aria-hidden="true"></span>`;
  return button(b, where(at), b.danger ? ' vb-sb-danger' : '');
}

function grid(v: BarView, cells: readonly GridCell[]): string {
  const rest = cells.map((b, i) => cell(b, i + 1));
  rest.splice(GRID_COLUMNS - 1, 0, '<span class="vb-sb-divider" aria-hidden="true"></span>');
  return pillButton(v.count, where(0)) + rest.join('');
}

export function selectionBarTemplate(v: BarView): string {
  if (v.cells && v.count) return grid(v, v.cells);
  const count = !v.count ? '' : v.pill ? pillButton(v.count) : `<span class="vb-sb-count">${esc(v.count)}</span>`;
  return count + v.buttons.map((b) => button(b)).join('');
}
