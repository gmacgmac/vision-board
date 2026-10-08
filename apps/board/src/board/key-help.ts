// The key commands bubble's list (navigation FE_04, keyBubble flag): generated from the one command
// table (commands.ts `COMMANDS`) and the action registry (`ACTIONS`), so a command or action with a
// key cannot be left out. Every group takes the commands `GROUP_OF` assigns it (a Record over every
// command id, so adding a command without a group fails the type check) and Items takes every
// registry action that has a key. `OTHER` holds only the inputs neither table owns: moving
// between cards, Space, Alt+arrows, H, and the pointer gestures.
import { ACTIONS } from '../../../../packages/actions/src/index.ts';
import type { CommandId } from './commands.ts';
import { COMMAND_IDS, COMMANDS, keyText } from './commands.ts';

export const KEY_GROUPS = ['Items', 'Selection', 'Board', 'View'] as const;
export type KeyGroup = (typeof KEY_GROUPS)[number];

export interface KeyRow {
  /** `command:<id>`, `action:<id>` or `other:<n>`: one row each, whatever its label. */
  id: string;
  label: string;
  /** The keys that do it, as a hint shows them ("Shift+M"); several run it alike. */
  keys: string[];
}

const GROUP_OF: Record<CommandId, Exclude<KeyGroup, 'Items'>> = {
  comment: 'Selection', move: 'Selection', 'reset-places': 'Selection', clear: 'Selection',
  'container-note': 'Board',
  'zoom-out': 'View', fit: 'View', 'zoom-in': 'View', 'zoom-selection': 'View', 'zoom-area': 'View',
};

/** Inputs that are neither a command nor a registry action (keys.ts, pointer.ts). */
const OTHER: Record<KeyGroup, readonly [label: string, keys: string[]][]> = {
  Items: [['Next / previous card', ['J', 'K']], ['Move the card', ['Alt+arrows']], ['Reset the card\'s place', ['R']]],
  Selection: [['Select the card', ['Space']], ['Select more', ['Shift+click']], ['Lasso', ['Shift+drag']]],
  Board: [['Hide decided', ['H']], ['Move a container', ['Alt+arrows']], ['Pan', ['Drag the background']]],
  View: [['Zoom', ['Ctrl+scroll']], ['This list', ['?']]],
};

/** The groups with their rows, in order; a group with no row is left out. */
export function keyGroups(): { group: KeyGroup; rows: KeyRow[] }[] {
  const items: KeyRow[] = Object.values(ACTIONS).filter((a) => a.key && a.onItem)
    .map((a) => ({ id: `action:${a.id}`, label: a.label, keys: [a.key!.toUpperCase()] }));
  const commands = (group: KeyGroup): KeyRow[] => COMMAND_IDS.filter((id) => GROUP_OF[id] === group && COMMANDS[id].keys.length)
    .map((id) => ({ id: `command:${id}`, label: COMMANDS[id].label, keys: COMMANDS[id].keys.map(keyText) }));
  return KEY_GROUPS.map((group) => ({
    group,
    rows: [...(group === 'Items' ? items : commands(group)),
      ...OTHER[group].map(([label, keys], i) => ({ id: `other:${group}.${i}`, label, keys }))],
  })).filter((g) => g.rows.length);
}
