// Node pattern, layer 2 (template), an app node as a window (D-099 5, FE_08; the look of
// design/mockups/node-states/default-app-* and command-lens-app-*): one thin title bar and nothing else of the board's,
// no footer and no notes under the app. The bar holds, in visual and tab order: the number (the Bookmark toggle, as on
// any node), the app's name, the change badge (hidden until it applies), why Allow shows, Allow or "Allowed ▾" (today's
// control, `appStatus`), the drawer arrow with the notes count, and Open (a toggle: pressed while the
// window fills the page, and pressing it again is Back). Under the bar everything
// is the app's (`appSlot`). The drawer, on the window's right at its height, holds the node's conversation (FE_03's
// box, which the page docks in it, notes/app-drawer.ts); open, the node is wider by it, so the layout makes room. The
// history box the badge, H and right-click open is the edges' one. A skin's row places the bar (`data-marks-at`), never
// a skin's name: the bar is a plate (`vb-node-plate`), so a plate skin draws it as its plate and it is the drag handle
// in every skin (pointer.ts `HANDLE`). Markup only; the element applies the state (node-app-apply.ts `applyWindow`). Pure.
import type { ViewNode } from '#format';
import { esc } from '../markdown/inline.ts';
import { icon } from '../icons/icon.ts';
import { KIND_ICON, svgIcon } from './node-icons.ts';
import { historyBox } from './node-history.ts';
import { badgeMark, numberMark } from './node-edges.ts';
import { MARK_KEYS } from './node-marks.ts';
import { isItem } from './node-core.ts';
import * as nodeAppWords from '../words/node-app.ts';

/** What the template hands over: the app's slot and status it built, the stepper, and the ids the bar's controls name. */
export interface WindowParts {
  body: string; status: string; steps: string; stepNav: string;
  ids: { history: string; drawer: string };
}

/** The id of app node `n`'s drawer, which its arrow controls (`prefix`: the mount's). */
export const drawerId = (n: ViewNode, prefix = ''): string => `${prefix}vb-drawer-${n.id}`;

/** A control in the bar: its name set by `applyWindow`, its tip shown as every mark's is (after a deliberate hover). */
const button = (cls: string, attrs: string, tip: string, inner: string): string =>
  `<button type="button" class="vb-win-btn ${cls}"${attrs} data-tip="${esc(tip)}">${inner}</button>`;

/** The app's name: one line, cut with "…", the whole name in its tip while cut (`bindAppNameTip`). */
const name = (n: ViewNode): string =>
  `<span class="vb-app-name vb-win-name">${svgIcon(KIND_ICON.app, 24, 'vb-win-icon')}<span class="vb-app-name-text">${esc(n.title)}</span>`
  + `<span class="vb-tip vb-app-name-tip" aria-hidden="true">${esc(n.title)}</span></span>`;

export function windowMarkup(n: ViewNode, p: WindowParts): string {
  const drawer = button('vb-win-drawer', ` data-drawer aria-expanded="false" aria-controls="${esc(p.ids.drawer)}" aria-keyshortcuts="${MARK_KEYS.comment}"`,
    nodeAppWords.drawerTip(MARK_KEYS.comment), `${icon('drawer', 'vb-win-btn-icon')}<span class="vb-mark-text"></span>`);
  const open = button('vb-win-open', ' data-app-act="stage" aria-pressed="false"', nodeAppWords.openTip, icon('expand', 'vb-win-btn-icon'));
  // The number, as on any node; an app with none (the everyNode flag off) has none.
  const bar = `<div class="vb-node-plate vb-win-bar">${isItem(n) ? numberMark(n) : ''}${name(n)}${badgeMark(p.ids.history)}<span class="vb-win-reason" hidden>${icon('lock', 'vb-win-btn-icon')}<span class="vb-win-reason-text"></span></span>`
    + `${p.status}${drawer}${open}</div>`;
  const pane = `<div class="vb-win-drawer-pane" id="${esc(p.ids.drawer)}" role="region" aria-label="${esc(nodeAppWords.conversationOn(n.n, n.title))}" hidden></div>`;
  return `${bar}<div class="vb-node-content vb-win-body">${p.body}</div>${pane}${historyBox(n, p.ids.history, p.steps + p.stepNav)}`;
}
