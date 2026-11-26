// The fixed-size menu's markup (D-101; the shared base's menu look, base/menu.css, made one builder): a role=menu list of
// menuitem rows, each its icon (the icon set), its words and its key, with separators between groups. It keeps one size
// at any zoom (FE_05 places it on the stage, outside the scaled board). `look: 'picker'` lays the rows side by side,
// icons only (the answer picker, over the disc); their words stay their names. A row with `popup` opens another menu (aria-haspopup, a chevron). The page opens it with `menuKeydown` and
// `dismissable` (`clickWithin`, so a pan leaves it open) and acts on `data-menu-act` (FE_02). Pure: markup only, every text run escaped.
import { esc } from '../markdown/inline.ts';
import { icon } from '../icons/icon.ts';

/** One row: what it does (`act`, the page's), its words, its icon's name, its key, and the colour a row of the answer
 *  keeps (Tick green, Cross red). */
export interface MenuRow { act: string; label: string; icon: string; key?: string; tone?: 'tick' | 'cross'; popup?: boolean }
/** A row, or a line between two groups. */
export type MenuEntry = MenuRow | 'separator';

export interface MenuSpec { id: string; label: string; entries: readonly MenuEntry[]; look?: 'list' | 'picker' }

const row = (r: MenuRow, picker: boolean): string =>
  `<button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" data-menu-act="${esc(r.act)}"`
  + `${r.tone ? ` data-tone="${r.tone}"` : ''}${r.popup ? ' aria-haspopup="menu"' : ''}${picker ? ` aria-label="${esc(r.label)}${r.key ? ` (${esc(r.key)})` : ''}"` : ''}>`
  + `${icon(r.icon, 'vb-menu-icon')}${picker ? '' : `<span class="vb-menu-label">${esc(r.label)}</span>${r.key ? `<kbd>${esc(r.key)}</kbd>` : ''}${r.popup ? '<span class="vb-menu-more" aria-hidden="true">›</span>' : ''}`}</button>`;

/** The menu, drawn hidden; the page shows it, places it and opens it. */
export function menuMarkup(m: MenuSpec): string {
  const picker = m.look === 'picker';
  const rows = m.entries.map((e) => (e === 'separator' ? '<div class="vb-menu-sep" role="separator"></div>' : row(e, picker))).join('');
  return `<div class="vb-menu-list vb-menu-fixed" id="${esc(m.id)}" role="menu" aria-label="${esc(m.label)}"${picker ? ' data-menu-look="picker" aria-orientation="horizontal"' : ''} hidden>${rows}</div>`;
}
