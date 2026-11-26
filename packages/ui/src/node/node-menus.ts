// Node pattern, the node's three menus (D-099), as markup for the fixed-size menu (menu-template.ts):
// the number's menu (Bookmark, Save for later; held on the number), the answer picker (Tick, Cross; opened over the
// disc, Tick on it, D-112) and the right-click list (the six actions with their keys, then Width ›: no Tick or Cross on a node that only
// tells, no Save for later or Width on an app). A moved node adds "Moved by you · Put back" to the number's menu and the list;
// a node in Later reads Bring back. The words come from the node's words file, the keys from the registry. The page
// opens them and acts on `data-menu-act` (FE_02): `ack`, `drop`, `comment`, `bookmark` or `unbookmark`, `later` or
// `reopen`, `history`, `width`, `unpin`. Pure.
import type { ViewNode } from '#format';
import { NODE_TYPES } from '#format';
import type { MenuEntry, MenuRow } from '../menu/menu-template.ts';
import { menuMarkup } from '../menu/menu-template.ts';
import type { NodeState } from './node-core.ts';
import { MARK_KEYS } from './node-marks.ts';
import * as nodeWords from '../words/node.ts';

/** The id of node `n`'s menu `name` (`number`, `answer`, `actions`), unique per mount (`prefix`). */
export const menuId = (name: string, n: ViewNode, prefix = ''): string => `${prefix}vb-menu-${name}-${n.id}`;

const TICK: MenuRow = { act: 'ack', label: nodeWords.tick, icon: 'tick', key: MARK_KEYS.tick, tone: 'tick' };
const CROSS: MenuRow = { act: 'drop', label: nodeWords.cross, icon: 'cross', key: MARK_KEYS.cross, tone: 'cross' };
const COMMENT: MenuRow = { act: 'comment', label: nodeWords.comment, icon: 'notes', key: MARK_KEYS.comment };
const HISTORY: MenuRow = { act: 'history', label: nodeWords.history2, icon: 'history', key: MARK_KEYS.history };
const WIDTH: MenuRow = { act: 'width', label: nodeWords.width, icon: 'width', popup: true };
const PUT_BACK: MenuRow = { act: 'unpin', label: nodeWords.putBack, icon: 'put-back', key: MARK_KEYS.putBack };

/** Bookmark, or Remove bookmark while bookmarked. */
const bookmark = (st: NodeState): MenuRow => (st.marks.bookmarked
  ? { act: 'unbookmark', label: nodeWords.removeBookmark, icon: 'bookmark', key: MARK_KEYS.bookmark }
  : { act: 'bookmark', label: nodeWords.bookmark, icon: 'bookmark', key: MARK_KEYS.bookmark });

/** Save for later where the node's type offers it (`NODE_TYPES`: not an app, D-099 5), or Bring back for a node in Later
 *  (an app a ledger saved before too). */
const later = (n: ViewNode, st: NodeState): MenuRow[] => (st.status === 'later'
  ? [{ act: 'reopen', label: nodeWords.bringBack, icon: 'clock', key: MARK_KEYS.later }]
  : NODE_TYPES[n.kind].actions.includes('later') ? [{ act: 'later', label: nodeWords.saveForLater, icon: 'clock', key: MARK_KEYS.later }] : []);

const moved = (st: NodeState): MenuEntry[] => (st.pinned ? ['separator', PUT_BACK] : []);

/** The number's menu (DD-04): Bookmark and Save for later, then Put back on a moved node. */
export const numberMenu = (n: ViewNode, st: NodeState, prefix = ''): string =>
  menuMarkup({ id: menuId('number', n, prefix), label: nodeWords.numberMenu(n.n), entries: [bookmark(st), ...later(n, st), ...moved(st)] });

/** The answer picker (DD-07, D-112): Tick and Cross side by side, opened over the disc with Tick on it. */
export const answerPicker = (n: ViewNode, prefix = ''): string =>
  menuMarkup({ id: menuId('answer', n, prefix), label: nodeWords.answerPicker(n.n), entries: [TICK, CROSS], look: 'picker' });

/** Width, where the node takes one: it has a size (`NodeState.size`: the page gave a tier, the nodeSize flag on, and not an
 *  app, whose panel has its own) and a number (a node without one takes no act). */
const width = (n: ViewNode, st: NodeState): MenuRow[] => (st.size !== undefined && n.n !== undefined ? [WIDTH] : []);

/** The right-click list (DD-02): every action of the node with its key, Tick and Cross only on a node that asks, and Width ›. */
export function contextMenu(n: ViewNode, st: NodeState, prefix = ''): string {
  const answer: MenuEntry[] = NODE_TYPES[n.kind].answer ? [TICK, CROSS, 'separator'] : [];
  return menuMarkup({
    id: menuId('actions', n, prefix), label: nodeWords.actionsOn(n.n),
    entries: [...answer, COMMENT, bookmark(st), ...later(n, st), HISTORY, ...width(n, st), ...moved(st)],
  });
}
