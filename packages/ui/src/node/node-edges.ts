// Node pattern, layer 2 (template), the node with its marks on its edges (D-099; nodeEdges flag, `opts.edges`): no
// footer; the number is the Bookmark toggle; the kind tab (or, for a node with an icon, a grip and a kind word over
// the title); the answer, where the skin's row puts it; the change badge, the quiet Awaiting tab and the notes mark on
// the bottom edge; the icon tile at the right of the body. It reads the skin's row (skins.ts), never a skin's name.
// The page opens what the marks control (FE_02): the history box, which holds the stepper (planner's call 9), and the
// proposal box beside the answer. Markup only, in visual order, so reading and tab order follow what is drawn. Pure.
import type { ViewNode } from '#format';
import { NODE_TYPES } from '#format';
import type { SkinDef } from '../skins.ts';
import type { IconLibrary } from '../icons/icon.ts';
import { icon } from '../icons/icon.ts';
import { esc } from '../markdown/inline.ts';
import { isItem } from './node-core.ts';
import { historyBox } from './node-history.ts';
import { MARK_KEYS } from './node-marks.ts';
import * as nodeWords from '../words/node.ts';

/** What the template hands over: the body and tags it built, and the ids and stepper of the boxes the marks open. */
export interface EdgeParts {
  body: string; tags: string; steps: string; stepNav: string;
  ids: { history: string; proposal: string };
  icons?: IconLibrary;
}

/** A mark: a real button, its name set by `update()` from the marks state (it says the state). `tip` shows after a
 *  deliberate hover, at once on keyboard focus (node-edges.css). */
const mark = (name: string, cls: string, attrs: string, tip: string, inner: string): string =>
  `<button type="button" class="vb-mark ${cls}" data-mark="${name}" data-tip="${esc(tip)}"${attrs}>${inner}</button>`;

/** The answer on the disc (DD-07, DD-08): the kind's colour with a dot while waiting, a tick or a cross once
 *  answered, a lock for a moment when pressed on a locked board (point 328). It opens the picker beside it, which the
 *  page draws (node-menus.ts `answerPicker`) and names in `aria-controls` while open. */
const disc = (): string =>
  mark('answer', 'vb-mark-answer', ' data-answer="waiting" aria-haspopup="menu" aria-expanded="false"',
    nodeWords.answerTip(MARK_KEYS.tick, MARK_KEYS.cross), icon('tick', 'vb-mark-tick') + icon('cross', 'vb-mark-cross') + icon('lock', 'vb-mark-lock'));

/** The answer as a Tick | Cross switch along the bottom (`switch`): each half one press. Its look is FE_04's. */
const answerSwitch = (): string => '<div class="vb-mark-switch" role="group">'
  + `<button type="button" class="vb-mark" data-mark="tick" aria-pressed="false">${icon('tick', 'vb-mark-tick')}<span>${nodeWords.tick}</span></button>`
  + `<button type="button" class="vb-mark" data-mark="cross" aria-pressed="false">${icon('cross', 'vb-mark-cross')}<span>${nodeWords.cross}</span></button></div>`;

/** The top edge: the number (items), the kind tab or the grip, and the disc on a node that asks. */
function topMarks(n: ViewNode, def: SkinDef): string {
  const num = isItem(n) ? mark('number', 'vb-node-num', ` aria-pressed="false" aria-keyshortcuts="${MARK_KEYS.bookmark}"`, nodeWords.bookmarkTip(MARK_KEYS.bookmark), String(n.n)) : '';
  const handle = n.icon ? '<span class="vb-node-grip" aria-hidden="true"></span>' : `<span class="vb-node-kind">${NODE_TYPES[n.kind].label}</span>`;
  const answer = def.answer === 'disc' && isItem(n) && NODE_TYPES[n.kind].answer ? disc() : '';
  return num + handle + answer;
}

/** The bottom edge: the change badge (it opens history), the quiet Awaiting tab, the notes mark. Hidden until they
 *  apply (`update()`), so a node's size never changes for one. */
function bottomMarks(parts: EdgeParts): string {
  const badge = mark('badge', 'vb-mark-badge', ` aria-haspopup="dialog" aria-expanded="false" aria-controls="${esc(parts.ids.history)}" hidden`,
    nodeWords.historyTip(MARK_KEYS.history), `${icon('history', 'vb-mark-icon')}<span class="vb-mark-text"></span>`);
  const awaiting = `<span class="vb-mark vb-mark-awaiting" title="${nodeWords.awaitingTip}" hidden>${nodeWords.awaiting}</span>`;
  const notes = mark('notes', 'vb-mark-notes', ` aria-haspopup="dialog" aria-expanded="false" aria-keyshortcuts="${MARK_KEYS.comment}"`, nodeWords.notesTip(MARK_KEYS.comment),
    `${icon('notes', 'vb-mark-icon vb-mark-one')}${icon('notes-group', 'vb-mark-icon vb-mark-group')}<span class="vb-mark-text"></span>`);
  return `<div class="vb-node-edge">${badge}${awaiting}${notes}</div>`;
}

/** The title, and for a node with an icon the kind's word over it (grey on a node that only tells) and the tile at the
 *  right; a library name the library lacks, or one that fails its check, draws the plain tile. */
function heading(n: ViewNode, icons?: IconLibrary): string {
  const title = `<h3 class="vb-node-title">${esc(n.title)}</h3>`;
  if (!n.icon) return title;
  return `<div class="vb-node-head"><div class="vb-node-heading"><p class="vb-node-kick">${NODE_TYPES[n.kind].label}</p>${title}</div>`
    + `<span class="vb-node-tile" aria-hidden="true">${icon(n.icon, 'vb-node-tile-icon', icons)}</span></div>`;
}

/** The node with its marks on its edges, in the skin `def` puts them. Items get the history box (the stepper on top)
 *  and the proposal box; a handover arrives as a section of the body (DESIGN_01 ruling). */
export function edgesMarkup(n: ViewNode, def: SkinDef, parts: EdgeParts): string {
  const item = isItem(n);
  const top = topMarks(n, def);
  const handover = item ? `<section class="vb-node-handover" aria-label="${nodeWords.handover}" hidden></section>` : '';
  const content = `<div class="vb-node-content">${heading(n, parts.icons)}${parts.body}${parts.tags}${handover}</div>`;
  const marks = def.marks === 'plate' ? `<div class="vb-node-plate">${top}</div>` : top;
  if (!item) return marks + content;
  const proposal = `<div class="vb-tip vb-card-pop vb-node-box" data-pop="proposal" id="${esc(parts.ids.proposal)}" role="dialog" tabindex="-1"></div>`;
  const history = historyBox(n, parts.ids.history, parts.steps + parts.stepNav);
  return marks + content + (def.answer === 'switch' ? answerSwitch() : '') + bottomMarks(parts) + proposal + history;
}
