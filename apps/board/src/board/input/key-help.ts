// The key commands bubble's list (navigation FE_04, keyBubble flag): generated from the one command
// table (commands.ts `COMMANDS`) and the action registry (`ACTIONS`), so a command or action with a
// key cannot be left out. Every group takes the commands `GROUP_OF` assigns it (a Record over every
// command id, so adding a command without a group fails the type check) and Items takes every
// registry action that has a key, by its registry label. `OTHER`
// holds only the inputs neither table owns: moving between cards, Space, Alt+arrows, H, and the
// pointer gestures; the bookmark's, the chat's and an app's key join them behind their flags.
import { ACTIONS } from '#actions';
import type { CommandId } from './commands.ts';
import { COMMAND_IDS, COMMANDS, EDGE_COMMANDS, keyText } from './commands.ts';
import * as commonWords from '../words/common.ts';
import * as keyHelpWords from '../words/key-help.ts';

export const KEY_GROUPS = [keyHelpWords.items, keyHelpWords.selection, commonWords.board, keyHelpWords.view] as const;
export type KeyGroup = (typeof KEY_GROUPS)[number];

export interface KeyRow {
  /** `command:<id>`, `action:<id>` or `other:<n>`: one row each, whatever its label. */
  id: string;
  label: string;
  /** The keys that do it, as a hint shows them ("Shift+M"); several run it alike. */
  keys: string[];
}

const GROUP_OF: Record<CommandId, Exclude<KeyGroup, 'Items'>> = {
  comment: keyHelpWords.selection, move: keyHelpWords.selection, 'reset-places': keyHelpWords.selection, remove: keyHelpWords.selection,
  'bookmark-all': keyHelpWords.selection, 'save-for-later': keyHelpWords.selection, width: keyHelpWords.selection,
  'container-note': commonWords.board, 'go-to-card': commonWords.board,
  'zoom-out': keyHelpWords.view, fit: keyHelpWords.view, 'zoom-in': keyHelpWords.view, 'zoom-selection': keyHelpWords.view, 'zoom-area': keyHelpWords.view,
};

/** Inputs that are neither a command nor a registry action (keys.ts, pointer.ts). */
const OTHER: Record<KeyGroup, readonly [label: string, keys: string[]][]> = {
  Items: [[keyHelpWords.nextPreviousCard, ['J', 'K']], [keyHelpWords.moveTheCard, ['Alt+arrows']], [keyHelpWords.resetTheCardSPlace, ['R']]],
  Selection: [[keyHelpWords.selectTheCard, [keyHelpWords.space]], [keyHelpWords.selectMore, ['Shift+click']], [keyHelpWords.lasso, ['Shift+drag']]],
  Board: [[commonWords.hideAnswered, ['H']], ['Move a container', ['Alt+arrows']], [keyHelpWords.pan, [keyHelpWords.dragTheBackground]], [keyHelpWords.panFromAnywhere, ['Cmd+drag', 'Ctrl+drag']]],
  View: [[commonWords.zoom, ['Ctrl+scroll']], [keyHelpWords.thisList, ['?']]],
};

/** The chat sidebar's key (chatPanel flag, ChatSidebar.svelte): in Board, with the flag on. */
const CHAT_ROW: readonly [label: string, keys: string[]] = [keyHelpWords.openOrCloseTheChat, ['T']];
/** The bookmark's key (cardBookmark flag, bookmark-flow.ts): in Items, with the flag on. */
const BOOKMARK_ROW: readonly [label: string, keys: string[]] = [keyHelpWords.bookmarkTheCard, ['B']];
/** The node's own keys with its edges (nodeEdges flag, D-099 1; mark-flow.ts): H its history, the menu key or Shift+F10 its
 * actions (on its number, the number's menu). In Items, with the flag on. */
const EDGE_ROWS: readonly (readonly [label: string, keys: string[]])[] = [[keyHelpWords.openTheNodesHistory, ['H']], [keyHelpWords.openTheNodesActions, ['Shift+F10']]];
/** Esc inside an app's panel (appCards flag, app-cards.ts): the panel sends it, the board puts focus
 * back on its card (D-047 ruling 15). In Items, with the flag on. */
const APP_ROW: readonly [label: string, keys: string[]] = [keyHelpWords.leaveAnApp, [commonWords.esc]];

/** The groups with their rows, in order; a group with no row is left out. `chat`: the chatPanel
 * flag; `bookmark`: the cardBookmark flag; `edges`: the nodeEdges flag; `remove`: the personRemove flag (off, Remove is not listed);
 * `go`: the goToCard flag (off, Go to a card is not listed); `app`: the appCards flag. */
export function keyGroups({ chat = false, bookmark = false, edges = false, remove = true, go = true, app = false }: { chat?: boolean; bookmark?: boolean; edges?: boolean; remove?: boolean; go?: boolean; app?: boolean } = {}): { group: KeyGroup; rows: KeyRow[] }[] {
  const items: KeyRow[] = Object.values(ACTIONS).filter((a) => a.key && a.onItem)
    .map((a) => ({ id: `action:${a.id}`, label: a.label, keys: [a.key!.toUpperCase()] }));
  const off = [...(remove ? [] : ['remove']), ...(go ? [] : ['go-to-card']), ...(edges ? [] : EDGE_COMMANDS), ...(edges && !bookmark ? ['bookmark-all'] : [])];
  const commands = (group: KeyGroup): KeyRow[] => COMMAND_IDS.filter((id) => GROUP_OF[id] === group && COMMANDS[id].keys.length && !off.includes(id))
    .map((id) => ({ id: `command:${id}`, label: COMMANDS[id].listed ?? COMMANDS[id].means ?? COMMANDS[id].label, keys: [...(COMMANDS[id].shown ?? COMMANDS[id].keys.map(keyText))] }));
  return KEY_GROUPS.map((group) => ({
    group,
    rows: [...(group === 'Items' ? items : commands(group)),
      ...OTHER[group].map(([label, keys], i) => ({ id: `other:${group}.${i}`, label, keys })),
      ...(bookmark && group === 'Items' ? [{ id: 'other:bookmark', label: BOOKMARK_ROW[0], keys: BOOKMARK_ROW[1] }] : []),
      ...(edges && group === 'Items' ? EDGE_ROWS.map(([label, keys], i) => ({ id: `other:edges.${i}`, label, keys })) : []),
      ...(app && group === 'Items' ? [{ id: 'other:app', label: APP_ROW[0], keys: APP_ROW[1] }] : []),
      ...(chat && group === 'Board' ? [{ id: 'other:chat', label: CHAT_ROW[0], keys: CHAT_ROW[1] }] : [])],
  })).filter((g) => g.rows.length);
}
